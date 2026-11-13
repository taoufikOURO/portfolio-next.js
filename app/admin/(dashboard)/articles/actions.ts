"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createArticle, saveCover, saveDraft } from "@/lib/articles/autosave";
import { deleteArticle } from "@/lib/articles/delete";
import { discardChanges } from "@/lib/articles/discard";
import { publishArticle } from "@/lib/articles/publish";
import { articleCoverUrl, defaultAuthor, getArticle } from "@/lib/articles/read";
import { isCurrentVersion, versionToken } from "@/lib/articles/rules";
import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import type { BucketKey } from "@/lib/storage/rules";
import { removeFile } from "@/lib/storage/remove";
import { uploadFile } from "@/lib/storage/upload";
import {
  ARTICLE_MESSAGES,
  articleDraftInputFromFormData,
  articleDraftSchema,
  articleValuesFromFormData,
  confirmedVersionInputFromFormData,
  confirmedVersionSchema,
  coverInputFromFormData,
  coverSchema,
  createArticleSchema,
  deleteArticleSchema,
  duplicateSlugMessage,
  savedAtMessage,
  slugKeptMessage,
  slugProblem,
  type ArticleDraftState,
  type ArticleField,
  type CoverState,
  type CreateArticleState,
} from "@/lib/validation/article";
import { firstFieldErrors, type ActionState, type FieldErrors } from "@/lib/validation/auth";

import { ARTICLES_PATH, articlePath, publishedResult, type ArticleResult } from "./routes";

// Actions de la section « Articles ». Toutes commencent par `requireSession()`
// (E46) et valident leurs entrées avant tout accès à la base ou au stockage.
//
// L'enregistrement de la version de travail et l'envoi de la couverture
// n'appellent pas `revalidatePath` : les pages de l'admin sont dynamiques
// (rien en cache), et une revalidation ferait re-rendre la page pendant la
// frappe (E56). Création, publication, abandon et suppression redirigent.

export type ArticleActionState = ActionState<never>;

const BUCKET: BucketKey = "articles";

function revalidateSection() {
  revalidatePath(ARTICLES_PATH, "layout");
}

/** Supprime une image du bucket ; `false` si le stockage l'a refusé (journalisé). */
async function removeCover(path: string, context: string): Promise<boolean> {
  try {
    return await removeFile(BUCKET, path);
  } catch (caught) {
    logUnexpectedError(context, caught);
    return false;
  }
}

