"use client";

import { useActionState } from "react";
import { Check, Plus } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { SKILL_MESSAGES, SKILL_NAME_MAX_LENGTH, skillSchema } from "@/lib/validation/skill";

import { createSkillAction, renameSkillAction, type SkillFormState } from "./actions";
import { SKILLS_PATH } from "./routes";

/**
 * Formulaire du nom d'une compétence : ajout (page de la liste) ou renommage
 * (page de la compétence). Validation client et serveur avec le même schéma.
 */
export function SkillNameForm({ skill }: { skill?: { id: string; name: string } }) {
  const mode = skill ? "rename" : "create";
  const [state, formAction] = useActionState<SkillFormState, FormData>(
    mode === "create" ? createSkillAction : renameSkillAction,
    null,
  );
  const fieldId = mode === "create" ? "competence-nouvelle" : "competence-nom";
  const { clientErrors, onSubmit } = useClientValidation(
    skillSchema,
    [["name", fieldId]] as const,
    undefined,
    state?.fieldErrors,
  );

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? SKILL_MESSAGES.formInvalid : state?.message;
  const success = !clientErrors && state?.ok;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {message ? <Alert tone={success ? "success" : "error"}>{message}</Alert> : null}
      {skill ? <input type="hidden" name="id" value={skill.id} /> : null}

      <Field
        id={fieldId}
        name="name"
        label={mode === "create" ? "Nom de la nouvelle compétence" : "Nom de la compétence"}
        hint={`${SKILL_NAME_MAX_LENGTH} caractères au plus. Deux compétences ne peuvent pas porter le même nom, même avec des majuscules, des accents ou des espaces différents.`}
        autoComplete="off"
        required
        defaultValue={state?.values?.name ?? skill?.name}
        error={fieldErrors.name}
        className="max-w-xl"
      />

      <div className="flex flex-wrap gap-3">
        {mode === "create" ? (
          <SubmitButton icon={Plus}>Ajouter la compétence</SubmitButton>
        ) : (
          <>
            <SubmitButton icon={Check}>Enregistrer le nom</SubmitButton>
            <ButtonLink href={SKILLS_PATH} variant="secondary">
              Annuler
            </ButtonLink>
          </>
        )}
      </div>
    </form>
  );
}
