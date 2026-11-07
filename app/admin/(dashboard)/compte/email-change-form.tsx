"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { ACCOUNT_MESSAGES, changeEmailSchema } from "@/lib/validation/auth";

import { requestEmailChangeAction, type ChangeEmailState } from "./actions";

const NEW_EMAIL_ID = "compte-nouvelle-adresse";
const PASSWORD_ID = "compte-adresse-mot-de-passe";
const FIELDS = [
  ["newEmail", NEW_EMAIL_ID],
  ["currentPassword", PASSWORD_ID],
] as const;

/** Changement d'adresse : nouvelle adresse et mot de passe actuel. */
export function EmailChangeForm() {
  const [state, formAction] = useActionState<ChangeEmailState, FormData>(
    requestEmailChangeAction,
    null,
  );
  const { clientErrors, onSubmit } = useClientValidation(changeEmailSchema, FIELDS);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? ACCOUNT_MESSAGES.formInvalid : state?.message;
  const success = !clientErrors && state?.ok;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {message ? <Alert tone={success ? "success" : "error"}>{message}</Alert> : null}

      <Field
        id={NEW_EMAIL_ID}
        name="newEmail"
        type="email"
        label="Nouvelle adresse e-mail"
        hint="Un lien de validation y sera envoyé. L’adresse actuelle reste celle du compte jusqu’au clic sur ce lien."
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        required
        defaultValue={state?.values?.newEmail}
        error={fieldErrors.newEmail}
      />
      <Field
        id={PASSWORD_ID}
        name="currentPassword"
        type="password"
        label="Mot de passe actuel"
        autoComplete="current-password"
        required
        error={fieldErrors.currentPassword}
      />

      <SubmitButton icon={Mail} pendingLabel="Envoi en cours…" className="self-start">
        Changer d’adresse
      </SubmitButton>
    </form>
  );
}
