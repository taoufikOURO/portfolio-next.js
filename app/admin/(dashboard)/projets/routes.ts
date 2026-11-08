// Chemins et messages de résultat de la section « Projets ».
// Module pur : importé par les pages, les actions et les composants clients.
//
// `/admin/projets/nouveau` (un projet) et `/admin/stack/nouvelle` (une
// technologie) suivent chacun le genre de leur nom : volontairement différents.

export const PROJECTS_PATH = "/admin/projets";
export const NEW_PROJECT_PATH = `${PROJECTS_PATH}/nouveau`;

export function projectPath(id: string): string {
  return `${PROJECTS_PATH}/${id}`;
}

export function projectPublicationPath(id: string): string {
  return `${PROJECTS_PATH}/${id}/publication`;
}

export function deleteProjectPath(id: string): string {
  return `${PROJECTS_PATH}/${id}/supprimer`;
}

const OLD_IMAGE_WARNING =
  "Attention : l’ancienne image n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";
const DELETED_IMAGE_WARNING =
  "Attention : son image n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";
const GITHUB_WARNING =
  "Attention : le profil GitHub d’au moins un collaborateur n’a pas pu être récupéré. Il est enregistré avec son seul nom d’utilisateur ; voir la section « Collaborateurs » pour relancer la récupération.";

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
export const PROJECT_RESULTS = {
  cree: "Le projet a été créé, non publié, en dernière position.",
  modifie: "Le projet a été enregistré.",
  publie: "Le projet est publié.",
  depublie: "Le projet n’est plus publié.",
  "statut-inchange": "Le statut du projet n’a pas changé : il était déjà dans l’état demandé.",
  supprime: "Le projet a été supprimé, avec ses liens.",
  "collaborateur-recupere": "Le profil GitHub du collaborateur a été récupéré.",
  // Avertissements : l'opération a réussi, mais il reste à vérifier.
  "cree-github": `Le projet a été créé, non publié, en dernière position. ${GITHUB_WARNING}`,
  "modifie-github": `Le projet a été enregistré. ${GITHUB_WARNING}`,
  "modifie-ancienne-image": `Le projet a été enregistré avec sa nouvelle image. ${OLD_IMAGE_WARNING}`,
  "modifie-ancienne-image-github": `Le projet a été enregistré avec sa nouvelle image. ${OLD_IMAGE_WARNING} ${GITHUB_WARNING}`,
  "supprime-image-conservee": `Le projet a été supprimé, avec ses liens. ${DELETED_IMAGE_WARNING}`,
  "collaborateur-echec":
    "Attention : la récupération du profil GitHub a de nouveau échoué. Le collaborateur reste enregistré ; la raison est indiquée dans la section « Collaborateurs ».",
} as const;

export type ProjectResult = keyof typeof PROJECT_RESULTS;

const WARNING_RESULTS: readonly ProjectResult[] = [
  "cree-github",
  "modifie-github",
  "modifie-ancienne-image",
  "modifie-ancienne-image-github",
  "supprime-image-conservee",
  "collaborateur-echec",
  "statut-inchange",
];

export type ProjectResultView = { message: string; tone: "success" | "warning" };

export function projectResultView(value: string | string[] | undefined): ProjectResultView | undefined {
  if (typeof value !== "string" || !Object.hasOwn(PROJECT_RESULTS, value)) return undefined;
  const key = value as ProjectResult;
  return { message: PROJECT_RESULTS[key], tone: WARNING_RESULTS.includes(key) ? "warning" : "success" };
}

/** Résultat d'un enregistrement selon les avertissements (ancienne image restée, échec GitHub). */
export function savedResult(
  kind: "create" | "update",
  warnings: { previousImageKept: boolean; githubFailed: boolean },
): ProjectResult {
  if (kind === "create") return warnings.githubFailed ? "cree-github" : "cree";
  if (warnings.previousImageKept) return warnings.githubFailed ? "modifie-ancienne-image-github" : "modifie-ancienne-image";
  return warnings.githubFailed ? "modifie-github" : "modifie";
}
