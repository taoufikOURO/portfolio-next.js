import { MAX_FILE_MB } from "./file-rules";

/**
 * Garde-fou avant l'envoi d'un formulaire qui contient un fichier (E52).
 *
 * Next.js refuse le corps d'une Server Action de plus de 1 Mo et fait planter
 * la page (« Body exceeded 1 MB limit »). Le contrôle de `FileField` porte sur
 * le fichier seul : un fichier juste sous 1 Mo, une fois ajoutés l'enveloppe
 * multipart et les autres champs, peut quand même dépasser. Ce contrôle
 * estime le corps complet AVANT l'envoi, pour afficher un message au lieu de
 * faire planter la page. `next.config.ts` n'est pas modifié.
 *
 * Il se branche dans le `onSubmit` du formulaire, jamais en enveloppant
 * l'action : l'action doit rester une vraie Server Action pour que le
 * formulaire fonctionne sans JavaScript.
 */

/** Limite du corps d'une Server Action de Next.js (valeur par défaut, 1 Mo). */
export const SERVER_ACTION_BODY_LIMIT_BYTES = 1024 * 1024;

/** Marge pour l'enveloppe multipart, les champs cachés de React et les en-têtes de chaque champ. */
const ENVELOPE_MARGIN_BYTES = 4 * 1024;

/** Taille estimée (par excès) du corps d'un formulaire : fichiers + texte (3 octets par caractère au plus) + marge. */
export function estimateBodyBytes(data: FormData): number {
  let total = ENVELOPE_MARGIN_BYTES;
  for (const [, value] of data.entries()) {
    total += typeof value === "string" ? value.length * 3 : value.size;
  }
  return total;
}

export function exceedsBodyLimit(data: FormData): boolean {
  return estimateBodyBytes(data) > SERVER_ACTION_BODY_LIMIT_BYTES;
}

/** Message affiché sous le champ fichier quand le formulaire est trop lourd pour être envoyé. */
export const BODY_TOO_LARGE_MESSAGE = `Le fichier est trop lourd pour être envoyé avec le formulaire (${MAX_FILE_MB} Mo au maximum, formulaire compris). Choisissez un fichier plus léger.`;
