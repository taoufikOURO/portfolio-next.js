"use client";

import { useActionState } from "react";
import { Send, Undo2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { SubmitButton } from "@/components/admin/SubmitButton";

import { setPublicationAction, type ProjectActionState } from "./actions";
import { projectPath } from "./routes";

/**
 * Confirmation du changement de statut (fonctionne sans JavaScript). Le
 * formulaire envoie le statut demandé et `confirmed=1` : c'est le seul
 * endroit de l'administration qui modifie le statut d'un projet.
 */
export function PublicationForm({ project }: { project: { id: string; title: string; isPublished: boolean } }) {
  const [state, formAction] = useActionState<ProjectActionState, FormData>(setPublicationAction, null);
  const publish = !project.isPublished;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <p>
        {publish
          ? `Le projet « ${project.title} » deviendra visible sur le site public.`
          : `Le projet « ${project.title} » ne sera plus visible sur le site public. Il reste enregistré et pourra être publié de nouveau.`}
      </p>
      <input type="hidden" name="id" value={project.id} />
      <input type="hidden" name="publish" value={publish ? "1" : "0"} />
      <input type="hidden" name="confirmed" value="1" />
      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={publish ? Send : Undo2} pendingLabel="Changement en cours…">
          {publish ? "Confirmer la publication" : "Confirmer le retrait de la publication"}
        </SubmitButton>
        <ButtonLink href={projectPath(project.id)} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
