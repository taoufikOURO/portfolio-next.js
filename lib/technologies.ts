import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { getStorageContext, publicUrlFor } from "@/lib/storage/client";
import { normalizeTechnologyName, type TechnologyMoveDirection } from "@/lib/validation/technology";

// Stack technique (cahier §3.4) : nom unique sans tenir compte de la casse,
// des accents ni des espaces superflus (`normalizedName`, comme les
// compétences), icône dans le bucket `stack` (chemin en base, E11), ordre
// d'affichage (`position`), relation plusieurs-à-plusieurs avec les projets,
// suppression bloquée tant que la technologie est utilisée, sauf
// confirmation qui détache les liens.
//
// Les fichiers (envoi, remplacement) sont pilotés par les actions avec
// `lib/storage/` : ce module ne touche que la base.

/**
 * Verrou consultatif réservé à l'ordre de la stack (relâché à la fin de la
 * transaction) : deux déplacements, ou une création et un déplacement, ne
 * renumérotent pas la liste en même temps. Littéral sans paramètre, comme
 * celui des formations.
 */
async function lockTechnologyOrder(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(724011703)`;
}

const ORDER = [{ position: "asc" }, { id: "asc" }] satisfies Prisma.TechnologyOrderByWithRelationInput[];

export type TechnologyUsage = { id: string; title: string };

export type Technology = {
  id: string;
  name: string;
  /** Chemin du fichier dans le bucket `stack` ; l'URL est calculée à l'affichage (`technologyIconUrl`). */
  iconPath: string;
  position: number;
  projects: TechnologyUsage[];
};

const TECHNOLOGY_SELECT = {
  id: true,
  name: true,
  iconPath: true,
  position: true,
  projects: {
    select: { id: true, title: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.TechnologySelect;

/** Technologies dans l'ordre d'affichage, avec les projets qui les utilisent. */
export async function listTechnologies(): Promise<Technology[]> {
  return db.technology.findMany({ orderBy: ORDER, select: TECHNOLOGY_SELECT });
}

export async function getTechnology(id: string): Promise<Technology | null> {
  return db.technology.findUnique({ where: { id }, select: TECHNOLOGY_SELECT });
}

/** URL publique de l'icône, calculée à l'affichage à partir du chemin enregistré (E11). */
export function technologyIconUrl(iconPath: string): string {
  return publicUrlFor(getStorageContext().config, "stack", iconPath);
}

/**
 * Nom déjà pris par une autre technologie (même clé normalisée), ou `null`.
 * `exceptId` : la technologie en cours de modification (changer seulement la
 * casse ou les accents de son propre nom est permis).
 */
export async function findDuplicateTechnologyName(name: string, exceptId?: string): Promise<string | null> {
  const duplicate = await db.technology.findUnique({
    where: { normalizedName: normalizeTechnologyName(name) },
    select: { id: true, name: true },
  });
  return duplicate && duplicate.id !== exceptId ? duplicate.name : null;
}

/** Nom de la technologie qui porte cette clé, ou `fallback` (conflit détecté par la contrainte unique de la base). */
export async function existingTechnologyName(name: string): Promise<string> {
  const existing = await db.technology.findUnique({
    where: { normalizedName: normalizeTechnologyName(name) },
    select: { name: true },
  });
  return existing?.name ?? name;
}

export type SaveTechnologyResult =
  | { status: "saved"; technology: { id: string; name: string } }
  | { status: "duplicate"; existingName: string }
  | { status: "not-found" };

/**
 * Création, en dernière position. `name` est déjà nettoyé par le schéma et
 * `iconPath` est le chemin d'un fichier déjà envoyé. La contrainte d'unicité
 * de la base tranche en cas de création simultanée (la transaction est annulée
 * et l'appelant supprime le fichier envoyé).
 */
export async function createTechnology(name: string, iconPath: string): Promise<SaveTechnologyResult> {
  const normalizedName = normalizeTechnologyName(name);
  try {
    return await db.$transaction(async (tx) => {
      await lockTechnologyOrder(tx);
      const duplicate = await tx.technology.findUnique({ where: { normalizedName }, select: { name: true } });
      if (duplicate) return { status: "duplicate", existingName: duplicate.name } as const;

      const last = await tx.technology.findFirst({ orderBy: [{ position: "desc" }], select: { position: true } });
      const technology = await tx.technology.create({
        data: { name, normalizedName, iconPath, position: last ? last.position + 1 : 0 },
        select: { id: true, name: true },
      });
      return { status: "saved", technology } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "duplicate", existingName: await existingTechnologyName(name) };
    }
    throw error;
  }
}

/**
 * Modification du nom et, si `iconPath` est fourni, du chemin de l'icône. Le
 * doublon est refusé (`duplicate`) ; l'ordre ne change pas.
 */
export async function updateTechnology(
  id: string,
  data: { name: string; iconPath?: string },
): Promise<SaveTechnologyResult> {
  const normalizedName = normalizeTechnologyName(data.name);
  const duplicate = await db.technology.findUnique({ where: { normalizedName }, select: { id: true, name: true } });
  if (duplicate && duplicate.id !== id) return { status: "duplicate", existingName: duplicate.name };

  try {
    const technology = await db.technology.update({
      where: { id },
      data: { name: data.name, normalizedName, ...(data.iconPath === undefined ? {} : { iconPath: data.iconPath }) },
      select: { id: true, name: true },
    });
    return { status: "saved", technology };
  } catch (error) {
    if (isRecordNotFound(error)) return { status: "not-found" };
    if (isUniqueViolation(error)) {
      return { status: "duplicate", existingName: await existingTechnologyName(data.name) };
    }
    throw error;
  }
}

/**
 * Règle de suppression (cahier §3.4), pure :
 * - technologie rattachée à aucun projet : suppression ;
 * - technologie utilisée, sans confirmation : refus ;
 * - technologie utilisée, avec confirmation : suppression seulement si chaque
 *   projet rattaché figurait dans la confirmation. Un projet lié après
 *   l'affichage de la confirmation bloque donc la suppression, et la nouvelle
 *   liste est présentée.
 *
 * `confirmedProjectIds` : `null` sans confirmation.
 */
export function decideTechnologyDeletion(
  linkedProjectIds: readonly string[],
  confirmedProjectIds: readonly string[] | null,
): "delete" | "blocked" {
  if (linkedProjectIds.length === 0) return "delete";
  if (confirmedProjectIds === null) return "blocked";
  const confirmed = new Set(confirmedProjectIds);
  return linkedProjectIds.every((id) => confirmed.has(id)) ? "delete" : "blocked";
}

export type DeleteTechnologyResult =
  | { status: "deleted"; name: string; detachedCount: number; iconPath: string }
  | { status: "blocked"; technology: Technology }
  | { status: "not-found" };

/**
 * Suppression. La ligne de la technologie est verrouillée pendant la
 * transaction : un rattachement simultané (insertion dans
 * `_project_technologies`, dont la clé étrangère verrouille la technologie)
 * attend sa fin. Les liens sont supprimés avec la technologie (clé étrangère
 * en cascade). Le fichier de l'icône n'est pas touché ici : l'appelant le
 * supprime du bucket après la suppression en base (`iconPath` du résultat).
 */
export async function deleteTechnology(
  id: string,
  confirmedProjectIds: readonly string[] | null,
): Promise<DeleteTechnologyResult> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM technologies WHERE id = ${id}::uuid FOR UPDATE`;

    const technology = await tx.technology.findUnique({ where: { id }, select: TECHNOLOGY_SELECT });
    if (!technology) return { status: "not-found" } as const;

    const linkedIds = technology.projects.map((project) => project.id);
    if (decideTechnologyDeletion(linkedIds, confirmedProjectIds) === "blocked") {
      return { status: "blocked", technology } as const;
    }

    await tx.technology.delete({ where: { id } });
    return {
      status: "deleted",
      name: technology.name,
      detachedCount: linkedIds.length,
      iconPath: technology.iconPath,
    } as const;
  });
}

export type MoveTechnologyResult =
  | { status: "moved"; name: string; position: number; total: number }
  | { status: "edge"; name: string }
  | { status: "not-found" };

/**
 * « Monter » ou « Descendre » : échange avec la voisine, puis renumérotation
 * 0, 1, 2… de toute la liste (les trous laissés par une suppression et les
 * égalités éventuelles disparaissent). Seules les lignes dont la position
 * change sont écrites. `position` du résultat : rang affiché, à partir de 1.
 */
export async function moveTechnology(id: string, direction: TechnologyMoveDirection): Promise<MoveTechnologyResult> {
  return db.$transaction(async (tx) => {
    await lockTechnologyOrder(tx);

    const rows = await tx.technology.findMany({ orderBy: ORDER, select: { id: true, name: true, position: true } });
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { status: "not-found" } as const;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return { status: "edge", name: rows[index].name } as const;

    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

    for (const [position, row] of ordered.entries()) {
      if (row.position !== position) {
        await tx.technology.update({ where: { id: row.id }, data: { position } });
      }
    }

    return { status: "moved", name: rows[index].name, position: target + 1, total: rows.length } as const;
  });
}
