"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import { revalidatePublic } from "@/lib/public/revalidate";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { removeFile } from "@/lib/storage/remove";
import { replaceFile } from "@/lib/storage/upload";
import {
  createTechnology,
  deleteTechnology,
  existingTechnologyName,
  findDuplicateTechnologyName,
  getTechnology,
  moveTechnology,
  updateTechnology,
  type SaveTechnologyResult,
  type TechnologyUsage,
} from "@/lib/technologies";
import { firstFieldErrors, type ActionState } from "@/lib/validation/auth";
import {
  createTechnologySchema,
  deleteTechnologyInputFromFormData,
  deleteTechnologySchema,
  duplicateTechnologyMessage,
  moveTechnologySchema,
  technologyAtEdgeMessage,
  technologyInUseMessage,
  technologyInputFromFormData,
  technologyMovedMessage,
  TECHNOLOGY_MESSAGES,
  updateTechnologySchema,
  type TechnologyField,
  type TechnologyFormState,
  type TechnologyMoveDirection,
} from "@/lib/validation/technology";

import { STACK_PATH, type TechnologyResult } from "./routes";

/** Résultat d'un déplacement : le composant client s'en sert pour garder le focus sur le bon bouton. */
export type MoveTechnologyState =
  | (NonNullable<ActionState<never>> & { direction?: TechnologyMoveDirection; position?: number; total?: number })
  | null;

/**
 * Refus de suppression : `projects` liste les projets qui utilisent la
 * technologie, pour une nouvelle confirmation.
 */
export type DeleteTechnologyState =
  | (NonNullable<ActionState<never>> & { projects?: TechnologyUsage[] })
  | null;

type Refusal = Exclude<SaveTechnologyResult, { status: "saved" }>;

/**
 * Enregistrement refusé pendant l'envoi de l'icône (doublon de dernière
 * minute, technologie supprimée entre-temps). Levée dans `save` pour que
 * `replaceFile` supprime le fichier qui vient d'être envoyé.
 */
class SaveRefused extends Error {
  constructor(readonly result: Refusal) {
    super("Enregistrement de la technologie refusé.");
  }
}

function assertSaved(result: SaveTechnologyResult): void {
  if (result.status !== "saved") throw new SaveRefused(result);
}

type Values = { name: string };

/** Nom saisi à réafficher après un refus (React vide le formulaire après l'action). */
function nameValue(formData: FormData): Values {
  const raw = formData.get("name");
  return { name: typeof raw === "string" ? raw.slice(0, 500) : "" };
}

function failure(
  message: string,
  fieldErrors: Partial<Record<TechnologyField, string>>,
  values: Values,
): TechnologyFormState {
  return { ok: false, message, fieldErrors, values };
}

function duplicateState(existingName: string, values: Values): TechnologyFormState {
  return failure(TECHNOLOGY_MESSAGES.formInvalid, { name: duplicateTechnologyMessage(existingName) }, values);
}

/** Refus d'enregistrement → état du formulaire. */
function refusedState(result: Refusal, values: Values): TechnologyFormState {
  if (result.status === "not-found") return failure(TECHNOLOGY_MESSAGES.notFound, {}, values);
  return duplicateState(result.existingName, values);
}

/** Erreur pendant l'enregistrement → état du formulaire (les doublons de dernière minute y sont traduits). */
async function caughtState(caught: unknown, context: string, name: string, values: Values): Promise<TechnologyFormState> {
  if (caught instanceof SaveRefused) return refusedState(caught.result, values);
  if (isUniqueViolation(caught)) return duplicateState(await existingTechnologyName(name), values);
  if (isRecordNotFound(caught)) return failure(TECHNOLOGY_MESSAGES.notFound, {}, values);
  logUnexpectedError(context, caught);
  return failure(TECHNOLOGY_MESSAGES.unexpected, {}, values);
}

/** Supprime le fichier d'icône d'une technologie supprimée ; `false` si le bucket l'a refusé (journalisé). */
async function removeIcon(iconPath: string): Promise<boolean> {
  // Technologie importée sans icône (E68) : aucun fichier à supprimer.
  if (iconPath.trim() === "") return true;
  try {
    return await removeFile("stack", iconPath);
  } catch (caught) {
    logUnexpectedError("Suppression du fichier d'icône d'une technologie", caught);
    return false;
  }
}

function revalidateSections() {
  revalidatePath(STACK_PATH, "layout");
  // Phase 2 : pages publiques concernées (E64).
  revalidatePublic("technologies");
}

/**
 * Ajout d'une technologie (en dernière position) avec son icône : l'icône est
 * envoyée dans le bucket `stack` (type réel, taille et contenu contrôlés par
 * `lib/storage/`), puis le chemin est enregistré avec le nom. Si
 * l'enregistrement échoue, le fichier envoyé est supprimé.
 */
export async function createTechnologyAction(
  _previous: TechnologyFormState,
  formData: FormData,
): Promise<TechnologyFormState> {
  await requireSession();

  const values = nameValue(formData);
  const parsed = createTechnologySchema.safeParse(technologyInputFromFormData(formData));
  if (!parsed.success) {
    return failure(TECHNOLOGY_MESSAGES.formInvalid, firstFieldErrors<TechnologyField>(parsed.error), values);
  }
  const { name, icon } = parsed.data;

  try {
    // Le doublon est refusé avant l'envoi : aucun fichier n'est écrit pour rien.
    const duplicate = await findDuplicateTechnologyName(name);
    if (duplicate) return duplicateState(duplicate, values);

    const uploaded = await replaceFile({
      bucket: "stack",
      kind: "icon",
      file: icon,
      save: async (path) => assertSaved(await createTechnology(name, path)),
    });
    if (!uploaded.ok) return failure(TECHNOLOGY_MESSAGES.formInvalid, { icon: uploaded.error }, values);
  } catch (caught) {
    return caughtState(caught, "Ajout d'une technologie", name, values);
  }

  revalidateSections();
  redirect(`${STACK_PATH}?resultat=${"creee" satisfies TechnologyResult}`);
}

