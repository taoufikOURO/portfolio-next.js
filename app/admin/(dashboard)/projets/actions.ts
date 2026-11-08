"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import {
  createProject,
  deleteProject,
  getProject,
  isSlugTaken,
  moveProject,
  resolveNewCollaborators,
  resyncCollaborator,
  setProjectPublication,
  updateProject,
  type NewCollaborator,
  type SaveProjectResult,
} from "@/lib/projects";
import { removeFile } from "@/lib/storage/remove";
import { replaceFile } from "@/lib/storage/upload";
import { firstFieldErrors, type ActionState } from "@/lib/validation/auth";
import {
  createProjectSchema,
  deleteProjectSchema,
  duplicateSlugMessage,
  moveProjectSchema,
  needsSlugChangeConfirmation,
  projectAtEdgeMessage,
  publishedSlugChangeMessage,
  projectInputFromFormData,
  projectMovedMessage,
  projectValuesFromFormData,
  PROJECT_MESSAGES,
  publicationInputFromFormData,
  publicationSchema,
  resyncCollaboratorSchema,
  updateProjectSchema,
  type ProjectField,
  type ProjectFormState,
  type ProjectFormValues,
  type ProjectInput,
  type ProjectMoveDirection,
} from "@/lib/validation/project";

import { STACK_PATH } from "../stack/routes";
import { PROJECTS_PATH, projectPath, savedResult, type ProjectResult } from "./routes";

export type MoveProjectState =
  | (NonNullable<ActionState<never>> & { direction?: ProjectMoveDirection; position?: number; total?: number })
  | null;

export type ProjectActionState = ActionState<never>;

type Refusal = Exclude<SaveProjectResult, { status: "saved" }>;

/**
 * Enregistrement refusé pendant l'envoi de l'image (slug pris entre-temps,
 * projet supprimé…). Levée dans `save` pour que `replaceFile` supprime le
 * fichier qui vient d'être envoyé.
 */
class SaveRefused extends Error {
  constructor(readonly result: Refusal) {
    super("Enregistrement du projet refusé.");
  }
}

function failure(
  message: string,
  fieldErrors: Partial<Record<ProjectField, string>>,
  values: ProjectFormValues,
): ProjectFormState {
  return { ok: false, message, fieldErrors, values };
}

function refusedState(result: Refusal, values: ProjectFormValues): ProjectFormState {
  switch (result.status) {
    case "duplicate-slug":
      return failure(PROJECT_MESSAGES.formInvalid, { slug: duplicateSlugMessage(result.slug) }, values);
    case "technologies-missing":
      return failure(PROJECT_MESSAGES.formInvalid, { technologyIds: PROJECT_MESSAGES.technologiesMissing }, values);
    case "slug-change-unconfirmed":
      return failure(
        PROJECT_MESSAGES.formInvalid,
        { confirmSlugChange: publishedSlugChangeMessage(result.currentSlug, result.slug) },
        values,
      );
    case "not-found":
      return failure(PROJECT_MESSAGES.notFound, {}, values);
  }
}

function caughtState(caught: unknown, context: string, values: ProjectFormValues): ProjectFormState {
  if (caught instanceof SaveRefused) return refusedState(caught.result, values);
  logUnexpectedError(context, caught);
  return failure(PROJECT_MESSAGES.unexpected, {}, values);
}

function revalidateSections() {
  revalidatePath(PROJECTS_PATH, "layout");
  // La stack liste les projets qui utilisent chaque technologie.
  revalidatePath(STACK_PATH, "layout");
}

const githubFailed = (collaborators: readonly NewCollaborator[]) =>
  collaborators.some((collaborator) => collaborator.syncError !== null);

/**
 * Enregistre le projet, avec l'image si un fichier est choisi : envoi dans le
 * bucket `projects`, enregistrement en base (`save`), puis suppression de
 * l'ancienne image. Renvoie un état de refus, ou l'identifiant et
 * l'avertissement éventuel sur l'ancienne image.
 */
