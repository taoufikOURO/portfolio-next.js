"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";

import { deleteEducationAction, type DeleteEducationState } from "./actions";
import { deleteEducationPath } from "./routes";

type EducationSummary = { id: string; title: string; skillCount: number };

function Consequences({ education }: { education: EducationSummary }) {
  return (
    <p>
      La formation « {education.title} » sera supprimée définitivement.
      {education.skillCount === 1 ? " Elle sera détachée de sa compétence, qui est conservée." : null}
      {education.skillCount > 1
        ? ` Elle sera détachée de ses ${education.skillCount} compétences, qui sont conservées.`
        : null}
    </p>
  );
}

/**
 * « Supprimer » une formation. Sans JavaScript : lien vers la page de
 * confirmation. Avec JavaScript : dialogue de confirmation.
 */
export function DeleteEducationButton({ education, className }: { education: EducationSummary; className?: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <ButtonLink href={deleteEducationPath(education.id)} variant="secondary" icon={Trash2} className={className}>
        Supprimer<span className="sr-only"> « {education.title} »</span>
      </ButtonLink>
    );
  }

  async function confirm() {
    const data = new FormData();
    data.set("id", education.id);
    const state = await deleteEducationAction(null, data);
    // En cas de succès, l'action redirige vers la liste.
    if (state && !state.ok) setError(state.message);
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={Trash2}
        className={className}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Supprimer<span className="sr-only"> « {education.title} »</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        tone="destructive"
        title={`Supprimer la formation « ${education.title} » ?`}
        description={
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Consequences education={education} />
          </div>
        }
        confirmLabel="Supprimer"
        pendingLabel="Suppression en cours…"
      />
    </>
  );
}

/** Page de confirmation (utilisable sans JavaScript). */
export function DeleteEducationForm({ education }: { education: EducationSummary }) {
  const [state, formAction] = useActionState<DeleteEducationState, FormData>(deleteEducationAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <Consequences education={education} />
      <input type="hidden" name="id" value={education.id} />
      <SubmitButton variant="destructive" pendingLabel="Suppression en cours…" className="self-start">
        Supprimer
      </SubmitButton>
    </form>
  );
}
