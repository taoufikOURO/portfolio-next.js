"use client";

import { useActionState, useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import {
  LOGIN_MESSAGES,
  loginFieldErrors,
  loginSchema,
  type LoginFieldErrors,
  type LoginFormState,
} from "@/lib/validation/auth";

import { login } from "./actions";

const EMAIL_ID = "connexion-email";
const PASSWORD_ID = "connexion-mot-de-passe";

/**
 * Formulaire de connexion. Le schéma est vérifié une première fois ici (même
 * schéma que l'action) ; sans JavaScript, l'action fait seule la validation.
 */
export function LoginForm() {
  const [state, formAction] = useActionState<LoginFormState, FormData>(login, null);
  // Erreurs trouvées avant l'envoi ; `null` : on affiche celles du serveur.
  const [clientErrors, setClientErrors] = useState<LoginFieldErrors | null>(null);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? LOGIN_MESSAGES.formInvalid : state?.message;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
    });
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    const errors = loginFieldErrors(result.error);
    setClientErrors(errors);
    document.getElementById(errors.email ? EMAIL_ID : PASSWORD_ID)?.focus();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {message ? <Alert tone="error">{message}</Alert> : null}

      <Field
        id={EMAIL_ID}
        name="email"
        type="email"
        label="Adresse e-mail"
        autoComplete="username"
        inputMode="email"
        spellCheck={false}
        required
        defaultValue={state?.values.email}
        error={fieldErrors.email}
      />
      <Field
        id={PASSWORD_ID}
        name="password"
        type="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />

      <SubmitButton icon={LogIn} pendingLabel="Connexion en cours…" className="self-start">
        Se connecter
      </SubmitButton>
    </form>
  );
}
