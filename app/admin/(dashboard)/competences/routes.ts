// Chemins et messages de résultat de la section « Compétences ».
// Module pur : importé par les pages, les actions et les composants clients.

export const SKILLS_PATH = "/admin/competences";

export function skillPath(id: string): string {
  return `${SKILLS_PATH}/${id}`;
}

export function deleteSkillPath(id: string): string {
  return `${SKILLS_PATH}/${id}/supprimer`;
}

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
export const SKILL_RESULTS = {
  renommee: "La compétence a été renommée.",
  supprimee: "La compétence a été supprimée.",
  "supprimee-detachee": "La compétence a été supprimée et détachée des formations qui l’utilisaient.",
} as const;

export type SkillResult = keyof typeof SKILL_RESULTS;

export function skillResultMessage(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && Object.hasOwn(SKILL_RESULTS, value)
    ? SKILL_RESULTS[value as SkillResult]
    : undefined;
}
