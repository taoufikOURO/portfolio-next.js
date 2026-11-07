"use client";

import { useActionState } from "react";
import { LogOut } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";

import { revokeOtherSessionsAction, type RevokeSessionsState } from "./actions";

/** « Déconnecter les autres sessions » : toutes sauf celle-ci. */
export function RevokeSessionsForm({ otherSessionCount }: { otherSessionCount: number }) {
  const [state, formAction] = useActionState<RevokeSessionsState, FormData>(
    revokeOtherSessionsAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      {otherSessionCount === 0 ? (
        state ? null : <p>{ACCOUNT_MESSAGES.noOtherSession}</p>
      ) : (
        <SubmitButton
          variant="secondary"
          icon={LogOut}
          pendingLabel="Déconnexion en cours…"
          className="self-start"
        >
          Déconnecter les autres sessions
        </SubmitButton>
      )}
    </form>
  );
}
