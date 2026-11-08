import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fetchGitHubUser, GITHUB_FAILURE_MESSAGES } from "@/lib/github";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { getStorageContext, publicUrlFor } from "@/lib/storage/client";
import { needsSlugChangeConfirmation, type ProjectInput, type ProjectMoveDirection } from "@/lib/validation/project";

// Projets (cahier §3.7) : slug unique, liens ordonnés, technologies et
// collaborateurs en plusieurs-à-plusieurs, image dans le bucket `projects`
// (chemin en base, E11), ordre d'affichage (`position`), statut de
// publication modifié seulement par `setProjectPublication`.
//
// Collaborateurs : identifiés par leur nom d'utilisateur GitHub (minuscules),
// partagés entre les projets. GitHub n'est interrogé que pour un nom encore
// inconnu ; un collaborateur connu n'est mis à jour que par
// `resyncCollaborator` (« Relancer la récupération »). Un collaborateur qui
// n'est plus rattaché à aucun projet est supprimé dans la même transaction.
//
// Les fichiers (envoi, remplacement, suppression) sont pilotés par les
// actions avec `lib/storage/` : ce module ne touche que la base et GitHub.

/**
 * Verrou consultatif réservé à l'ordre des projets (relâché à la fin de la
 * transaction). Formations : 724011702, stack : 724011703.
 */
async function lockProjectOrder(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(724011704)`;
}

async function lockProjectRow(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM projects WHERE id = ${id}::uuid FOR UPDATE`;
}

const ORDER = [{ position: "asc" }, { id: "asc" }] satisfies Prisma.ProjectOrderByWithRelationInput[];

const COLLABORATOR_SELECT = {
  id: true,
  githubUsername: true,
  name: true,
  avatarUrl: true,
  profileUrl: true,
  syncedAt: true,
  syncError: true,
} satisfies Prisma.CollaboratorSelect;

const PROJECT_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  imagePath: true,
  isPublished: true,
  date: true,
  position: true,
  links: { select: { id: true, label: true, url: true, position: true }, orderBy: [{ position: "asc" }, { id: "asc" }] },
  technologies: { select: { id: true, name: true }, orderBy: [{ position: "asc" }, { id: "asc" }] },
  collaborators: {
    // `projects` : projets auxquels chaque collaborateur est rattaché (orphelins annoncés avant une suppression).
    select: { ...COLLABORATOR_SELECT, projects: { select: { id: true } } },
    orderBy: [{ githubUsername: "asc" }],
  },
} satisfies Prisma.ProjectSelect;

export type Collaborator = Prisma.CollaboratorGetPayload<{ select: typeof COLLABORATOR_SELECT }>;
export type Project = Prisma.ProjectGetPayload<{ select: typeof PROJECT_SELECT }>;

/** Nom affiché d'un collaborateur : son nom GitHub, sinon « @nom-d-utilisateur ». */
export function collaboratorLabel(collaborator: { name: string | null; githubUsername: string }): string {
  return collaborator.name ? `${collaborator.name} (@${collaborator.githubUsername})` : `@${collaborator.githubUsername}`;
}

/**
 * Collaborateurs qui deviendraient orphelins si le projet était supprimé
 * (rattachés à ce seul projet) : ils sont nommés dans la confirmation de
 * suppression (E54 point 8). La suppression elle-même recalcule les
 * orphelins dans sa transaction.
 */
export function collaboratorsOrphanedByDeletion(project: Pick<Project, "id" | "collaborators">): string[] {
  return project.collaborators
    .filter((collaborator) => collaborator.projects.every((other) => other.id === project.id))
    .map(collaboratorLabel);
}

/** Projets dans l'ordre d'affichage, avec leurs liens, technologies et collaborateurs. */
export async function listProjects(): Promise<Project[]> {
  return db.project.findMany({ orderBy: ORDER, select: PROJECT_SELECT });
}

export async function getProject(id: string): Promise<Project | null> {
  return db.project.findUnique({ where: { id }, select: PROJECT_SELECT });
}

/** URL publique de l'image, calculée à l'affichage à partir du chemin enregistré (E11). */
export function projectImageUrl(imagePath: string): string {
  return publicUrlFor(getStorageContext().config, "projects", imagePath);
}

