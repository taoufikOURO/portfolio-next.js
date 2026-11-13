import "server-only";

import { db } from "@/lib/db";

import { coverToRemoveOnDiscard, nextUpdatedAt } from "./rules";
import { lockAndCheck } from "./shared";

// « Abandonner les modifications » (après confirmation). L'image est
// supprimée du bucket par l'action, après la transaction.

export type DiscardResult =
  | { status: "discarded"; coverToRemove: string | null }
  | { status: "nothing-to-discard" }
  | { status: "conflict" }
  | { status: "not-found" };

/**
 * Abandonne le brouillon d'un article publié (après confirmation) : l'éditeur
 * revient à la version publiée, inchangée. `coverToRemove` : l'image du
 * brouillon, si la version publiée ne l'utilise pas. Un article jamais publié
 * n'a rien à quoi revenir : il se supprime.
 */
export async function discardChanges(
  id: string,
  token: string,
  now: () => Date = () => new Date(),
): Promise<DiscardResult> {
  return db.$transaction(async (tx) => {
    const checked = await lockAndCheck(tx, id, token);
    if (checked.status !== "ok") return checked;
    const { article } = checked;
    const draft = article.draftVersion;
    const published = article.publishedVersion;
    if (!draft || !published) return { status: "nothing-to-discard" } as const;

    await tx.article.update({
      where: { id },
      data: { draftVersionId: null, updatedAt: nextUpdatedAt(article.updatedAt, now()) },
    });
    await tx.articleVersion.delete({ where: { id: draft.id } });
    return {
      status: "discarded",
      coverToRemove: coverToRemoveOnDiscard({ draft: draft.coverImagePath, published: published.coverImagePath }),
    } as const;
  });
}