async function saveWithImage(
  image: File | null,
  previousPath: string | null,
  save: (imagePath?: string) => Promise<SaveProjectResult>,
): Promise<{ ok: false; imageError: string } | { ok: true; id: string; previousImageKept: boolean }> {
  if (image === null) {
    const result = await save();
    if (result.status !== "saved") throw new SaveRefused(result);
    return { ok: true, id: result.project.id, previousImageKept: false };
  }
  let id = "";
  const replaced = await replaceFile({
    bucket: "projects",
    kind: "image",
    file: image,
    previousPath,
    save: async (path) => {
      const result = await save(path);
      if (result.status !== "saved") throw new SaveRefused(result);
      id = result.project.id;
    },
  });
  if (!replaced.ok) return { ok: false, imageError: replaced.error };
  return { ok: true, id, previousImageKept: !replaced.previousRemoved };
}

/**
 * Création d'un projet, toujours non publié, en dernière position. Ordre :
 * validation → slug déjà pris (refus avant tout envoi d'image et tout appel à
 * GitHub) → profils GitHub des collaborateurs inconnus → image et
 * enregistrement.
 */
export async function createProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireSession();

  const values = projectValuesFromFormData(formData);
  const parsed = createProjectSchema.safeParse(projectInputFromFormData(formData));
  if (!parsed.success) {
    return failure(PROJECT_MESSAGES.formInvalid, firstFieldErrors<ProjectField>(parsed.error), values);
  }
  const { image, ...input } = parsed.data;

  let target: string;
  try {
    if (await isSlugTaken(input.slug)) {
      return failure(PROJECT_MESSAGES.formInvalid, { slug: duplicateSlugMessage(input.slug) }, values);
    }
    const newCollaborators = await resolveNewCollaborators(input.collaborators);
    const saved = await saveWithImage(image, null, (imagePath) =>
      createProject(input satisfies ProjectInput, { imagePath, newCollaborators }),
    );
    if (!saved.ok) return failure(PROJECT_MESSAGES.formInvalid, { image: saved.imageError }, values);
    target = `${projectPath(saved.id)}?resultat=${savedResult("create", {
      previousImageKept: false,
      githubFailed: githubFailed(newCollaborators),
    })}`;
  } catch (caught) {
    return caughtState(caught, "Création d'un projet", values);
  }

  revalidateSections();
  redirect(target);
}

/**
 * Modification (informations, image, liens, technologies, collaborateurs).
 * Le statut n'est jamais lu ici : il ne change que par la page de
 * confirmation (`setPublicationAction`).
 */
export async function updateProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireSession();

  const values = projectValuesFromFormData(formData);
  const parsed = updateProjectSchema.safeParse(projectInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<ProjectField | "id">(parsed.error);
    if (errors.id) return failure(PROJECT_MESSAGES.notFound, {}, values);
    return failure(PROJECT_MESSAGES.formInvalid, errors, values);
  }
  const { id, image, ...input } = parsed.data;

  let target: string;
  try {
    const current = await getProject(id);
    if (!current) return failure(PROJECT_MESSAGES.notFound, {}, values);
    // Projet publié : changer le slug change l'adresse publique, confirmation explicite exigée (avant tout envoi).
    if (
      needsSlugChangeConfirmation({
        isPublished: current.isPublished,
        currentSlug: current.slug,
        nextSlug: input.slug,
        confirmed: input.confirmSlugChange,
      })
    ) {
      return refusedState({ status: "slug-change-unconfirmed", currentSlug: current.slug, slug: input.slug }, values);
    }
    if (await isSlugTaken(input.slug, id)) {
      return failure(PROJECT_MESSAGES.formInvalid, { slug: duplicateSlugMessage(input.slug) }, values);
    }
    const newCollaborators = await resolveNewCollaborators(input.collaborators);
    const saved = await saveWithImage(image, current.imagePath, (imagePath) =>
      updateProject(id, input, { imagePath, newCollaborators }),
    );
    if (!saved.ok) return failure(PROJECT_MESSAGES.formInvalid, { image: saved.imageError }, values);
    target = `${projectPath(id)}?resultat=${savedResult("update", {
      previousImageKept: saved.previousImageKept,
      githubFailed: githubFailed(newCollaborators),
    })}`;
  } catch (caught) {
    return caughtState(caught, "Modification d'un projet", values);
  }

  revalidateSections();
  redirect(target);
}

