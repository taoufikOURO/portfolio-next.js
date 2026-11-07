"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";

import { firstFieldErrors, type FieldErrors } from "@/lib/validation/auth";

/**
 * Validation avant envoi avec le même schéma Zod que l'action serveur (qui
 * revalide toujours : sans JavaScript, elle valide seule). En cas d'erreur,
 * l'envoi est annulé et le focus va au premier champ en erreur.
 *
 * `fields` : champs dans l'ordre du formulaire, `[nom, id de l'élément]`.
 */
export function useClientValidation<F extends string>(
  schema: z.ZodType,
  fields: readonly (readonly [F, string])[],
) {
  // `null` : pas d'erreur côté client, on affiche celles du serveur.
  const [clientErrors, setClientErrors] = useState<FieldErrors<F> | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.map(([name]) => [name, data.get(name)]));
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
