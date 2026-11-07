"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { ACCOUNT_MESSAGES, changePasswordSchema } from "@/lib/validation/auth";

import { changePasswordAction, type ChangePasswordState } from "./actions";

const CURRENT_ID = "compte-mot-de-passe-actuel";
const NEW_ID = "compte-nouveau-mot-de-passe";
const CONFIRMATION_ID = "compte-confirmation";
const FIELDS = [
  ["currentPassword", CURRENT_ID],
  ["newPassword", NEW_ID],
  ["confirmation", CONFIRMATION_ID],
] as const;

/**
 * Changement de mot de passe. `email` sert au champ caché « identifiant »,
 * pour que les gestionnaires de mots de passe associent le nouveau mot de passe
 * au bon compte.
 */
export function PasswordChangeForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(changePasswordAction, null);
  const { clientErrors, onSubmit } = useClientValidation(changePasswordSchema, FIELDS);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? ACCOUNT_MESSAGES.formInvalid : state?.message;
  const success = !clientErrors && state?.ok;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {message ? <Alert tone={success ? "success" : "error"}>{message}</Alert> : null}

      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <Field
        id={CURRENT_ID}
        name="currentPassword"
        type="password"
        label="Mot de passe actuel"
        autoComplete="current-password"
        required
        error={fieldErrors.currentPassword}
      />
      <Field
        id={NEW_ID}
        name="newPassword"
        type="password"
        label="Nouveau mot de passe"
        hint={`${PASSWORD_MIN_LENGTH} caractères au moins, différent du mot de passe actuel.`}
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
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}
