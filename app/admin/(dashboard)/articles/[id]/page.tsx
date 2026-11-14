import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ResultAlert } from "@/components/admin/ResultAlert";
import { articleCoverUrl, listCategories } from "@/lib/articles/read";
import { displayStatusOf, versionToken } from "@/lib/articles/rules";
import { workingVersionOf } from "@/lib/articles/shared";
import { requireSession } from "@/lib/auth/require-session";
import { articleValuesOf, EMPTY_ARTICLE_VALUES, publishBlockers } from "@/lib/validation/article";

import { ArticleEditor } from "../article-editor";
import { DeleteArticleButton } from "../delete-article";
import { loadArticleOrNotFound } from "../load-article";
import { ARTICLES_PATH, articleResultView } from "../routes";

export const metadata: Metadata = {
  title: "Modifier un article",
};

/**
 * Éditeur d'un article : version de travail (brouillon, ou version en ligne
 * tant qu'aucune modification n'est en attente), couverture, publication,
 * abandon des modifications et suppression.
 */
export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [article, categories, query] = await Promise.all([loadArticleOrNotFound(params), listCategories(), searchParams]);
  const result = articleResultView(query.resultat);
  const working = workingVersionOf(article);
  const values = working ? articleValuesOf(working) : EMPTY_ARTICLE_VALUES;
  const title = values.title || "Sans titre";
  // Publication refusée (E55 a) : les champs en cause sont signalés sous chaque champ.
  const publishErrors = result?.key === "publication-incomplete" ? publishBlockers(values) : undefined;

  return (
    <div className="flex max-w-7xl flex-col gap-8">
      <div>
        <Link href={ARTICLES_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux articles
        </Link>
        <h1 className="admin-page-title mt-4">Modifier « {title} »</h1>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <ArticleEditor
        article={{
          id: article.id,
          version: versionToken(article.updatedAt),
          displayStatus: displayStatusOf(article),
          publishedAt: article.publishedAt?.toISOString() ?? null,
          lastPublishedAt: article.lastPublishedAt?.toISOString() ?? null,
          publishedSlug: article.slug,
          coverUrl: working?.coverImagePath ? articleCoverUrl(working.coverImagePath) : null,
        }}
        initialValues={values}
        categories={categories}
        publishErrors={publishErrors}
      />

      <section aria-labelledby="article-suppression" className="admin-card">
        <h2 id="article-suppression" className="admin-section-title">
          Supprimer l’article
        </h2>
        <p className="mt-4">La suppression est définitive : version en ligne, brouillon et images de couverture.</p>
        <DeleteArticleButton
          article={{ id: article.id, title, published: article.status === "PUBLISHED" }}
          className="mt-4"
        />
      </section>
    </div>
  );
}
