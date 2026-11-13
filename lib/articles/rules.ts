// Règles pures du cycle de vie d'un article (plan §3.2) : statut affiché,
// jeton de version, dates de publication, images de couverture à supprimer,
// slug proposé à la création. Aucun accès à la base : testées seules.

import { slugify, SLUG_MAX_LENGTH } from "@/lib/slug";

/**
 * Statut affiché :
 * - `draft` : jamais publié (la version de travail est un brouillon) ;
 * - `published` : publié, sans modification en attente ;
 * - `pending` : publié, avec un brouillon de modifications (la version en ligne ne change pas).
 */
export type ArticleDisplayStatus = "draft" | "published" | "pending";

export function displayStatusOf(article: { status: "DRAFT" | "PUBLISHED"; draftVersionId: string | null }): ArticleDisplayStatus {
  if (article.status === "DRAFT") return "draft";
  return article.draftVersionId === null ? "published" : "pending";
}

/** Jeton de version envoyé par la page : date de dernière modification de l'article, au format ISO. */
export function versionToken(updatedAt: Date): string {
  return updatedAt.toISOString();
}

/** Le jeton reçu correspond-il à la dernière modification enregistrée ? (sinon : autre onglet, conflit) */
export function isCurrentVersion(updatedAt: Date, token: string): boolean {
  const parsed = Date.parse(token);
  return Number.isFinite(parsed) && parsed === updatedAt.getTime();
}

/**
 * Nouvelle date de modification : l'heure actuelle, mais toujours au moins une
 * milliseconde après la précédente (colonne à la milliseconde) : deux
 * enregistrements successifs ne donnent jamais le même jeton.
 */
export function nextUpdatedAt(previous: Date, now: Date): Date {
  return now.getTime() > previous.getTime() ? now : new Date(previous.getTime() + 1);
}

/**
 * Dates à la publication :
 * - première publication : `publishedAt` fixée maintenant, `lastPublishedAt` vide ;
 * - republication : `publishedAt` inchangée, `lastPublishedAt` (« mis à jour le ») maintenant.
 */
export function publicationDates(
  current: { publishedAt: Date | null },
  now: Date,
): { publishedAt: Date; lastPublishedAt: Date | null; first: boolean } {
  if (current.publishedAt === null) return { publishedAt: now, lastPublishedAt: null, first: true };
  return { publishedAt: current.publishedAt, lastPublishedAt: now, first: false };
}

/**
 * Couverture remplacée pendant l'édition (E55 b) : l'ancienne image de la
 * version de travail est supprimée, sauf si c'est celle de la version publiée
 * (supprimée seulement à la publication).
 */
export function coverToRemoveOnReplace(paths: {
  previous: string | null;
  next: string;
  published: string | null;
}): string | null {
  const { previous, next, published } = paths;
  return previous !== null && previous !== next && previous !== published ? previous : null;
}

/** Publication : l'image de l'ancienne version en ligne est supprimée si la nouvelle version ne l'utilise plus. */
export function coverToRemoveOnPublish(paths: { oldPublished: string | null; newPublished: string | null }): string | null {
  const { oldPublished, newPublished } = paths;
  return oldPublished !== null && oldPublished !== newPublished ? oldPublished : null;
}

/** Abandon : l'image du brouillon est supprimée si la version publiée ne l'utilise pas. */
export function coverToRemoveOnDiscard(paths: { draft: string | null; published: string | null }): string | null {
  const { draft, published } = paths;
  return draft !== null && draft !== published ? draft : null;
}

/** Suppression de l'article : toutes ses images, sans doublon. */
export function coversToRemoveOnDelete(paths: readonly (string | null)[]): string[] {
  return [...new Set(paths.filter((path): path is string => path !== null))];
}

/**
 * Slug proposé à la création : celui du titre, puis `-2`, `-3`… s'il est déjà
 * pris (le suffixe tient dans la longueur maximale). Chaîne vide si le titre
 * ne permet aucun slug.
 */
export function slugCandidate(title: string, attempt: number): string {
  const base = slugify(title);
  if (base === "" || attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
}

/** Contenu d'une version, comparé champ par champ (rien à enregistrer si identique). */
export type VersionFields = {
  title: string;
  slug: string;
  description: string;
  category: string;
  author: string;
  content: string;
};

export function sameContent(a: VersionFields, b: VersionFields): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.description === b.description &&
    a.category === b.category &&
    a.author === b.author &&
    a.content === b.content
  );
}
