"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import {
  createEducation,
  deleteEducation,
  moveEducation,
  updateEducation,
  type SaveEducationResult,
} from "@/lib/educations";
import { createSkill } from "@/lib/skills";
import { firstFieldErrors, type ActionState } from "@/lib/validation/auth";
import {
  alreadyAtEdgeMessage,
  deleteEducationSchema,
  EDUCATION_MESSAGES,
  educationIdField,
  educationInputFromFormData,
  educationSchema,
  educationValuesFromFormData,
  moveEducationSchema,
  movedMessage,
  type EducationFormState,
  type EducationFormValues,
  type MoveDirection,
} from "@/lib/validation/education";
import {
  duplicateNewSkillMessage,
  SKILL_MESSAGES,
  skillCreatedAndCheckedMessage,
  skillSchema,
} from "@/lib/validation/skill";

import { SKILLS_PATH } from "../competences/routes";
import { EDUCATIONS_PATH, type EducationResult } from "./routes";

/** Résultat d'un déplacement : le composant client s'en sert pour garder le focus sur le bon bouton. */
export type MoveEducationState =
  | (NonNullable<ActionState<never>> & { direction?: MoveDirection; position?: number; total?: number })
  | null;

export type DeleteEducationState = ActionState<never>;

/** Résultat de « Créer et cocher » : la compétence créée, que le formulaire ajoute à la liste et coche. */
export type CreateSkillFromEducationState =
  | { ok: true; message: string; skill: { id: string; name: string } }
  | { ok: false; message: string };

/** Échec d'enregistrement d'une formation → état du formulaire (`null` si enregistrée). */
function saveFailureState(result: SaveEducationResult, values: EducationFormValues): EducationFormState {
  switch (result.status) {
    case "saved":
      return null;
    case "not-found":
      return { ok: false, message: EDUCATION_MESSAGES.notFound, fieldErrors: {}, values };
    case "missing-skills":
      return {
        ok: false,
        message: EDUCATION_MESSAGES.formInvalid,
        fieldErrors: { skillIds: EDUCATION_MESSAGES.skillsMissing },
        values,
      };
    case "duplicate-skill":
      return {
        ok: false,
        message: EDUCATION_MESSAGES.formInvalid,
        fieldErrors: { newSkill: duplicateNewSkillMessage(result.existingName) },
        values,
      };
  }
}

/** La page « Compétences » affiche les formations qui utilisent chaque compétence. */
function revalidateSections() {
  revalidatePath(EDUCATIONS_PATH, "layout");
  revalidatePath(SKILLS_PATH, "layout");
}

/**
 * Validation commune à la création et à la modification : même schéma que le
 * client, toujours rejoué ici (sans JavaScript, c'est la seule validation).
 */
function parseEducationForm(formData: FormData) {
  const values = educationValuesFromFormData(formData);
  const parsed = educationSchema.safeParse(educationInputFromFormData(formData));
  if (parsed.success) return { values, input: parsed.data, error: null } as const;
  const state: EducationFormState = {
    ok: false,
    message: EDUCATION_MESSAGES.formInvalid,
    fieldErrors: firstFieldErrors(parsed.error),
    values,
  };
  return { values, input: null, error: state } as const;
}

