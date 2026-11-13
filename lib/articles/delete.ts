import "server-only";

import { db } from "@/lib/db";

import { coversToRemoveOnDelete } from "./rules";
import { lockArticleRow } from "./shared";

// Suppression définitive d'un article (après confirmation), images comprises :
// elles sont supprimées du bucket par l'action, après la transaction.

export type DeleteArticleResult = { status: "deleted"; title: string; covers: string[] } | { status: "not-found" };

/**
 * Suppression définitive (après confirmation) : l'article et ses versions.
 * `covers` : toutes ses images, à supprimer du bucket ensuite. Les liens vers
 * les versions sont retirés avant la suppression des versions, puis l'article.
 */
export async function deleteArticle(id: string): Promise<DeleteArticleResult> {
  return db.$transaction(async (tx) => {
    await lockArticleRow(tx, id);
    const article = await tx.article.findUnique({
      where: { id },
      select: {
        draftVersion: { select: { title: true } },
        publishedVersion: { select: { title: true } },
      },
    });
    if (!article) return { status: "not-found" } as const;
    const versions = await tx.articleVersion.findMany({ where: { articleId: id }, select: { coverImagePath: true } });

    await tx.article.update({ where: { id }, data: { publishedVersionId: null, draftVersionId: null } });
    await tx.articleVersion.deleteMany({ where: { articleId: id } });
    await tx.article.delete({ where: { id } });
    return {
      status: "deleted",
      title: (article.draftVersion ?? article.publishedVersion)?.title ?? "",
      covers: coversToRemoveOnDelete(versions.map((version) => version.coverImagePath)),
    } as const;
  });
}