/**
 * Slug déjà pris par un autre projet. `exceptId` : le projet en cours de
 * modification (garder son propre slug est permis).
 */
export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const existing = await db.project.findUnique({ where: { slug }, select: { id: true } });
  return existing !== null && existing.id !== exceptId;
}

// ---------------------------------------------------------------------------
// Collaborateurs
// ---------------------------------------------------------------------------

/** Données d'un collaborateur à créer, issues de GitHub (ou du seul nom en cas d'échec). */
export type NewCollaborator = {
  githubUsername: string;
  name: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  syncedAt: Date | null;
  syncError: string | null;
};

async function profileFromGitHub(username: string, now: () => Date): Promise<NewCollaborator> {
  const result = await fetchGitHubUser(username, { token: env.GITHUB_TOKEN });
  if (!result.ok) {
    return {
      githubUsername: username,
      name: null,
      avatarUrl: null,
      profileUrl: null,
      syncedAt: null,
      syncError: GITHUB_FAILURE_MESSAGES[result.reason],
    };
  }
  const { name, avatarUrl, profileUrl } = result.profile;
  return { githubUsername: username, name, avatarUrl, profileUrl, syncedAt: now(), syncError: null };
}

/**
 * Prépare les collaborateurs saisis : GitHub n'est interrogé que pour les noms
 * absents de la base (les collaborateurs connus ne sont pas mis à jour ici).
 * Appelé hors transaction, après les contrôles qui peuvent refuser
 * l'enregistrement (validation, slug en double).
 */
export async function resolveNewCollaborators(
  usernames: readonly string[],
  now: () => Date = () => new Date(),
): Promise<NewCollaborator[]> {
  if (usernames.length === 0) return [];
  const known = await db.collaborator.findMany({
    where: { githubUsername: { in: [...usernames] } },
    select: { githubUsername: true },
  });
  const knownNames = new Set(known.map((collaborator) => collaborator.githubUsername));
  const unknown = usernames.filter((username) => !knownNames.has(username));
  return Promise.all(unknown.map((username) => profileFromGitHub(username, now)));
}

/**
 * Identifiants des collaborateurs saisis, en créant ceux qui manquent. Un
 * collaborateur créé entre-temps (autre onglet) n'est pas modifié (`update`
 * vide) : seul « Relancer la récupération » met à jour un collaborateur connu.
 */
async function collaboratorIds(
  tx: Prisma.TransactionClient,
  usernames: readonly string[],
  newCollaborators: readonly NewCollaborator[],
): Promise<{ id: string }[]> {
  const created = new Map(newCollaborators.map((collaborator) => [collaborator.githubUsername, collaborator]));
  const ids: { id: string }[] = [];
  for (const username of usernames) {
    const data = created.get(username) ?? {
      githubUsername: username,
      name: null,
      avatarUrl: null,
      profileUrl: null,
      syncedAt: null,
      syncError: null,
    };
    const row = await tx.collaborator.upsert({
      where: { githubUsername: username },
      create: data,
      update: {},
      select: { id: true },
    });
    ids.push({ id: row.id });
  }
  return ids;
}

/** Supprime, parmi `ids`, les collaborateurs qui ne sont plus rattachés à aucun projet. */
async function deleteOrphanCollaborators(tx: Prisma.TransactionClient, ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await tx.collaborator.deleteMany({ where: { id: { in: [...ids] }, projects: { none: {} } } });
  return count;
}

export type ResyncResult =
  | { status: "synced"; username: string }
  | { status: "failed"; username: string; message: string }
  | { status: "not-found" };

/**
 * « Relancer la récupération » : nouvel appel à GitHub pour un collaborateur
 * connu. En cas de succès, nom, avatar et profil sont remplacés et l'erreur
 * effacée ; en cas d'échec, les données déjà connues sont conservées et
 * l'erreur enregistrée.
 */
