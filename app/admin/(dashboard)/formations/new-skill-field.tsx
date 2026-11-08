"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { useHydrated } from "@/components/admin/use-hydrated";
import { firstFieldErrors } from "@/lib/validation/auth";
import { SKILL_NAME_MAX_LENGTH, skillSchema } from "@/lib/validation/skill";

import { createSkillFromEducationAction } from "./actions";

export const NEW_SKILL_FIELD_ID = "formation-nouvelle-competence";

/**
 * « Nouvelle compétence » sous les cases à cocher d'une formation.
 * - Sans JavaScript : la compétence saisie est créée et cochée à
 *   l'enregistrement de la formation (même transaction).
 * - Avec JavaScript : « Créer et cocher » (ou Entrée dans le champ) la crée
 *   tout de suite, sans quitter la page ni perdre la saisie ; elle est ajoutée
 *   à la liste, cochée, et le champ est vidé pour en saisir une autre.
 * Doublon : rien n'est créé (même règle que la section « Compétences »).
 */
export function NewSkillField({
  defaultValue,
  error,
  onCreated,
}: {
  defaultValue?: string;
  /** Erreur de la validation du formulaire (client ou serveur). */
  error?: string;
  onCreated: (skill: { id: string; name: string }) => void;
}) {
  const hydrated = useHydrated();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function create() {
    const input = inputRef.current;
    if (!input || pending) return;
    setStatus("");
    const parsed = skillSchema.safeParse({ name: input.value });
    if (!parsed.success) {
      setInlineError(firstFieldErrors<"name">(parsed.error).name ?? null);
      input.focus();
      return;
    }
    setPending(true);
    try {
      const result = await createSkillFromEducationAction(parsed.data.name);
      if (!result.ok) {
        setInlineError(result.message);
        input.focus();
        return;
      }
      setInlineError(null);
      onCreated(result.skill);
      input.value = "";
      setStatus(result.message);
      input.focus();
    } catch {
      setInlineError("La compétence n’a pas pu être créée. Réessayez dans quelques instants.");
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Avec JavaScript, Entrée crée la compétence au lieu d'envoyer toute la formation.
    if (event.key === "Enter" && hydrated) {
      event.preventDefault();
      void create();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        ref={inputRef}
        id={NEW_SKILL_FIELD_ID}
        name="newSkill"
        label="Nouvelle compétence (facultative)"
        hint={
          hydrated
            ? `Absente de la liste ? Saisissez son nom puis « Créer et cocher » : elle est créée tout de suite. ${SKILL_NAME_MAX_LENGTH} caractères au plus.`
            : `Absente de la liste ? Saisissez son nom : elle sera créée et cochée à l’enregistrement de la formation. ${SKILL_NAME_MAX_LENGTH} caractères au plus.`
        }
        autoComplete="off"
        defaultValue={defaultValue}
        onKeyDown={onKeyDown}
        onInput={() => setInlineError(null)}
        error={inlineError ?? error}
        className="max-w-xl"
      />
      {hydrated ? (
        <Button
          variant="secondary"
          icon={Plus}
          className="self-start"
          aria-disabled={pending || undefined}
          onClick={() => void create()}
        >
          {pending ? "Création en cours…" : "Créer et cocher"}
        </Button>
      ) : null}
      <p role="status" className="text-sm">
        {status}
      </p>
    </div>
  );
}
