import "server-only";

import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { hasErrors, publishBlockers, type PublishField } from "@/lib/validation/article";
import type { FieldErrors } from "@/lib/validation/auth";

import { coverToRemoveOnPublish, nextUpdatedAt, publicationDates } from "./rules";
import { isArticleSlugTaken, lockAndCheck, lockArticleSlugs } from "./shared";

// « Publier », après confirmation (règle 10 de CLAUDE.md, plan §3.2) : seul
// chemin qui change la version en ligne. Le brouillon devient la version
// publiée ; l'ancienne version publiée est supprimée (au plus deux versions,
// pas d'historique).

export type PublishResult =
  | { status: "published"; first: boolean; coverToRemove: string | null }
  | { status: "nothing-to-publish" }
  | { status: "incomplete"; errors: FieldErrors<PublishField> }
  | { status: "duplicate-slug"; slug: string }
  | { status: "conflict" }
  | { status: "not-found" };

/**
 * Publie la version de travail. Tout est contrôlé dans la transaction, sous
 * verrou : jeton de version (la page de confirmation montre ce qui sera
 * publié), champs exigés (E55 a), slug (de nouveau, sous le verrou des slugs ;
 * la contrainte unique de `articles.slug` tranche en dernier recours).
 * Première publication : `publishedAt` fixée ; republication : seule
 * `lastPublishedAt` change. `coverToRemove` : l'image de l'ancienne version en
 * ligne, à supprimer du bucket après la transaction si la nouvelle ne l'utilise plus.
 */
export async function publishArticle(
  id: string,
  token: string,
  now: () => Date = () => new Date(),
): Promise<PublishResult> {
  let draftSlug = "";
  try {
    return await db.$transaction(async (tx) => {
      const checked = await lockAndCheck(tx, id, token);
      if (checked.status !== "ok") return checked;
      const { article } = checked;
      const draft = article.draftVersion;
      if (!draft) return { status: "nothing-to-publish" } as const;
      draftSlug = draft.slug;

      const errors = publishBlockers(draft);
      if (hasErrors(errors)) return { status: "incomplete", errors } as const;

      await lockArticleSlugs(tx);
      if (await isArticleSlugTaken(tx, draft.slug, id)) return { status: "duplicate-slug", slug: draft.slug } as const;

      const moment = now();
      const dates = publicationDates(article, moment);
      const previous = article.publishedVersion;
      await tx.article.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          slug: draft.slug,
          publishedVersionId: draft.id,
          draftVersionId: null,
          publishedAt: dates.publishedAt,
          lastPublishedAt: dates.lastPublishedAt,
          updatedAt: nextUpdatedAt(article.updatedAt, moment),
        },
      });
      if (previous && previous.id !== draft.id) await tx.articleVersion.delete({ where: { id: previous.id } });

      return {
        status: "published",
        first: dates.first,
        coverToRemove: coverToRemoveOnPublish({
          oldPublished: previous?.coverImagePath ?? null,
          newPublished: draft.coverImagePath,
        }),
      } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate-slug", slug: draftSlug };
    throw error;
  }
}
