"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { SubmitButton } from "@/components/admin/SubmitButton";

import { verifyEmailAction, type VerifyEmailState } from "./actions";

/** Bouton « Valider cette adresse ». En cas de succès, l'action redirige. */
export function VerifyEmailForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState<VerifyEmailState, FormData>(verifyEmailAction, null);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      {state ? <Alert tone="error">{state.message}</Alert> : null}
      <p>
        Adresse à valider : <strong className="break-all">{email}</strong>
      </p>
      <input type="hidden" name="token" defaultValue={token} />
      <SubmitButton icon={MailCheck} pendingLabel="Validation en cours…" className="self-start">
        Valider cette adresse
      </SubmitButton>
    </form>
  );
}
