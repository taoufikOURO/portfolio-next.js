import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { normalizeSkillName } from "@/lib/validation/skill";

// Compétences (cahier §3.4) : nom unique sans tenir compte de la casse, des
// accents ni des espaces superflus (`normalizedName`), relation
// plusieurs-à-plusieurs avec les formations, suppression bloquée tant que la
// compétence est utilisée, sauf confirmation qui détache les liens.

export type SkillUsage = { id: string; title: string };

export type SkillWithUsage = { id: string; name: string; educations: SkillUsage[] };

const SKILL_WITH_USAGE = {
  id: true,
  name: true,
  educations: {
    select: { id: true, title: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.SkillSelect;

/** Toutes les compétences, par ordre alphabétique (clé normalisée), avec les formations qui les utilisent. */
export async function listSkills(): Promise<SkillWithUsage[]> {
  return db.skill.findMany({ orderBy: [{ normalizedName: "asc" }], select: SKILL_WITH_USAGE });
}

export async function getSkill(id: string): Promise<SkillWithUsage | null> {
  return db.skill.findUnique({ where: { id }, select: SKILL_WITH_USAGE });
}

/** Options du formulaire des formations : identifiant et nom, par ordre alphabétique. */
export async function listSkillOptions(): Promise<{ id: string; name: string }[]> {
  return db.skill.findMany({ orderBy: [{ normalizedName: "asc" }], select: { id: true, name: true } });
}

export type SaveSkillResult =
  | { status: "saved"; skill: { id: string; name: string } }
  | { status: "duplicate"; existingName: string }
  | { status: "not-found" };

async function existingName(normalizedName: string, fallback: string): Promise<string> {
  const existing = await db.skill.findUnique({ where: { normalizedName }, select: { name: true } });
  return existing?.name ?? fallback;
}

/**
 * Création. `name` est déjà nettoyé par le schéma (`cleanSkillName`). Le
 * doublon est détecté par la clé normalisée ; la contrainte d'unicité de la
 * base tranche en cas de création simultanée.
 */
export async function createSkill(name: string): Promise<SaveSkillResult> {
  const normalizedName = normalizeSkillName(name);
  const duplicate = await db.skill.findUnique({ where: { normalizedName }, select: { name: true } });
  if (duplicate) return { status: "duplicate", existingName: duplicate.name };

  try {
    const skill = await db.skill.create({ data: { name, normalizedName }, select: { id: true, name: true } });
    return { status: "saved", skill };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "duplicate", existingName: await existingName(normalizedName, name) };
    }
    throw error;
  }
}

/**
 * Renommage. Changer seulement la casse ou les accents de sa propre compétence
 * est permis (« react » → « React ») ; prendre la clé d'une autre est refusé.
 */
export async function renameSkill(id: string, name: string): Promise<SaveSkillResult> {
  const normalizedName = normalizeSkillName(name);
  const duplicate = await db.skill.findUnique({ where: { normalizedName }, select: { id: true, name: true } });
  if (duplicate && duplicate.id !== id) return { status: "duplicate", existingName: duplicate.name };

  try {
    const skill = await db.skill.update({
      where: { id },
      data: { name, normalizedName },
      select: { id: true, name: true },
    });
    return { status: "saved", skill };
  } catch (error) {
    if (isRecordNotFound(error)) return { status: "not-found" };
    if (isUniqueViolation(error)) {
      return { status: "duplicate", existingName: await existingName(normalizedName, name) };
    }
    throw error;
  }
}

/**
 * Règle de suppression (cahier §3.4), pure :
 * - compétence rattachée à aucune formation : suppression ;
 * - compétence utilisée, sans confirmation : refus ;
 * - compétence utilisée, avec confirmation : suppression seulement si chaque
 *   formation rattachée figurait dans la confirmation. Une formation liée
 *   après l'affichage de la confirmation bloque donc la suppression, et la
 *   nouvelle liste est présentée.
 *
 * `confirmedEducationIds` : `null` sans confirmation.
 */
export function decideSkillDeletion(
  linkedEducationIds: readonly string[],
  confirmedEducationIds: readonly string[] | null,
): "delete" | "blocked" {
  if (linkedEducationIds.length === 0) return "delete";
  if (confirmedEducationIds === null) return "blocked";
  const confirmed = new Set(confirmedEducationIds);
  return linkedEducationIds.every((id) => confirmed.has(id)) ? "delete" : "blocked";
}

export type DeleteSkillResult =
  | { status: "deleted"; name: string; detachedCount: number }
  | { status: "blocked"; skill: SkillWithUsage }
  | { status: "not-found" };

/**
 * Suppression. La ligne de la compétence est verrouillée pendant la
 * transaction : un rattachement simultané (insertion dans `_education_skills`,
 * dont la clé étrangère verrouille la compétence) attend sa fin. Les liens
 * sont supprimés avec la compétence (clé étrangère en cascade).
 */
export async function deleteSkill(
  id: string,
  confirmedEducationIds: readonly string[] | null,
): Promise<DeleteSkillResult> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM skills WHERE id = ${id}::uuid FOR UPDATE`;

    const skill = await tx.skill.findUnique({ where: { id }, select: SKILL_WITH_USAGE });
    if (!skill) return { status: "not-found" } as const;

    const linkedIds = skill.educations.map((education) => education.id);
    if (decideSkillDeletion(linkedIds, confirmedEducationIds) === "blocked") {
      return { status: "blocked", skill } as const;
    }

    await tx.skill.delete({ where: { id } });
    return { status: "deleted", name: skill.name, detachedCount: linkedIds.length } as const;
  });
}
