import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import type { EducationInput, MoveDirection } from "@/lib/validation/education";
import { normalizeSkillName } from "@/lib/validation/skill";

// Formations (cahier §3.4) : dates au mois près (1er du mois, UTC), date de
// fin et moyenne facultatives, ordre d'affichage (`position`), compétences
// en relation plusieurs-à-plusieurs.

/**
 * Verrou consultatif réservé à l'ordre des formations (relâché à la fin de la
 * transaction) : deux déplacements, ou une création et un déplacement, ne
 * renumérotent pas la liste en même temps. Littéral sans paramètre, comme
 * celui de la connexion (E44).
 */
async function lockEducationOrder(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(724011702)`;
}

const ORDER = [{ position: "asc" }, { id: "asc" }] satisfies Prisma.EducationOrderByWithRelationInput[];

const EDUCATION_SELECT = {
  id: true,
  title: true,
  description: true,
  institution: true,
  location: true,
  startDate: true,
  endDate: true,
  honors: true,
  grade: true,
  position: true,
  skills: { select: { id: true, name: true }, orderBy: [{ normalizedName: "asc" }] },
} satisfies Prisma.EducationSelect;

export type Education = {
  id: string;
  title: string;
  description: string;
  institution: string;
  location: string;
  startDate: Date;
  endDate: Date | null;
  honors: string | null;
  /** Moyenne sur 20, en chaîne décimale (« 14.5 ») : un `Decimal` ne passe pas aux composants clients. */
  grade: string | null;
  position: number;
  skills: { id: string; name: string }[];
};

function toEducation(row: Prisma.EducationGetPayload<{ select: typeof EDUCATION_SELECT }>): Education {
  return { ...row, grade: row.grade === null ? null : row.grade.toString() };
}

/** Formations dans l'ordre d'affichage. */
export async function listEducations(): Promise<Education[]> {
  const rows = await db.education.findMany({ orderBy: ORDER, select: EDUCATION_SELECT });
  return rows.map(toEducation);
}

export async function getEducation(id: string): Promise<Education | null> {
  const row = await db.education.findUnique({ where: { id }, select: EDUCATION_SELECT });
  return row ? toEducation(row) : null;
}

function educationData(input: EducationInput) {
  return {
    title: input.title,
    description: input.description,
    institution: input.institution,
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    honors: input.honors,
    grade: input.grade,
  };
}

/** Vrai si toutes les compétences cochées existent encore. */
async function skillsExist(tx: Prisma.TransactionClient, skillIds: readonly string[]): Promise<boolean> {
  if (skillIds.length === 0) return true;
  const count = await tx.skill.count({ where: { id: { in: [...skillIds] } } });
  return count === skillIds.length;
}

export type SaveEducationResult =
  | { status: "saved"; id: string; title: string }
  | { status: "missing-skills" }
  | { status: "duplicate-skill"; existingName: string }
  | { status: "not-found" };

/**
 * Compétences à relier : la sélection, plus la « Nouvelle compétence » saisie
 * dans le formulaire, créée dans la même transaction que la formation (si
 * l'enregistrement échoue, elle n'est pas créée). Doublon (même règle que la
 * section « Compétences ») : rien n'est créé.
 */
async function skillIdsToLink(
  tx: Prisma.TransactionClient,
  input: EducationInput,
): Promise<{ ids: string[] } | { duplicate: string }> {
  if (!input.newSkill) return { ids: input.skillIds };
  const normalizedName = normalizeSkillName(input.newSkill);
  const existing = await tx.skill.findUnique({ where: { normalizedName }, select: { name: true } });
  if (existing) return { duplicate: existing.name };
  const created = await tx.skill.create({ data: { name: input.newSkill, normalizedName }, select: { id: true } });
  return { ids: [...input.skillIds, created.id] };
}

/** Création simultanée de la même compétence : la contrainte unique tranche, transaction annulée. */
async function duplicateAfterRace(input: EducationInput): Promise<SaveEducationResult> {
  const name = input.newSkill ?? "";
  const existing = await db.skill.findUnique({
    where: { normalizedName: normalizeSkillName(name) },
    select: { name: true },
  });
  return { status: "duplicate-skill", existingName: existing?.name ?? name };
}

/** Création, en dernière position. */
export async function createEducation(input: EducationInput): Promise<SaveEducationResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lockEducationOrder(tx);
      if (!(await skillsExist(tx, input.skillIds))) return { status: "missing-skills" } as const;
      const skills = await skillIdsToLink(tx, input);
      if ("duplicate" in skills) return { status: "duplicate-skill", existingName: skills.duplicate } as const;

      const last = await tx.education.findFirst({
        orderBy: [{ position: "desc" }],
        select: { position: true },
      });
      const created = await tx.education.create({
        data: {
          ...educationData(input),
          position: last ? last.position + 1 : 0,
          skills: { connect: skills.ids.map((id) => ({ id })) },
        },
        select: { id: true, title: true },
      });
      return { status: "saved", ...created } as const;
    });
  } catch (error) {
    if (input.newSkill && isUniqueViolation(error)) return duplicateAfterRace(input);
    throw error;
  }
}

/** Modification : champs et compétences (la sélection remplace l'ancienne). L'ordre ne change pas. */
export async function updateEducation(id: string, input: EducationInput): Promise<SaveEducationResult> {
  try {
    return await db.$transaction(async (tx) => {
      if (!(await skillsExist(tx, input.skillIds))) return { status: "missing-skills" } as const;
      const skills = await skillIdsToLink(tx, input);
      if ("duplicate" in skills) return { status: "duplicate-skill", existingName: skills.duplicate } as const;
      const updated = await tx.education.update({
        where: { id },
        data: {
          ...educationData(input),
          skills: { set: skills.ids.map((skillId) => ({ id: skillId })) },
        },
        select: { id: true, title: true },
      });
      return { status: "saved", ...updated } as const;
    });
  } catch (error) {
    // Formation supprimée entre-temps : la transaction est annulée, la nouvelle compétence aussi.
    if (isRecordNotFound(error)) return { status: "not-found" };
    if (input.newSkill && isUniqueViolation(error)) return duplicateAfterRace(input);
    throw error;
  }
}

export type DeleteEducationResult = { status: "deleted"; title: string } | { status: "not-found" };

/** Suppression : les liens avec les compétences partent avec la formation (cascade), les compétences restent. */
export async function deleteEducation(id: string): Promise<DeleteEducationResult> {
  try {
    const deleted = await db.education.delete({ where: { id }, select: { title: true } });
    return { status: "deleted", title: deleted.title };
  } catch (error) {
    if (isRecordNotFound(error)) return { status: "not-found" };
    throw error;
  }
}

export type MoveEducationResult =
  | { status: "moved"; title: string; position: number; total: number }
  | { status: "edge"; title: string }
  | { status: "not-found" };

/**
 * « Monter » ou « Descendre » : échange avec la voisine, puis renumérotation
 * 0, 1, 2… de toute la liste (les trous laissés par une suppression et les
 * égalités éventuelles disparaissent). Seules les lignes dont la position
 * change sont écrites. `position` du résultat : rang affiché, à partir de 1.
 */
export async function moveEducation(id: string, direction: MoveDirection): Promise<MoveEducationResult> {
  return db.$transaction(async (tx) => {
    await lockEducationOrder(tx);

    const rows = await tx.education.findMany({
      orderBy: ORDER,
      select: { id: true, title: true, position: true },
    });
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { status: "not-found" } as const;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return { status: "edge", title: rows[index].title } as const;

    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    for (const [position, row] of ordered.entries()) {
      if (row.position !== position) {
        await tx.education.update({ where: { id: row.id }, data: { position } });
      }
    }

    return { status: "moved", title: rows[index].title, position: target + 1, total: rows.length } as const;
  });
}
