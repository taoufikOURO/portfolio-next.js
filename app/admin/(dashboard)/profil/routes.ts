// Chemin et messages de résultat de la section « Profil ».
// Module pur : importé par la page, les actions et les composants clients.

export const PROFILE_PATH = "/admin/profil";

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
const OLD_FILE_WARNING =
  "Attention : l’ancien fichier n’a pas pu être supprimé du stockage et y reste. Il n’est plus utilisé et pourra être supprimé à la main.";

export const PROFILE_RESULTS = {
  enregistre: "Le profil a été enregistré.",
  photo: "La photo a été enregistrée.",
  "photo-ancienne": `La photo a été enregistrée. ${OLD_FILE_WARNING}`,
  detouree: "La photo détourée a été enregistrée.",
  "detouree-ancienne": `La photo détourée a été enregistrée. ${OLD_FILE_WARNING}`,
  "cv-inchange": "Le CV n’a pas changé.",
  "cv-lien": "Le lien du CV a été enregistré.",
  "cv-lien-ancien": `Le lien du CV a été enregistré ; le PDF précédent n’est plus proposé. ${OLD_FILE_WARNING}`,
  "cv-pdf": "Le PDF du CV a été enregistré.",
  "cv-pdf-ancien": `Le PDF du CV a été enregistré. ${OLD_FILE_WARNING}`,
  "cv-supprime": "Le CV a été supprimé.",
  "cv-supprime-ancien": `Le CV a été supprimé. ${OLD_FILE_WARNING}`,
} as const;

export type ProfileResult = keyof typeof PROFILE_RESULTS;

/** Résultats qui s'affichent comme un avertissement (l'opération a réussi, mais il reste à vérifier). */
const WARNING_RESULTS: readonly ProfileResult[] = [
  "photo-ancienne",
  "detouree-ancienne",
  "cv-lien-ancien",
  "cv-pdf-ancien",
  "cv-supprime-ancien",
];

export type ProfileResultView = { message: string; tone: "success" | "warning" };

export function profileResultView(value: string | string[] | undefined): ProfileResultView | undefined {
  if (typeof value !== "string" || !Object.hasOwn(PROFILE_RESULTS, value)) return undefined;
  const key = value as ProfileResult;
  return { message: PROFILE_RESULTS[key], tone: WARNING_RESULTS.includes(key) ? "warning" : "success" };
}