export async function resyncCollaborator(id: string, now: () => Date = () => new Date()): Promise<ResyncResult> {
  const collaborator = await db.collaborator.findUnique({ where: { id }, select: { githubUsername: true } });
  if (!collaborator) return { status: "not-found" };
  const username = collaborator.githubUsername;

  const result = await fetchGitHubUser(username, { token: env.GITHUB_TOKEN });
  try {
    if (result.ok) {
      const { name, avatarUrl, profileUrl } = result.profile;
      await db.collaborator.update({
        where: { id },
        data: { name, avatarUrl, profileUrl, syncedAt: now(), syncError: null },
      });
      return { status: "synced", username };
    }
    const message = GITHUB_FAILURE_MESSAGES[result.reason];
    await db.collaborator.update({ where: { id }, data: { syncError: message } });
    return { status: "failed", username, message };
  } catch (error) {
    // Collaborateur supprimé pendant l'appel (projet supprimé, orphelin).
    if (isRecordNotFound(error)) return { status: "not-found" };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Enregistrement
// ---------------------------------------------------------------------------

export type SaveProjectResult =
  | { status: "saved"; project: { id: string; title: string } }
  | { status: "duplicate-slug"; slug: string }
  | { status: "technologies-missing" }
  | { status: "slug-change-unconfirmed"; currentSlug: string; slug: string }
  | { status: "not-found" };

export type SaveProjectOptions = {
  /** Chemin d'une image déjà envoyée ; absent : image inchangée. */
  imagePath?: string;
  /** Collaborateurs inconnus, préparés par `resolveNewCollaborators`. */
  newCollaborators: readonly NewCollaborator[];
};

async function technologiesExist(tx: Prisma.TransactionClient, ids: readonly string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await tx.technology.count({ where: { id: { in: [...ids] } } });
  return count === ids.length;
}

function linksData(input: ProjectInput) {
  return input.links.map((link, position) => ({ label: link.label, url: link.url, position }));
}

/**
 * Création, non publiée, en dernière position. La contrainte d'unicité du
 * slug tranche une création simultanée (l'appelant supprime alors l'image
 * envoyée).
 */
export async function createProject(input: ProjectInput, options: SaveProjectOptions): Promise<SaveProjectResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lockProjectOrder(tx);
      const duplicate = await tx.project.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (duplicate) return { status: "duplicate-slug", slug: input.slug } as const;
      if (!(await technologiesExist(tx, input.technologyIds))) return { status: "technologies-missing" } as const;

      const collaborators = await collaboratorIds(tx, input.collaborators, options.newCollaborators);
      const last = await tx.project.findFirst({ orderBy: [{ position: "desc" }], select: { position: true } });
      const project = await tx.project.create({
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          date: input.date,
          imagePath: options.imagePath ?? null,
          isPublished: false,
          position: last ? last.position + 1 : 0,
          links: { create: linksData(input) },
          technologies: { connect: input.technologyIds.map((id) => ({ id })) },
          collaborators: { connect: collaborators },
        },
        select: { id: true, title: true },
      });
      return { status: "saved", project } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate-slug", slug: input.slug };
    if (isRecordNotFound(error)) return { status: "technologies-missing" };
    throw error;
  }
}

/**
 * Modification des informations, des liens (remplacés dans l'ordre saisi),
 * des technologies, des collaborateurs et, si `imagePath` est fourni, de
 * l'image. Le statut et la position ne changent pas. Les collaborateurs
 * retirés qui ne sont plus rattachés à aucun projet sont supprimés.
 */
