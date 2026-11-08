"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";

import { deleteProjectAction, type ProjectActionState } from "./actions";
import { deleteProjectPath } from "./routes";

/** `orphans` : collaborateurs rattachés à ce seul projet, supprimés avec lui (nommés, E54 point 8). */
type ProjectSummary = { id: string; title: string; orphans: string[] };

function Consequences({ title, orphans }: { title: string; orphans: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p>La suppression du projet « {title} » est définitive. Elle supprime aussi ses liens et son image du stockage.</p>
      {orphans.length === 0 ? (
        <p>Aucun collaborateur ne sera supprimé : ceux du projet sont rattachés à d’autres projets, ou il n’en a pas.</p>
      ) : (
        <>
          <p>
            {orphans.length === 1
              ? "Ce collaborateur, rattaché à ce seul projet, sera supprimé aussi :"
              : `Ces ${orphans.length} collaborateurs, rattachés à ce seul projet, seront supprimés aussi :`}
          </p>
          <ul className="list-disc pl-6">
            {orphans.map((label) => (
              <li key={label} className="break-words">
                {label}
              </li>
            ))}
          </ul>
        </>
      )}
      <p>Les technologies et les collaborateurs partagés avec d’autres projets sont conservés.</p>
    </div>
  );
}

/**
 * « Supprimer » dans la liste ou sur la page d'un projet. Sans JavaScript :
 * lien vers la page de confirmation. Avec JavaScript : dialogue de confirmation.
 */
export function DeleteProjectButton({ project, className }: { project: ProjectSummary; className?: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <ButtonLink href={deleteProjectPath(project.id)} variant="secondary" icon={Trash2} className={className}>
        Supprimer<span className="sr-only"> « {project.title} »</span>
      </ButtonLink>
    );
  }

  async function confirm() {
    const data = new FormData();
    data.set("id", project.id);
    const state = await deleteProjectAction(null, data);
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
        Supprimer<span className="sr-only"> « {project.title} »</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        tone="destructive"
        title={`Supprimer le projet « ${project.title} » ?`}
        description={
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Consequences title={project.title} orphans={project.orphans} />
          </div>
        }
        confirmLabel="Supprimer"
        pendingLabel="Suppression en cours…"
      />
    </>
  );
}

/** Page de confirmation (utilisable sans JavaScript). */
export function DeleteProjectForm({ project }: { project: ProjectSummary }) {
  const [state, formAction] = useActionState<ProjectActionState, FormData>(deleteProjectAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <Consequences title={project.title} orphans={project.orphans} />
      <input type="hidden" name="id" value={project.id} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="destructive" pendingLabel="Suppression en cours…">
          Supprimer le projet
        </SubmitButton>
      </div>
    </form>
  );
}
