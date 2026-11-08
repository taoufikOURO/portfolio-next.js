// Chemins et messages de résultat de la section « Formations ».
// Module pur : importé par les pages, les actions et les composants clients.

export const EDUCATIONS_PATH = "/admin/formations";
export const NEW_EDUCATION_PATH = `${EDUCATIONS_PATH}/nouvelle`;

export function educationPath(id: string): string {
  return `${EDUCATIONS_PATH}/${id}`;
}

export function deleteEducationPath(id: string): string {
  return `${EDUCATIONS_PATH}/${id}/supprimer`;
}

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
export const EDUCATION_RESULTS = {
  creee: "La formation a été ajoutée en dernière position.",
  modifiee: "La formation a été enregistrée.",
  supprimee: "La formation a été supprimée. Ses compétences sont conservées.",
} as const;

export type EducationResult = keyof typeof EDUCATION_RESULTS;

export function educationResultMessage(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && Object.hasOwn(EDUCATION_RESULTS, value)
    ? EDUCATION_RESULTS[value as EducationResult]
    : undefined;
}
