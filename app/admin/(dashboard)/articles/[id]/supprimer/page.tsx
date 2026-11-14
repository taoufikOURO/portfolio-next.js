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
        <Link href={ARTICLES_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir aux articles
        </Link>
        <h1 className="admin-page-title mt-4">Supprimer l’article « {title} » ?</h1>
      </div>
      <DeleteArticleForm article={{ id: article.id, title, published: article.status === "PUBLISHED" }} />
    </div>
  );
}
