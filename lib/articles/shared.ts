import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { isCurrentVersion } from "./rules";

// Éléments communs des modules serveur des articles : sélection, verrous,
// contrôle du jeton de version, slug déjà pris.
//
// Invariant (plan §3.2) : un article a au plus deux versions, la version
// publiée (`publishedVersionId`) et la version de travail (`draftVersionId`).
// Jamais publié : seul le brouillon existe. Publié sans modification en
// attente : seule la version publiée existe ; le premier enregistrement crée
// un brouillon, copie de la version publiée.

export const VERSION_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  category: true,
  author: true,
  content: true,
  coverImagePath: true,
  updatedAt: true,
} satisfies Prisma.ArticleVersionSelect;

export const ARTICLE_SELECT = {
  id: true,
  slug: true,
  status: true,
  publishedVersionId: true,
  draftVersionId: true,
  publishedAt: true,
  lastPublishedAt: true,
  createdAt: true,
  updatedAt: true,
  publishedVersion: { select: VERSION_SELECT },
  draftVersion: { select: VERSION_SELECT },
} satisfies Prisma.ArticleSelect;

export type ArticleVersion = Prisma.ArticleVersionGetPayload<{ select: typeof VERSION_SELECT }>;
export type Article = Prisma.ArticleGetPayload<{ select: typeof ARTICLE_SELECT }>;

/**
 * Version affichée dans l'éditeur : le brouillon s'il existe, sinon la version
 * publiée. `null` seulement si l'invariant est rompu (article sans version).
 */
export function workingVersionOf<V>(article: { draftVersion: V | null; publishedVersion: V | null }): V | null {
  return article.draftVersion ?? article.publishedVersion;
}

/** Ligne de l'article verrouillée jusqu'à la fin de la transaction (enregistrements d'un même article en série). */
export async function lockArticleRow(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
}

/**
 * Verrou consultatif réservé aux slugs des articles (relâché à la fin de la
 * transaction) : deux articles ne peuvent pas prendre le même slug en même
 * temps. Formations : 724011702, stack : 724011703, projets : 724011704.
 * Toujours pris APRÈS le verrou de la ligne de l'article.
 */
export async function lockArticleSlugs(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(724011705)`;
}

type SlugReader = Pick<Prisma.TransactionClient, "article" | "articleVersion">;

/**
 * Slug déjà utilisé par un AUTRE article : comme slug publié, ou dans l'une de
 * ses versions (brouillon compris). `exceptId` : l'article en cours (garder
 * son propre slug est permis). Un slug vide n'est jamais « pris ».
 */
export async function isArticleSlugTaken(client: SlugReader, slug: string, exceptId?: string): Promise<boolean> {
  if (slug === "") return false;
  const published = await client.article.findFirst({
    where: exceptId ? { slug, id: { not: exceptId } } : { slug },
    select: { id: true },
  });
  if (published) return true;
  const version = await client.articleVersion.findFirst({
    where: exceptId ? { slug, articleId: { not: exceptId } } : { slug },
    select: { id: true },
  });
  return version !== null;
}

/** Article verrouillé et relu dans la transaction, avec le contrôle du jeton. */
export async function lockAndCheck(
  tx: Prisma.TransactionClient,
  id: string,
  token: string,
): Promise<{ status: "ok"; article: Article } | { status: "not-found" } | { status: "conflict" }> {
  await lockArticleRow(tx, id);
  const article = await tx.article.findUnique({ where: { id }, select: ARTICLE_SELECT });
  if (!article) return { status: "not-found" };
  if (!isCurrentVersion(article.updatedAt, token)) return { status: "conflict" };
  return { status: "ok", article };
}
