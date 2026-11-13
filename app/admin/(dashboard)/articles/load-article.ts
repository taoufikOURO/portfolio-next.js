import "server-only";

import { notFound } from "next/navigation";

import { getArticle } from "@/lib/articles/read";
import type { Article } from "@/lib/articles/shared";
import { articleIdField } from "@/lib/validation/article";

/** Article de l'URL, ou 404 (identifiant mal formé refusé avant toute requête). */
export async function loadArticleOrNotFound(params: Promise<{ id: string }>): Promise<Article> {
  const parsed = articleIdField.safeParse((await params).id);
  if (!parsed.success) notFound();
  const article = await getArticle(parsed.data);
  if (!article) notFound();
  return article;
}