/** « Monter » / « Descendre » : l'ordre est enregistré en base. */
export async function moveProjectAction(_previous: MoveProjectState, formData: FormData): Promise<MoveProjectState> {
  await requireSession();

  const parsed = moveProjectSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: PROJECT_MESSAGES.moveInvalid, fieldErrors: {} };
  const { id, direction } = parsed.data;

  try {
    const result = await moveProject(id, direction);
    if (result.status === "not-found") return { ok: false, message: PROJECT_MESSAGES.notFound, fieldErrors: {} };
    if (result.status === "edge") {
      return { ok: false, message: projectAtEdgeMessage(result.title, direction), fieldErrors: {}, direction };
    }
    revalidateSections();
    return {
      ok: true,
      message: projectMovedMessage(result.title, result.position, result.total),
      fieldErrors: {},
      direction,
      position: result.position,
      total: result.total,
    };
  } catch (caught) {
    logUnexpectedError("Déplacement d'un projet", caught);
    return { ok: false, message: PROJECT_MESSAGES.unexpected, fieldErrors: {} };
  }
}

/**
 * Changement de statut, envoyé par la page de confirmation
 * (`/admin/projets/[id]/publication`) : seul chemin qui modifie
 * `isPublished`. Exige `confirmed=1` et le statut demandé.
 */
export async function setPublicationAction(
  _previous: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireSession();

  const parsed = publicationSchema.safeParse(publicationInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<"id" | "publish" | "confirmed">(parsed.error);
    return { ok: false, message: errors.id ? PROJECT_MESSAGES.notFound : PROJECT_MESSAGES.publicationInvalid, fieldErrors: {} };
  }
  const { id, publish } = parsed.data;

  let result: ProjectResult;
  try {
    const outcome = await setProjectPublication(id, publish);
    if (outcome.status === "not-found") return { ok: false, message: PROJECT_MESSAGES.notFound, fieldErrors: {} };
    result = outcome.status === "unchanged" ? "statut-inchange" : outcome.isPublished ? "publie" : "depublie";
  } catch (caught) {
    logUnexpectedError("Changement du statut d'un projet", caught);
    return { ok: false, message: PROJECT_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSections();
  redirect(`${projectPath(id)}?resultat=${result}`);
}

/** Supprime l'image d'un projet supprimé ; `false` si le bucket l'a refusé (journalisé). */
async function removeImage(imagePath: string): Promise<boolean> {
  try {
    return await removeFile("projects", imagePath);
  } catch (caught) {
    logUnexpectedError("Suppression de l'image d'un projet", caught);
    return false;
  }
}

/**
 * Suppression confirmée (dialogue ou page de confirmation) : projet, liens et
 * rattachements, collaborateurs devenus orphelins, puis image du bucket.
 */
export async function deleteProjectAction(
  _previous: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  await requireSession();

  const parsed = deleteProjectSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: PROJECT_MESSAGES.notFound, fieldErrors: {} };

  let result: ProjectResult;
  try {
    const outcome = await deleteProject(parsed.data.id);
    if (outcome.status === "not-found") return { ok: false, message: PROJECT_MESSAGES.notFound, fieldErrors: {} };
    const imageRemoved = outcome.imagePath === null ? true : await removeImage(outcome.imagePath);
    result = imageRemoved ? "supprime" : "supprime-image-conservee";
  } catch (caught) {
    logUnexpectedError("Suppression d'un projet", caught);
    return { ok: false, message: PROJECT_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSections();
  redirect(`${PROJECTS_PATH}?resultat=${result}`);
}

/**
 * « Relancer la récupération » : seul moyen de mettre à jour un collaborateur
 * déjà connu. Formulaire simple (fonctionne sans JavaScript) : le résultat
 * est affiché sur la page du projet.
 */
export async function resyncCollaboratorAction(formData: FormData): Promise<void> {
  await requireSession();

  const parsed = resyncCollaboratorSchema.safeParse({
    projectId: formData.get("projectId"),
    collaboratorId: formData.get("collaboratorId"),
  });
  if (!parsed.success) redirect(PROJECTS_PATH);
  const { projectId, collaboratorId } = parsed.data;

  let result: ProjectResult;
  try {
    const outcome = await resyncCollaborator(collaboratorId);
    result = outcome.status === "synced" ? "collaborateur-recupere" : "collaborateur-echec";
  } catch (caught) {
    logUnexpectedError("Récupération du profil GitHub d'un collaborateur", caught);
    result = "collaborateur-echec";
  }

  revalidateSections();
  redirect(`${projectPath(projectId)}?resultat=${result}`);
}
