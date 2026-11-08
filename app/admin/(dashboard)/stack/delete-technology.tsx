"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";
import type { TechnologyUsage } from "@/lib/technologies";

import { deleteTechnologyAction, type DeleteTechnologyState } from "./actions";
import { deleteTechnologyPath } from "./routes";

type TechnologySummary = { id: string; name: string; projects: TechnologyUsage[] };

/** Ce que la confirmation annonce : aucun projet, ou la liste de ceux dont la technologie sera détachée. */
function UsageSummary({ name, projects }: { name: string; projects: TechnologyUsage[] }) {
  if (projects.length === 0) {
    return <p>La technologie « {name} » n’est utilisée par aucun projet. Sa suppression est définitive.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p>
        La technologie « {name} » est utilisée par{" "}
        {projects.length === 1 ? "le projet suivant" : `les ${projects.length} projets suivants`}. La supprimer la
        détachera de {projects.length === 1 ? "ce projet" : "ces projets"}, qui {projects.length === 1 ? "sera conservé" : "seront conservés"} :
      </p>
      <ul className="list-disc pl-6">
        {projects.map((project) => (
          <li key={project.id}>{project.title}</li>
        ))}
      </ul>
    </div>
  );
}

function confirmLabel(projects: TechnologyUsage[]) {
  return projects.length === 0 ? "Supprimer" : "Détacher et supprimer";
}

/** Formulaire confirmé : l'action ne supprime que si les projets liés sont ceux affichés. */
function confirmationFormData(id: string, projects: TechnologyUsage[]): FormData {
  const data = new FormData();
  data.set("id", id);
  data.set("confirmed", "1");
  for (const project of projects) data.append("projectIds", project.id);
  return data;
}

/**
 * « Supprimer » dans la liste ou sur la page d'une technologie. Sans
 * JavaScript : lien vers la page de confirmation. Avec JavaScript : dialogue
 * de confirmation qui liste les projets concernés. Si la liste a changé
 * entre-temps (projet rattaché dans un autre onglet), l'action refuse et le
 * dialogue affiche la nouvelle liste, à confirmer de nouveau.
 */
export function DeleteTechnologyButton({ technology, className }: { technology: TechnologySummary; className?: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState(technology.projects);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <ButtonLink href={deleteTechnologyPath(technology.id)} variant="secondary" icon={Trash2} className={className}>
        Supprimer<span className="sr-only"> « {technology.name} »</span>
      </ButtonLink>
    );
  }

  async function confirm() {
    const state = await deleteTechnologyAction(null, confirmationFormData(technology.id, projects));
    // En cas de succès, l'action redirige vers la liste.
    if (!state || state.ok) return;
    if (state.projects) setProjects(state.projects);
    setError(state.message);
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={Trash2}
        className={className}
        onClick={() => {
          setProjects(technology.projects);
          setError(null);
          setOpen(true);
        }}
      >
        Supprimer<span className="sr-only"> « {technology.name} »</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        tone="destructive"
        title={`Supprimer la technologie « ${technology.name} » ?`}
        description={
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <UsageSummary name={technology.name} projects={projects} />
          </div>
        }
        confirmLabel={confirmLabel(projects)}
        pendingLabel="Suppression en cours…"
      />
    </>
  );
}

/**
 * Page de confirmation (utilisable sans JavaScript). Après un refus, la liste
 * renvoyée par l'action remplace celle de la page : la confirmation suivante
 * porte sur les projets réellement rattachés.
 */
export function DeleteTechnologyForm({ technology }: { technology: TechnologySummary }) {
  const [state, formAction] = useActionState<DeleteTechnologyState, FormData>(deleteTechnologyAction, null);
  const projects = state?.projects ?? technology.projects;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <UsageSummary name={technology.name} projects={projects} />
      <input type="hidden" name="id" value={technology.id} />
      <input type="hidden" name="confirmed" value="1" />
      {projects.map((project) => (
        <input key={project.id} type="hidden" name="projectIds" value={project.id} />
      ))}
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="destructive" pendingLabel="Suppression en cours…">
          {confirmLabel(projects)}
        </SubmitButton>
      </div>
    </form>
  );
}