/** Ajout d'une formation (en dernière position), puis retour à la liste. */
export async function createEducationAction(
  _previous: EducationFormState,
  formData: FormData,
): Promise<EducationFormState> {
  await requireSession();

  const { values, input, error } = parseEducationForm(formData);
  if (error) return error;

  try {
    const failure = saveFailureState(await createEducation(input), values);
    if (failure) return failure;
  } catch (caught) {
    logUnexpectedError("Ajout d'une formation", caught);
    return { ok: false, message: EDUCATION_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSections();
  redirect(`${EDUCATIONS_PATH}?resultat=${"creee" satisfies EducationResult}`);
}

/** Modification d'une formation (champs et compétences), puis retour à la liste. */
export async function updateEducationAction(
  _previous: EducationFormState,
  formData: FormData,
): Promise<EducationFormState> {
  await requireSession();

  const { values, input, error } = parseEducationForm(formData);
  const id = educationIdField.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: EDUCATION_MESSAGES.notFound, fieldErrors: {}, values };
  if (error) return error;

  try {
    const failure = saveFailureState(await updateEducation(id.data, input), values);
    if (failure) return failure;
  } catch (caught) {
    logUnexpectedError("Modification d'une formation", caught);
    return { ok: false, message: EDUCATION_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSections();
  redirect(`${EDUCATIONS_PATH}?resultat=${"modifiee" satisfies EducationResult}`);
}

/** « Monter » / « Descendre » : l'ordre est enregistré en base (persistant au rechargement). */
export async function moveEducationAction(
  _previous: MoveEducationState,
  formData: FormData,
): Promise<MoveEducationState> {
  await requireSession();

  const parsed = moveEducationSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return { ok: false, message: EDUCATION_MESSAGES.moveInvalid, fieldErrors: {} };
  const { id, direction } = parsed.data;

  try {
    const result = await moveEducation(id, direction);
    if (result.status === "not-found") return { ok: false, message: EDUCATION_MESSAGES.notFound, fieldErrors: {} };
    if (result.status === "edge") {
      return { ok: false, message: alreadyAtEdgeMessage(result.title, direction), fieldErrors: {}, direction };
    }
    revalidateSections();
    return {
      ok: true,
      message: movedMessage(result.title, result.position, result.total),
      fieldErrors: {},
      direction,
      position: result.position,
      total: result.total,
    };
  } catch (caught) {
    logUnexpectedError("Déplacement d'une formation", caught);
    return { ok: false, message: EDUCATION_MESSAGES.unexpected, fieldErrors: {} };
  }
}

/** Suppression (après confirmation), puis retour à la liste. Les compétences restent. */
export async function deleteEducationAction(
  _previous: DeleteEducationState,
  formData: FormData,
): Promise<DeleteEducationState> {
  await requireSession();

  const parsed = deleteEducationSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: EDUCATION_MESSAGES.notFound, fieldErrors: {} };

  try {
    const result = await deleteEducation(parsed.data.id);
    if (result.status === "not-found") return { ok: false, message: EDUCATION_MESSAGES.notFound, fieldErrors: {} };
  } catch (caught) {
    logUnexpectedError("Suppression d'une formation", caught);
    return { ok: false, message: EDUCATION_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSections();
  redirect(`${EDUCATIONS_PATH}?resultat=${"supprimee" satisfies EducationResult}`);
}

/**
 * « Créer et cocher » (formulaire d'une formation, avec JavaScript) : crée la
 * compétence sans enregistrer la formation ni quitter la page. Même schéma et
 * même règle de doublon que la section « Compétences ». Sans JavaScript, la
 * compétence saisie est créée à l'enregistrement de la formation.
 */
export async function createSkillFromEducationAction(name: unknown): Promise<CreateSkillFromEducationState> {
  await requireSession();

  const parsed = skillSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, message: firstFieldErrors<"name">(parsed.error).name ?? SKILL_MESSAGES.nameRequired };
  }

  try {
    const result = await createSkill(parsed.data.name);
    if (result.status === "duplicate") return { ok: false, message: duplicateNewSkillMessage(result.existingName) };
    if (result.status !== "saved") return { ok: false, message: SKILL_MESSAGES.unexpected };
    revalidateSections();
    const skill = { id: result.skill.id, name: result.skill.name };
    return { ok: true, message: skillCreatedAndCheckedMessage(skill.name), skill };
  } catch (caught) {
    logUnexpectedError("Création d'une compétence depuis une formation", caught);
    return { ok: false, message: SKILL_MESSAGES.unexpected };
  }
}
