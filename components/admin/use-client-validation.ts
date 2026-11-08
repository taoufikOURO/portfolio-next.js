"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { z } from "zod";

import { firstFieldErrors, type FieldErrors } from "@/lib/validation/auth";

/**
 * Validation avant envoi avec le même schéma Zod que l'action serveur (qui
 * revalide toujours : sans JavaScript, elle valide seule). En cas d'erreur,
 * l'envoi est annulé et le focus va au premier champ en erreur.
 *
 * `fields` : champs dans l'ordre du formulaire, `[nom, id de l'élément]`.
 * `toInput` (facultatif) : lecture du formulaire partagée avec l'action
 * serveur, pour les champs à valeurs multiples (cases à cocher). Par défaut,
 * une valeur par champ de `fields` (`FormData.get`).
 * `serverErrors` (facultatif) : erreurs de champ renvoyées par l'action. À
 * chaque nouvelle réponse avec des erreurs (doublon, fichier refusé…), le
 * focus va au premier champ en erreur, comme pour une erreur détectée avant
 * l'envoi (sinon il resterait sur le bouton d'envoi).
 */
export function useClientValidation<F extends string>(
  schema: z.ZodType,
  fields: readonly (readonly [F, string])[],
  toInput?: (data: FormData) => unknown,
  serverErrors?: FieldErrors<F>,
) {
  // `null` : pas d'erreur côté client, on affiche celles du serveur.
  const [clientErrors, setClientErrors] = useState<FieldErrors<F> | null>(null);

  useEffect(() => {
    if (!serverErrors) return;
    const first = fields.find(([name, id]) => serverErrors[name] && id);
    if (first) document.getElementById(first[1])?.focus();
    // `fields` est constant pour un formulaire : seule une nouvelle réponse du serveur déclenche le focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const input = toInput ? toInput(data) : Object.fromEntries(fields.map(([name]) => [name, data.get(name)]));
    const result = schema.safeParse(input);
    if (result.success) {
      setClientErrors(null);
      return;
    }
    event.preventDefault();
    const errors = firstFieldErrors<F>(result.error);
    setClientErrors(errors);
    const first = fields.find(([name]) => errors[name]);
    if (first) document.getElementById(first[1])?.focus();
  }

  return { clientErrors, onSubmit };
}