/**
 * Modification du nom et, si un fichier est choisi, remplacement de l'icône :
 * le nouveau fichier est envoyé, son chemin enregistré, puis l'ancien fichier
 * supprimé. Sans nouveau fichier, l'icône actuelle est conservée.
 */
export async function updateTechnologyAction(
  _previous: TechnologyFormState,
  formData: FormData,
): Promise<TechnologyFormState> {
  await requireSession();

  const values = nameValue(formData);
  const parsed = updateTechnologySchema.safeParse(technologyInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<TechnologyField | "id">(parsed.error);
    if (errors.id) return failure(TECHNOLOGY_MESSAGES.notFound, {}, values);
    return failure(TECHNOLOGY_MESSAGES.formInvalid, { name: errors.name, icon: errors.icon }, values);
  }
  const { id, name, icon } = parsed.data;

  let result: TechnologyResult = "modifiee";
  try {
    const current = await getTechnology(id);
    if (!current) return failure(TECHNOLOGY_MESSAGES.notFound, {}, values);

    const duplicate = await findDuplicateTechnologyName(name, id);
    if (duplicate) return duplicateState(duplicate, values);

    if (icon === null) {
      const result = await updateTechnology(id, { name });
      if (result.status !== "saved") return refusedState(result, values);
    } else {
      const replaced = await replaceFile({
        bucket: "stack",
        kind: "icon",
        file: icon,
        previousPath: current.iconPath,
        save: async (path) => assertSaved(await updateTechnology(id, { name, iconPath: path })),
      });
      if (!replaced.ok) return failure(TECHNOLOGY_MESSAGES.formInvalid, { icon: replaced.error }, values);
      // Remplacement valide, mais l'ancien fichier est resté dans le bucket : avertissement.
      if (!replaced.previousRemoved) result = "modifiee-ancienne-icone";
    }
  } catch (caught) {
    return caughtState(caught, "Modification d'une technologie", name, values);
  }

  revalidateSections();
  redirect(`${STACK_PATH}?resultat=${result}`);
}

/** « Monter » / « Descendre » : l'ordre est enregistré en base (persistant au rechargement). */
export async function moveTechnologyAction(
  _previous: MoveTechnologyState,
  formData: FormData,
): Promise<MoveTechnologyState> {
  await requireSession();

  const parsed = moveTechnologySchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: TECHNOLOGY_MESSAGES.moveInvalid, fieldErrors: {} };
  const { id, direction } = parsed.data;

  try {
    const result = await moveTechnology(id, direction);
    if (result.status === "not-found") return { ok: false, message: TECHNOLOGY_MESSAGES.notFound, fieldErrors: {} };
    if (result.status === "edge") {
      return { ok: false, message: technologyAtEdgeMessage(result.name, direction), fieldErrors: {}, direction };
    }
    revalidateSections();
    return {
      ok: true,
      message: technologyMovedMessage(result.name, result.position, result.total),
      fieldErrors: {},
      direction,
      position: result.position,
      total: result.total,
    };
  } catch (caught) {
    logUnexpectedError("Déplacement d'une technologie", caught);
    return { ok: false, message: TECHNOLOGY_MESSAGES.unexpected, fieldErrors: {} };
  }
}

/**
 * Suppression. Sans confirmation, une technologie utilisée n'est pas
 * supprimée (refus, avec la liste des projets concernés). Avec confirmation,
 * elle l'est, et ses liens sont détachés, si les projets rattachés sont ceux
 * qui étaient affichés dans la confirmation (`decideTechnologyDeletion`).
 */
export async function deleteTechnologyAction(
  _previous: DeleteTechnologyState,
  formData: FormData,
): Promise<DeleteTechnologyState> {
  await requireSession();

  const parsed = deleteTechnologySchema.safeParse(deleteTechnologyInputFromFormData(formData));
  if (!parsed.success) return { ok: false, message: TECHNOLOGY_MESSAGES.notFound, fieldErrors: {} };

  let result: TechnologyResult;
  try {
    const { id, confirmed, confirmedProjectIds } = parsed.data;
    const outcome = await deleteTechnology(id, confirmed ? confirmedProjectIds : null);
    if (outcome.status === "not-found") return { ok: false, message: TECHNOLOGY_MESSAGES.notFound, fieldErrors: {} };
    if (outcome.status === "blocked") {
      return {
        ok: false,
        message: technologyInUseMessage(outcome.technology.projects.length),
        fieldErrors: {},
        projects: outcome.technology.projects,
      };
    }
    // L'icône est supprimée du bucket après la suppression en base : un échec n'annule rien (avertissement).
    const iconRemoved = await removeIcon(outcome.iconPath);
    const detached = outcome.detachedCount > 0;
    result = iconRemoved
      ? detached
        ? "supprimee-detachee"
        : "supprimee"
      : detached
        ? "supprimee-detachee-icone-conservee"
        : "supprimee-icone-conservee";
  } catch (caught) {
    logUnexpectedError("Suppression d'une technologie", caught);
    return { ok: false, message: TECHNOLOGY_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSections();
  redirect(`${STACK_PATH}?resultat=${result}`);
}
