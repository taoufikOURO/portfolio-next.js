"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { ACCOUNT_MESSAGES, resetPasswordSchema } from "@/lib/validation/auth";

import { resetPasswordAction, type ResetPasswordState } from "./actions";

const TOKEN_ID = "reinitialiser-jeton";
const NEW_PASSWORD_ID = "reinitialiser-mot-de-passe";
const CONFIRMATION_ID = "reinitialiser-confirmation";
const FIELDS = [
  ["token", TOKEN_ID],
  ["newPassword", NEW_PASSWORD_ID],
  ["confirmation", CONFIRMATION_ID],
] as const;

/** Nouveau mot de passe. En cas de succès, l'action redirige vers la connexion. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, null);
  const { clientErrors, onSubmit } = useClientValidation(resetPasswordSchema, FIELDS);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors
    ? fieldErrors.token
      ? ACCOUNT_MESSAGES.tokenInvalid
      : ACCOUNT_MESSAGES.formInvalid
    : state?.message;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {message ? <Alert tone="error">{message}</Alert> : null}

      <input type="hidden" id={TOKEN_ID} name="token" defaultValue={token} />
      <Field
        id={NEW_PASSWORD_ID}
        name="newPassword"
        type="password"
        label="Nouveau mot de passe"
        hint={`${PASSWORD_MIN_LENGTH} caractères au moins.`}
        autoComplete="new-password"
        required
        error={fieldErrors.newPassword}
      />
      <Field
        id={CONFIRMATION_ID}
        name="confirmation"
        type="password"
        label="Confirmer le nouveau mot de passe"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmation}
      />

      <SubmitButton icon={KeyRound} className="self-start">
        Enregistrer le mot de passe
      </SubmitButton>
    </form>
  );
}