export async function updateProject(
  id: string,
  input: ProjectInput,
  options: SaveProjectOptions,
): Promise<SaveProjectResult> {
  try {
    return await db.$transaction(async (tx) => {
      await lockProjectRow(tx, id);
      const current = await tx.project.findUnique({
        where: { id },
        select: { id: true, slug: true, isPublished: true, collaborators: { select: { id: true } } },
      });
      if (!current) return { status: "not-found" } as const;
      // Contrôlé aussi ici, sous verrou : le projet a pu être publié depuis l'affichage du formulaire.
      if (
        needsSlugChangeConfirmation({
          isPublished: current.isPublished,
          currentSlug: current.slug,
          nextSlug: input.slug,
          confirmed: input.confirmSlugChange,
        })
      ) {
        return { status: "slug-change-unconfirmed", currentSlug: current.slug, slug: input.slug } as const;
      }

      const duplicate = await tx.project.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (duplicate && duplicate.id !== id) return { status: "duplicate-slug", slug: input.slug } as const;
      if (!(await technologiesExist(tx, input.technologyIds))) return { status: "technologies-missing" } as const;

      const collaborators = await collaboratorIds(tx, input.collaborators, options.newCollaborators);
      const project = await tx.project.update({
        where: { id },
        data: {
          slug: input.slug,
          title: input.title,
          description: input.description,
          date: input.date,
          ...(options.imagePath === undefined ? {} : { imagePath: options.imagePath }),
          links: { deleteMany: {}, create: linksData(input) },
          technologies: { set: input.technologyIds.map((technologyId) => ({ id: technologyId })) },
          collaborators: { set: collaborators },
        },
        select: { id: true, title: true },
      });

      const kept = new Set(collaborators.map((collaborator) => collaborator.id));
      const removed = current.collaborators.map((collaborator) => collaborator.id).filter((other) => !kept.has(other));
      await deleteOrphanCollaborators(tx, removed);
      return { status: "saved", project } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate-slug", slug: input.slug };
    if (isRecordNotFound(error)) return { status: "not-found" };
    throw error;
  }
}

export type PublicationResult =
  | { status: "changed"; isPublished: boolean }
  | { status: "unchanged"; isPublished: boolean }
  | { status: "not-found" };

/**
 * Seul point de changement du statut, appelé par la page de confirmation.
 * `publish` est le statut demandé : s'il est déjà celui du projet (double
 * envoi, autre onglet), rien ne change.
 */
export async function setProjectPublication(id: string, publish: boolean): Promise<PublicationResult> {
  return db.$transaction(async (tx) => {
    await lockProjectRow(tx, id);
    const project = await tx.project.findUnique({ where: { id }, select: { isPublished: true } });
    if (!project) return { status: "not-found" } as const;
    if (project.isPublished === publish) return { status: "unchanged", isPublished: publish } as const;
    await tx.project.update({ where: { id }, data: { isPublished: publish } });
    return { status: "changed", isPublished: publish } as const;
  });
}

export type DeleteProjectResult =
  | { status: "deleted"; title: string; imagePath: string | null; removedCollaborators: number }
  | { status: "not-found" };

/**
 * Suppression : liens et rattachements supprimés par la cascade des clés
 * étrangères, puis collaborateurs devenus orphelins. L'image n'est pas
 * touchée ici : l'appelant la supprime du bucket après la suppression en base.
 */
export async function deleteProject(id: string): Promise<DeleteProjectResult> {
  return db.$transaction(async (tx) => {
    await lockProjectRow(tx, id);
    const project = await tx.project.findUnique({
      where: { id },
      select: { title: true, imagePath: true, collaborators: { select: { id: true } } },
    });
    if (!project) return { status: "not-found" } as const;

    await tx.project.delete({ where: { id } });
    const removedCollaborators = await deleteOrphanCollaborators(
      tx,
      project.collaborators.map((collaborator) => collaborator.id),
    );
    return { status: "deleted", title: project.title, imagePath: project.imagePath, removedCollaborators } as const;
  });
}

export type MoveProjectResult =
  | { status: "moved"; title: string; position: number; total: number }
  | { status: "edge"; title: string }
  | { status: "not-found" };

/**
 * « Monter » ou « Descendre » : échange avec le voisin, puis renumérotation
 * 0, 1, 2… (comme les formations et la stack). `position` du résultat : rang
 * affiché, à partir de 1.
 */
export async function moveProject(id: string, direction: ProjectMoveDirection): Promise<MoveProjectResult> {
  return db.$transaction(async (tx) => {
    await lockProjectOrder(tx);

    const rows = await tx.project.findMany({ orderBy: ORDER, select: { id: true, title: true, position: true } });
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return { status: "not-found" } as const;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return { status: "edge", title: rows[index].title } as const;

    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    for (const [position, row] of ordered.entries()) {
      if (row.position !== position) await tx.project.update({ where: { id: row.id }, data: { position } });
    }
    return { status: "moved", title: rows[index].title, position: target + 1, total: rows.length } as const;
  });
}
