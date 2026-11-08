"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";
import type { SkillUsage } from "@/lib/skills";

import { deleteSkillAction, type DeleteSkillState } from "./actions";
import { deleteSkillPath } from "./routes";

type Skill = { id: string; name: string; educations: SkillUsage[] };

/** Ce que la confirmation annonce : aucune formation, ou la liste de celles qui seront détachées. */
function UsageSummary({ name, educations }: { name: string; educations: SkillUsage[] }) {
  if (educations.length === 0) {
    return (
      <p>
        La compétence « {name} » n’est rattachée à aucune formation. Sa suppression est définitive.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p>
        La compétence « {name} » est utilisée par{" "}
        {educations.length === 1 ? "la formation suivante" : `les ${educations.length} formations suivantes`}. La
        supprimer la détachera de {educations.length === 1 ? "cette formation" : "ces formations"}, qui seront
        conservées :
      </p>
      <ul className="list-disc pl-6">
        {educations.map((education) => (
          <li key={education.id}>{education.title}</li>
        ))}
      </ul>
    </div>
  );
}

function confirmLabel(educations: SkillUsage[]) {
  return educations.length === 0 ? "Supprimer" : "Détacher et supprimer";
}

/** Formulaire confirmé : l'action ne supprime que si les formations liées sont celles affichées. */
function confirmationFormData(id: string, educations: SkillUsage[]): FormData {
  const data = new FormData();
  data.set("id", id);
  data.set("confirmed", "1");
  for (const education of educations) data.append("educationIds", education.id);
  return data;
}

/**
 * « Supprimer » dans la liste ou sur la page d'une compétence. Sans
 * JavaScript : lien vers la page de confirmation. Avec JavaScript : dialogue
 * de confirmation qui liste les formations concernées. Si la liste a changé
 * entre-temps (formation rattachée dans un autre onglet), l'action refuse et
 * le dialogue affiche la nouvelle liste, à confirmer de nouveau.
 */
export function DeleteSkillButton({ skill, className }: { skill: Skill; className?: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [educations, setEducations] = useState(skill.educations);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <ButtonLink href={deleteSkillPath(skill.id)} variant="secondary" icon={Trash2} className={className}>
        Supprimer<span className="sr-only"> « {skill.name} »</span>
      </ButtonLink>
    );
  }

  async function confirm() {
    const state = await deleteSkillAction(null, confirmationFormData(skill.id, educations));
    // En cas de succès, l'action redirige vers la liste.
    if (!state || state.ok) return;
    if (state.educations) setEducations(state.educations);
    setError(state.message);
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={Trash2}
        className={className}
        onClick={() => {
          setEducations(skill.educations);
          setError(null);
          setOpen(true);
        }}
      >
        Supprimer<span className="sr-only"> « {skill.name} »</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        tone="destructive"
        title={`Supprimer la compétence « ${skill.name} » ?`}
        description={
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <UsageSummary name={skill.name} educations={educations} />
          </div>
        }
        confirmLabel={confirmLabel(educations)}
        pendingLabel="Suppression en cours…"
      />
    </>
  );
}

/**
 * Page de confirmation (utilisable sans JavaScript). Après un refus, la liste
 * renvoyée par l'action remplace celle de la page : la confirmation suivante
 * porte sur les formations réellement rattachées.
 */
export function DeleteSkillForm({ skill }: { skill: Skill }) {
  const [state, formAction] = useActionState<DeleteSkillState, FormData>(deleteSkillAction, null);
  const educations = state?.educations ?? skill.educations;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <UsageSummary name={skill.name} educations={educations} />
      <input type="hidden" name="id" value={skill.id} />
      <input type="hidden" name="confirmed" value="1" />
      {educations.map((education) => (
        <input key={education.id} type="hidden" name="educationIds" value={education.id} />
      ))}
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="destructive" pendingLabel="Suppression en cours…">
          {confirmLabel(educations)}
        </SubmitButton>
      </div>
    </form>
  );
}
