// Chemins et messages de résultat de la section « Stack ».
// Module pur : importé par les pages, les actions et les composants clients.

export const STACK_PATH = "/admin/stack";
export const NEW_TECHNOLOGY_PATH = `${STACK_PATH}/nouvelle`;

export function technologyPath(id: string): string {
  return `${STACK_PATH}/${id}`;
}

export function deleteTechnologyPath(id: string): string {
  return `${STACK_PATH}/${id}/supprimer`;
}

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
const OLD_FILE_WARNING =
  "Attention : l’ancienne icône n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";
const DELETED_FILE_WARNING =
  "Attention : son icône n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";

export const TECHNOLOGY_RESULTS = {
  creee: "La technologie a été ajoutée en dernière position.",
  modifiee: "La technologie a été enregistrée.",
  supprimee: "La technologie a été supprimée.",
  "supprimee-detachee": "La technologie a été supprimée et détachée des projets qui l’utilisaient.",
  // Avertissements (E52) : l'opération a réussi, mais un fichier est resté dans le bucket.
  "modifiee-ancienne-icone": `La technologie a été enregistrée avec sa nouvelle icône. ${OLD_FILE_WARNING}`,
  "supprimee-icone-conservee": `La technologie a été supprimée. ${DELETED_FILE_WARNING}`,
  "supprimee-detachee-icone-conservee": `La technologie a été supprimée et détachée des projets qui l’utilisaient. ${DELETED_FILE_WARNING}`,
} as const;

export type TechnologyResult = keyof typeof TECHNOLOGY_RESULTS;

/** Résultats qui s'affichent comme un avertissement (l'opération a réussi, mais il reste à vérifier). */
const WARNING_RESULTS: readonly TechnologyResult[] = [
  "modifiee-ancienne-icone",
  "supprimee-icone-conservee",
  "supprimee-detachee-icone-conservee",
];

export type TechnologyResultView = { message: string; tone: "success" | "warning" };

export function technologyResultView(value: string | string[] | undefined): TechnologyResultView | undefined {
  if (typeof value !== "string" || !Object.hasOwn(TECHNOLOGY_RESULTS, value)) return undefined;
  const key = value as TechnologyResult;
  return { message: TECHNOLOGY_RESULTS[key], tone: WARNING_RESULTS.includes(key) ? "warning" : "success" };
}
