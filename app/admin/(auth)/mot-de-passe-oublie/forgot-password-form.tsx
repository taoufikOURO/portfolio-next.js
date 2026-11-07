"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { ACCOUNT_MESSAGES, forgotPasswordSchema } from "@/lib/validation/auth";

import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const EMAIL_ID = "oubli-email";
const FIELDS = [["email", EMAIL_ID]] as const;

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    null,
  );
  const { clientErrors, onSubmit } = useClientValidation(forgotPasswordSchema, FIELDS);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? ACCOUNT_MESSAGES.formInvalid : state?.message;
  const success = !clientErrors && state?.ok;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {message ? <Alert tone={success ? "success" : "error"}>{message}</Alert> : null}

      <Field
        id={EMAIL_ID}
        name="email"
        type="email"
        label="Adresse e-mail"
        autoComplete="username"
        inputMode="email"
        spellCheck={false}
        required
        defaultValue={state?.values?.email}
        error={fieldErrors.email}
      />

      <SubmitButton icon={Send} pendingLabel="Envoi en cours…" className="self-start">
        Recevoir un lien
      </SubmitButton>
    </form>
  );
}
