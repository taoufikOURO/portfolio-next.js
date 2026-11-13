import "server-only";

import { db } from "@/lib/db";
import type { ArticleContent } from "@/lib/validation/article";

import { coverToRemoveOnReplace, nextUpdatedAt, sameContent, slugCandidate } from "./rules";
import { isArticleSlugTaken, lockAndCheck, lockArticleSlugs, workingVersionOf } from "./shared";

// Création et enregistrement de la version de travail (plan §3.2) : toute
// modification va dans le brouillon, jamais dans la version publiée. Chaque
// écriture vérifie le jeton de version (date de dernière modification connue
// par la page) sous le verrou de la ligne : un enregistrement venu d'un onglet
// qui n'est plus à jour est refusé, et rien n'est écrasé.
//
// Les fichiers sont pilotés par les actions avec `lib/storage/` : ce module
// ne touche que la base et indique quelle image supprimer.

/** Nombre de suffixes essayés (`-2`, `-3`…) pour proposer un slug libre à la création. */
const SLUG_ATTEMPTS = 50;

/**
 * Création d'un article, en brouillon : titre saisi, slug proposé depuis le
 * titre (libre, sinon suffixé ; vide si le titre n'en permet aucun), auteur
 * prérempli, autres champs vides.
 */
export async function createArticle(
  input: { title: string; author: string },
  now: () => Date = () => new Date(),
): Promise<{ id: string; slug: string }> {
  return db.$transaction(async (tx) => {
    await lockArticleSlugs(tx);
    let slug = "";
    for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
      const candidate = slugCandidate(input.title, attempt);
      if (candidate === "" || !(await isArticleSlugTaken(tx, candidate))) {
        slug = candidate;
        break;
      }
    }
    const createdAt = now();
    const article = await tx.article.create({
      data: { status: "DRAFT", createdAt, updatedAt: createdAt },
      select: { id: true },
    });
    const draft = await tx.articleVersion.create({
      data: {
        articleId: article.id,
        title: input.title,
        slug,
        description: "",
        category: "",
        author: input.author,
        content: "",
      },
      select: { id: true },
    });
    await tx.article.update({ where: { id: article.id }, data: { draftVersionId: draft.id, updatedAt: createdAt } });
    return { id: article.id, slug };
  });
}

/** Champs reçus ; `slug: null` : le slug saisi est refusé (non conforme), celui du brouillon est gardé. */
export type DraftFields = Omit<ArticleContent, "slug"> & { slug: string | null };

export type SaveDraftResult =
  | {
      /** `unchanged` : rien de différent de la version de travail, rien n'est écrit (jeton inchangé). */
      status: "saved" | "unchanged";
      version: Date;
      /** La version de travail est un brouillon (jamais publié, ou modifications en attente). */
      isDraft: boolean;
      /** Le slug saisi est déjà pris par un autre article : celui du brouillon est gardé. */
      slugTaken: boolean;
      /** Slug enregistré dans la version de travail. */
      savedSlug: string;
    }
  | { status: "conflict" }
  | { status: "not-found" };

/**
 * Enregistre la version de travail. Article publié sans brouillon : le
 * brouillon est créé (copie de la version publiée, image comprise) ; la
 * version publiée n'est jamais modifiée. Un slug déjà pris par un autre
 * article (publié ou en brouillon) est refusé, les autres champs sont
 * enregistrés.
 */
export async function saveDraft(
  id: string,
  token: string,
  fields: DraftFields,
  now: () => Date = () => new Date(),
): Promise<SaveDraftResult> {
  return db.$transaction(async (tx) => {
    const checked = await lockAndCheck(tx, id, token);
    if (checked.status !== "ok") return checked;
    const { article } = checked;
    const working = workingVersionOf(article);
    if (!working) return { status: "not-found" } as const;

    let slug = fields.slug ?? working.slug;
    let slugTaken = false;
    if (slug !== working.slug && slug !== "") {
      await lockArticleSlugs(tx);
      if (await isArticleSlugTaken(tx, slug, id)) {
        slug = working.slug;
        slugTaken = true;
      }
    }

    const next = {
      title: fields.title,
      slug,
      description: fields.description,
      category: fields.category,
      author: fields.author,
      content: fields.content,
    };
    if (sameContent(next, working)) {
      return {
        status: "unchanged",
        version: article.updatedAt,
        isDraft: article.draftVersion !== null,
        slugTaken,
        savedSlug: slug,
      } as const;
    }

    const updatedAt = nextUpdatedAt(article.updatedAt, now());
    if (article.draftVersion) {
      await tx.articleVersion.update({ where: { id: article.draftVersion.id }, data: next });
      await tx.article.update({ where: { id }, data: { updatedAt } });
    } else {
      const draft = await tx.articleVersion.create({
        data: { articleId: id, ...next, coverImagePath: working.coverImagePath },
        select: { id: true },
      });
      await tx.article.update({ where: { id }, data: { draftVersionId: draft.id, updatedAt } });
    }
    return { status: "saved", version: updatedAt, isDraft: true, slugTaken, savedSlug: slug } as const;
  });
}

export type SaveCoverResult =
  | { status: "saved"; version: Date; toRemove: string | null }
  | { status: "conflict" }
  | { status: "not-found" };

/**
 * Enregistre le chemin d'une image de couverture (déjà envoyée) dans la
 * version de travail (E55 b). Article publié sans brouillon : le brouillon est
 * créé. `toRemove` : l'ancienne image du brouillon, à supprimer du bucket
 * après la transaction, sauf si c'est celle de la version publiée.
 */
export async function saveCover(
  id: string,
  token: string,
  path: string,
  now: () => Date = () => new Date(),
): Promise<SaveCoverResult> {
  return db.$transaction(async (tx) => {
    const checked = await lockAndCheck(tx, id, token);
    if (checked.status !== "ok") return checked;
    const { article } = checked;
    const working = workingVersionOf(article);
    if (!working) return { status: "not-found" } as const;

    const updatedAt = nextUpdatedAt(article.updatedAt, now());
    if (article.draftVersion) {
      await tx.articleVersion.update({ where: { id: article.draftVersion.id }, data: { coverImagePath: path } });
      await tx.article.update({ where: { id }, data: { updatedAt } });
    } else {
      const { title, slug, description, category, author, content } = working;
      const draft = await tx.articleVersion.create({
        data: { articleId: id, title, slug, description, category, author, content, coverImagePath: path },
        select: { id: true },
      });
      await tx.article.update({ where: { id }, data: { draftVersionId: draft.id, updatedAt } });
    }
    const toRemove = coverToRemoveOnReplace({
      previous: working.coverImagePath,
      next: path,
      published: article.publishedVersion?.coverImagePath ?? null,
    });
    return { status: "saved", version: updatedAt, toRemove } as const;
  });
}