/** Création, en brouillon : seul le titre est demandé, puis l'éditeur s'ouvre. */
export async function createArticleAction(
  _previous: CreateArticleState,
  formData: FormData,
): Promise<CreateArticleState> {
  await requireSession();

  const rawTitle = formData.get("title");
  const values = { title: typeof rawTitle === "string" ? rawTitle.slice(0, 400) : "" };
  const parsed = createArticleSchema.safeParse({ title: rawTitle });
  if (!parsed.success) {
    return { ok: false, message: ARTICLE_MESSAGES.formInvalid, fieldErrors: firstFieldErrors<"title">(parsed.error), values };
  }

  let id: string;
  try {
    ({ id } = await createArticle({ title: parsed.data.title, author: await defaultAuthor() }));
  } catch (caught) {
    logUnexpectedError("Création d'un article", caught);
    return { ok: false, message: ARTICLE_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSection();
  redirect(`${articlePath(id)}?resultat=cree`);
}

/**
 * Enregistrement de la version de travail : autosave (appel direct depuis
 * l'éditeur) ou bouton « Enregistrer le brouillon » (sans JavaScript). Jamais
 * la version publiée. Le jeton de version est contrôlé sous verrou : en cas de
 * conflit, rien n'est écrit. Un slug non conforme ou déjà pris est refusé
 * (message sous le champ), les autres champs sont enregistrés.
 */
export async function saveDraftAction(_previous: ArticleDraftState, formData: FormData): Promise<ArticleDraftState> {
  await requireSession();

  const values = articleValuesFromFormData(formData);
  const parsed = articleDraftSchema.safeParse(articleDraftInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<ArticleField | "id" | "version">(parsed.error);
    if (errors.id) return { ok: false, status: "not-found", message: ARTICLE_MESSAGES.notFound, fieldErrors: {}, values };
    if (errors.version) {
      return { ok: false, status: "invalid", message: ARTICLE_MESSAGES.versionInvalid, fieldErrors: {}, values };
    }
    const fieldErrors = Object.fromEntries(
      Object.entries(errors).filter(([field]) => field !== "id" && field !== "version"),
    ) as FieldErrors<ArticleField>;
    return { ok: false, status: "invalid", message: ARTICLE_MESSAGES.formInvalid, fieldErrors, values };
  }
  const { id, version, ...fields } = parsed.data;
  const slugError = slugProblem(fields.slug);

  try {
    const result = await saveDraft(id, version, { ...fields, slug: slugError ? null : fields.slug });
    if (result.status === "conflict") {
      return { ok: false, status: "conflict", message: ARTICLE_MESSAGES.conflict, fieldErrors: {}, values };
    }
    if (result.status === "not-found") {
      return { ok: false, status: "not-found", message: ARTICLE_MESSAGES.notFound, fieldErrors: {}, values };
    }
    const slugMessage = slugError ?? (result.slugTaken ? duplicateSlugMessage(fields.slug) : undefined);
    const saved =
      result.status === "unchanged"
        ? "Aucune modification à enregistrer : le brouillon était déjà à jour."
        : `${savedAtMessage(result.version)}.`;
    return {
      ok: true,
      status: result.status,
      message: slugMessage ? `${saved} ${slugKeptMessage(result.savedSlug)}` : saved,
      fieldErrors: slugMessage ? { slug: slugMessage } : {},
      values,
      version: versionToken(result.version),
      savedAt: result.version.toISOString(),
      isDraft: result.isDraft,
    };
  } catch (caught) {
    logUnexpectedError("Enregistrement du brouillon d'un article", caught);
    return { ok: false, status: "error", message: ARTICLE_MESSAGES.autosaveFailed, fieldErrors: {}, values };
  }
}

/**
 * Image de couverture, envoyée dès qu'elle est choisie, dans son propre
 * formulaire (E55 b) : envoi dans le bucket des articles, chemin enregistré
 * dans la version de travail, puis suppression de l'ancienne image du
 * brouillon si la version publiée ne l'utilise pas. Le jeton est contrôlé
 * avant l'envoi et de nouveau dans la transaction ; en cas de refus, l'image
 * envoyée est supprimée.
 */
export async function saveCoverAction(_previous: CoverState, formData: FormData): Promise<CoverState> {
  await requireSession();

  const parsed = coverSchema.safeParse(coverInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<"id" | "version" | "file">(parsed.error);
    if (errors.id) return { ok: false, tone: "error", message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
    if (errors.version) return { ok: false, tone: "error", message: ARTICLE_MESSAGES.versionInvalid, fieldErrors: {} };
    return { ok: false, tone: "error", message: ARTICLE_MESSAGES.formInvalid, fieldErrors: { file: errors.file } };
  }
  const { id, version, file } = parsed.data;

  try {
    const current = await getArticle(id);
    if (!current) return { ok: false, tone: "error", message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
    if (!isCurrentVersion(current.updatedAt, version)) {
      return { ok: false, tone: "error", message: ARTICLE_MESSAGES.coverConflict, fieldErrors: {}, conflict: true };
    }

    const uploaded = await uploadFile({ bucket: BUCKET, kind: "image", file });
    if (!uploaded.ok) {
      return { ok: false, tone: "error", message: ARTICLE_MESSAGES.formInvalid, fieldErrors: { file: uploaded.error } };
    }

    let saved: Awaited<ReturnType<typeof saveCover>>;
    try {
      saved = await saveCover(id, version, uploaded.path);
    } catch (caught) {
      await removeCover(uploaded.path, "Suppression d'une couverture non enregistrée");
      throw caught;
    }
    if (saved.status !== "saved") {
      await removeCover(uploaded.path, "Suppression d'une couverture non enregistrée");
      return saved.status === "conflict"
        ? { ok: false, tone: "error", message: ARTICLE_MESSAGES.coverConflict, fieldErrors: {}, conflict: true }
        : { ok: false, tone: "error", message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
    }

    const previousRemoved =
      saved.toRemove === null ? true : await removeCover(saved.toRemove, "Suppression de l'ancienne couverture");
    const published = current.status === "PUBLISHED";
    const message = published
      ? "L’image de couverture est enregistrée dans le brouillon. La version en ligne garde la sienne jusqu’à la publication."
      : "L’image de couverture est enregistrée.";
    return {
      ok: true,
      tone: previousRemoved ? "success" : "warning",
      message: previousRemoved
        ? message
        : `${message} Attention : l’image précédente n’a pas pu être supprimée du stockage et y reste. Elle n’est plus utilisée et pourra être supprimée à la main.`,
      fieldErrors: {},
      version: versionToken(saved.version),
      coverUrl: articleCoverUrl(uploaded.path),
    };
  } catch (caught) {
    logUnexpectedError("Enregistrement de la couverture d'un article", caught);
    return { ok: false, tone: "error", message: ARTICLE_MESSAGES.unexpected, fieldErrors: {} };
  }
}

/**
 * « Publier », envoyé par la page de confirmation (`/publication`) avec
 * `confirmed=1` et le jeton de la version affichée : seul chemin qui met une
 * version en ligne (règle 10 de CLAUDE.md).
 */
export async function publishArticleAction(
  _previous: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  await requireSession();

  const parsed = confirmedVersionSchema.safeParse(confirmedVersionInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<"id" | "version" | "confirmed">(parsed.error);
    return {
      ok: false,
      message: errors.id ? ARTICLE_MESSAGES.notFound : ARTICLE_MESSAGES.publicationInvalid,
      fieldErrors: {},
    };
  }
  const { id, version } = parsed.data;

  let result: ArticleResult;
  try {
    const outcome = await publishArticle(id, version);
    switch (outcome.status) {
      case "not-found":
        return { ok: false, message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
      case "conflict":
        return { ok: false, message: ARTICLE_MESSAGES.publicationConflict, fieldErrors: {} };
      case "duplicate-slug":
        return {
          ok: false,
          message: `${duplicateSlugMessage(outcome.slug)} Modifiez-le dans l’éditeur avant de publier. Rien n’a été publié.`,
          fieldErrors: {},
        };
      case "incomplete":
        result = "publication-incomplete";
        break;
      case "nothing-to-publish":
        result = "rien-a-publier";
        break;
      case "published": {
        const removed =
          outcome.coverToRemove === null
            ? true
            : await removeCover(outcome.coverToRemove, "Suppression de la couverture de l'ancienne version");
        result = publishedResult(outcome.first, !removed);
        break;
      }
    }
  } catch (caught) {
    logUnexpectedError("Publication d'un article", caught);
    return { ok: false, message: ARTICLE_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSection();
  redirect(`${articlePath(id)}?resultat=${result}`);
}

/**
 * « Abandonner les modifications », après confirmation (dialogue ou page
 * `/abandonner`) : le brouillon d'un article publié est supprimé, l'éditeur
 * revient à la version en ligne.
 */
export async function discardChangesAction(
  _previous: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  await requireSession();

  const parsed = confirmedVersionSchema.safeParse(confirmedVersionInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<"id" | "version" | "confirmed">(parsed.error);
    return { ok: false, message: errors.id ? ARTICLE_MESSAGES.notFound : ARTICLE_MESSAGES.discardInvalid, fieldErrors: {} };
  }
  const { id, version } = parsed.data;

  let result: ArticleResult;
  try {
    const outcome = await discardChanges(id, version);
    if (outcome.status === "not-found") return { ok: false, message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
    if (outcome.status === "conflict") return { ok: false, message: ARTICLE_MESSAGES.discardConflict, fieldErrors: {} };
    if (outcome.status === "nothing-to-discard") {
      result = "rien-a-abandonner";
    } else {
      const removed =
        outcome.coverToRemove === null
          ? true
          : await removeCover(outcome.coverToRemove, "Suppression de la couverture d'un brouillon abandonné");
      result = removed ? "abandonne" : "abandonne-image-conservee";
    }
  } catch (caught) {
    logUnexpectedError("Abandon des modifications d'un article", caught);
    return { ok: false, message: ARTICLE_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSection();
  redirect(`${articlePath(id)}?resultat=${result}`);
}

/** Suppression définitive, après confirmation (dialogue ou page `/supprimer`), images comprises. */
export async function deleteArticleAction(
  _previous: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  await requireSession();

  const parsed = deleteArticleSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };

  let result: ArticleResult;
  try {
    const outcome = await deleteArticle(parsed.data.id);
    if (outcome.status === "not-found") return { ok: false, message: ARTICLE_MESSAGES.notFound, fieldErrors: {} };
    let allRemoved = true;
    for (const cover of outcome.covers) {
      if (!(await removeCover(cover, "Suppression de la couverture d'un article supprimé"))) allRemoved = false;
    }
    result = allRemoved ? "supprime" : "supprime-image-conservee";
  } catch (caught) {
    logUnexpectedError("Suppression d'un article", caught);
    return { ok: false, message: ARTICLE_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSection();
  redirect(`${ARTICLES_PATH}?resultat=${result}`);
}
