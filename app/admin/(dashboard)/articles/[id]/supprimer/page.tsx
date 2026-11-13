import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { workingVersionOf } from "@/lib/articles/shared";
import { requireSession } from "@/lib/auth/require-session";

import { DeleteArticleForm } from "../../delete-article";
import { loadArticleOrNotFound } from "../../load-article";
import { ARTICLES_PATH } from "../../routes";

export const metadata: Metadata = {
  title: "Supprimer un article",
};

/** Confirmation de suppression sans JavaScript (avec JavaScript, un dialogue s'ouvre à la place). */
export default async function DeleteArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const article = await loadArticleOrNotFound(params);
  const title = workingVersionOf(article)?.title || "Sans titre";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={ARTICLES_PATH} className="inline-flex min-h-11 items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir aux articles
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Supprimer l’article « {title} » ?</h1>
      </div>
      <DeleteArticleForm article={{ id: article.id, title, published: article.status === "PUBLISHED" }} />
    </div>
  );
}
