"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import { createSkill, deleteSkill, renameSkill, type SkillUsage } from "@/lib/skills";
import { firstFieldErrors, type ActionState } from "@/lib/validation/auth";
import {
  deleteSkillInputFromFormData,
  deleteSkillSchema,
  duplicateSkillMessage,
  renameSkillSchema,
  SKILL_MESSAGES,
  skillCreatedMessage,
  skillInUseMessage,
  skillSchema,
} from "@/lib/validation/skill";

import { EDUCATIONS_PATH } from "../formations/routes";
import { SKILLS_PATH, type SkillResult } from "./routes";

export type SkillFormState = ActionState<"name">;

/**
 * Refus de suppression : `educations` liste les formations qui utilisent la
 * compétence, pour une nouvelle confirmation.
 */
export type DeleteSkillState =
  | (NonNullable<ActionState<never>> & { educations?: SkillUsage[] })
  | null;

/** Nom saisi à réafficher après un refus (React vide le formulaire après l'action). */
function nameValue(formData: FormData) {
  const raw = formData.get("name");
  return { name: typeof raw === "string" ? raw.slice(0, 500) : "" };
}

/** Les deux sections affichent les compétences : les deux sont rafraîchies. */
function revalidateSections() {
  revalidatePath(SKILLS_PATH, "layout");
  revalidatePath(EDUCATIONS_PATH, "layout");
}

/** Ajout d'une compétence (nom unique, sans tenir compte de la casse, des accents ni des espaces). */
export async function createSkillAction(_previous: SkillFormState, formData: FormData): Promise<SkillFormState> {
  await requireSession();

  const values = nameValue(formData);
  const parsed = skillSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, message: SKILL_MESSAGES.formInvalid, fieldErrors: firstFieldErrors(parsed.error), values };
  }

  try {
    const result = await createSkill(parsed.data.name);
    if (result.status !== "saved") {
      return {
        ok: false,
        message: SKILL_MESSAGES.formInvalid,
        fieldErrors: {
          name: result.status === "duplicate" ? duplicateSkillMessage(result.existingName) : SKILL_MESSAGES.unexpected,
        },
        values,
      };
    }
    revalidateSections();
    return { ok: true, message: skillCreatedMessage(result.skill.name), fieldErrors: {} };
  } catch (error) {
    logUnexpectedError("Ajout d'une compétence", error);
    return { ok: false, message: SKILL_MESSAGES.unexpected, fieldErrors: {}, values };
  }
}

/** Renommage, puis retour à la liste. */
export async function renameSkillAction(_previous: SkillFormState, formData: FormData): Promise<SkillFormState> {
  await requireSession();

  const values = nameValue(formData);
  const parsed = renameSkillSchema.safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) {
    const fieldErrors = firstFieldErrors<"id" | "name">(parsed.error);
    if (fieldErrors.id) return { ok: false, message: SKILL_MESSAGES.notFound, fieldErrors: {}, values };
    return { ok: false, message: SKILL_MESSAGES.formInvalid, fieldErrors: { name: fieldErrors.name }, values };
  }

  try {
    const result = await renameSkill(parsed.data.id, parsed.data.name);
    if (result.status === "duplicate") {
      return {
        ok: false,
        message: SKILL_MESSAGES.formInvalid,
        fieldErrors: { name: duplicateSkillMessage(result.existingName) },
        values,
      };
    }
    if (result.status === "not-found") {
      return { ok: false, message: SKILL_MESSAGES.notFound, fieldErrors: {}, values };
    }
  } catch (error) {
    logUnexpectedError("Renommage d'une compétence", error);
    return { ok: false, message: SKILL_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSections();
  redirect(`${SKILLS_PATH}?resultat=${"renommee" satisfies SkillResult}`);
}

/**
 * Suppression. Sans confirmation, une compétence utilisée n'est pas supprimée
 * (refus, avec la liste des formations concernées). Avec confirmation, elle
 * l'est, et ses liens sont détachés, si les formations rattachées sont celles
 * qui étaient affichées dans la confirmation (`decideSkillDeletion`).
 */
export async function deleteSkillAction(_previous: DeleteSkillState, formData: FormData): Promise<DeleteSkillState> {
  await requireSession();

  const parsed = deleteSkillSchema.safeParse(deleteSkillInputFromFormData(formData));
  if (!parsed.success) return { ok: false, message: SKILL_MESSAGES.notFound, fieldErrors: {} };

  let result: SkillResult;
  try {
    const { id, confirmed, confirmedEducationIds } = parsed.data;
    const outcome = await deleteSkill(id, confirmed ? confirmedEducationIds : null);
    if (outcome.status === "not-found") return { ok: false, message: SKILL_MESSAGES.notFound, fieldErrors: {} };
    if (outcome.status === "blocked") {
      return {
        ok: false,
        message: skillInUseMessage(outcome.skill.educations.length),
        fieldErrors: {},
        educations: outcome.skill.educations,
      };
    }
    result = outcome.detachedCount > 0 ? "supprimee-detachee" : "supprimee";
  } catch (error) {
    logUnexpectedError("Suppression d'une compétence", error);
    return { ok: false, message: SKILL_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSections();
  redirect(`${SKILLS_PATH}?resultat=${result}`);
}
