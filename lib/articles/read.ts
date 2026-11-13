import "server-only";

import { db } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { getStorageContext, publicUrlFor } from "@/lib/storage/client";

import { ARTICLE_SELECT, isArticleSlugTaken, type Article } from "./shared";

// Lectures des articles (liste, éditeur, suggestions). Aucune écriture.

/** Articles, les plus récemment modifiés d'abord. */
export async function listArticles(): Promise<Article[]> {
  return db.article.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: ARTICLE_SELECT });
}

export async function getArticle(id: string): Promise<Article | null> {
  return db.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
}

/** Slug déjà utilisé par un autre article, publié ou en brouillon. */
export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  return isArticleSlugTaken(db, slug, exceptId);
}

/**
 * Suggestions de catégorie : catégories déjà utilisées (versions publiées et
 * brouillons), sans doublon (casse comprise : la première écriture trouvée
 * est gardée), dans l'ordre alphabétique.
 */
export async function listCategories(): Promise<string[]> {
  const rows = await db.articleVersion.findMany({
    where: { category: { not: "" } },
    select: { category: true },
    orderBy: [{ category: "asc" }],
  });
  const byKey = new Map<string, string>();
  for (const { category } of rows) {
    const key = category.toLocaleLowerCase("fr-FR");
    if (!byKey.has(key)) byKey.set(key, category);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "fr-FR"));
}

/** Auteur proposé à la création : prénom et nom du profil (chaîne vide si le profil n'est pas rempli). */
export async function defaultAuthor(): Promise<string> {
  const profile = await getProfile();
  return `${profile.firstName} ${profile.lastName}`.trim();
}

/** URL publique d'une image de couverture, calculée à l'affichage à partir du chemin enregistré (E11). */
export function articleCoverUrl(path: string): string {
  return publicUrlFor(getStorageContext().config, "articles", path);
}
