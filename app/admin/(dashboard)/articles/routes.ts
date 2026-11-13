// Chemins et messages de résultat de la section « Articles ».
// Module pur : importé par les pages, les actions et les composants clients.

export const ARTICLES_PATH = "/admin/articles";
export const NEW_ARTICLE_PATH = `${ARTICLES_PATH}/nouveau`;

export function articlePath(id: string): string {
  return `${ARTICLES_PATH}/${id}`;
}

export function articlePublicationPath(id: string): string {
  return `${ARTICLES_PATH}/${id}/publication`;
}

/** Confirmation de l'abandon des modifications, sans JavaScript (avec JavaScript : dialogue). */
export function discardArticlePath(id: string): string {
  return `${ARTICLES_PATH}/${id}/abandonner`;
}

export function deleteArticlePath(id: string): string {
  return `${ARTICLES_PATH}/${id}/supprimer`;
}

/** Adresse publique d'un article (affichée seulement : le site public est refait en phase 2). */
export function publicArticlePath(slug: string): string {
  return `/articles/${slug}`;
}

const OLD_COVER_WARNING =
  "Attention : l’image de couverture de l’ancienne version n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";
const DRAFT_COVER_WARNING =
  "Attention : l’image de couverture du brouillon n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";
const DELETED_COVER_WARNING =
  "Attention : au moins une image de couverture n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.";

/**
 * Messages affichés après une redirection (`?resultat=…`). Le paramètre ne
 * choisit qu'un message fixe : rien de ce qui est saisi n'est réaffiché.
 */
export const ARTICLE_RESULTS = {
  cree: "L’article a été créé en brouillon. Chaque modification est enregistrée automatiquement ; rien n’est publié sans « Publier » et une confirmation.",
  publie: "L’article est publié. « Publié le » a pris la date du jour et ne changera plus.",
  republie: "La nouvelle version est en ligne. « Mis à jour le » a pris la date du jour ; « Publié le » ne change pas.",
  abandonne: "Les modifications ont été abandonnées : l’éditeur affiche de nouveau la version en ligne, inchangée.",
  supprime: "L’article a été supprimé, avec ses images.",
  // Avertissements : l'opération a réussi, mais il reste à vérifier.
  "publie-ancienne-image": `L’article est publié. ${OLD_COVER_WARNING}`,
  "republie-ancienne-image": `La nouvelle version est en ligne. « Mis à jour le » a pris la date du jour. ${OLD_COVER_WARNING}`,
  "abandonne-image-conservee": `Les modifications ont été abandonnées : l’éditeur affiche de nouveau la version en ligne. ${DRAFT_COVER_WARNING}`,
  "supprime-image-conservee": `L’article a été supprimé. ${DELETED_COVER_WARNING}`,
  "rien-a-publier": "Aucune modification à publier : la version en ligne est déjà à jour.",
  "rien-a-abandonner": "Aucune modification en attente : rien n’a été abandonné.",
  // Erreur : publication refusée, les champs en cause sont indiqués dans l'éditeur (E55 a).
  "publication-incomplete": "L’article ne peut pas être publié : corrigez les champs indiqués.",
} as const;

export type ArticleResult = keyof typeof ARTICLE_RESULTS;

const WARNING_RESULTS: readonly ArticleResult[] = [
  "publie-ancienne-image",
  "republie-ancienne-image",
  "abandonne-image-conservee",
  "supprime-image-conservee",
  "rien-a-publier",
  "rien-a-abandonner",
];

export type ArticleResultView = { key: ArticleResult; message: string; tone: "success" | "warning" | "error" };

export function articleResultView(value: string | string[] | undefined): ArticleResultView | undefined {
  if (typeof value !== "string" || !Object.hasOwn(ARTICLE_RESULTS, value)) return undefined;
  const key = value as ArticleResult;
  const tone = key === "publication-incomplete" ? "error" : WARNING_RESULTS.includes(key) ? "warning" : "success";
  return { key, message: ARTICLE_RESULTS[key], tone };
}

/** Résultat d'une publication selon qu'elle est la première et que l'ancienne image a pu être supprimée. */
export function publishedResult(first: boolean, oldCoverKept: boolean): ArticleResult {
  if (first) return oldCoverKept ? "publie-ancienne-image" : "publie";
  return oldCoverKept ? "republie-ancienne-image" : "republie";
}
