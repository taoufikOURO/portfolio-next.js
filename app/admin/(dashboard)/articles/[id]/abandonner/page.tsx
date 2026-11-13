import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { versionToken } from "@/lib/articles/rules";
import { requireSession } from "@/lib/auth/require-session";
import { ARTICLE_MESSAGES } from "@/lib/validation/article";

import { DiscardForm } from "../../confirm-forms";
import { loadArticleOrNotFound } from "../../load-article";
import { articlePath } from "../../routes";

export const metadata: Metadata = {
  title: "Abandonner les modifications",
};

/** Confirmation de l'abandon des modifications sans JavaScript (avec JavaScript, un dialogue s'ouvre à la place). */
export default async function DiscardChangesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const article = await loadArticleOrNotFound(params);
  const canDiscard = article.draftVersion !== null && article.publishedVersion !== null;
  const title = (article.publishedVersion ?? article.draftVersion)?.title || "Sans titre";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={articlePath(article.id)} className="inline-flex items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir à l’éditeur
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Abandonner les modifications de « {title} » ?</h1>
      </div>
      {canDiscard ? (
        <>
          <p>
            Le brouillon est supprimé définitivement, avec son image de couverture si elle n’est pas celle de la version
            en ligne. L’éditeur affichera de nouveau la version en ligne, qui ne change pas.
          </p>
          <DiscardForm article={{ id: article.id, version: versionToken(article.updatedAt) }} />
        </>
      ) : (
        <>
          <Alert tone="warning">{ARTICLE_MESSAGES.nothingToDiscard}</Alert>
          <div>
            <ButtonLink href={articlePath(article.id)} variant="secondary">
              Revenir à l’éditeur
            </ButtonLink>
          </div>
        </>
      )}
    </div>
  );
}
