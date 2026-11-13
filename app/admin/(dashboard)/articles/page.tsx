import type { Metadata } from "next";
import { FileText, Pencil, Plus } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { listArticles } from "@/lib/articles/read";
import { displayStatusOf } from "@/lib/articles/rules";
import { workingVersionOf } from "@/lib/articles/shared";
import { requireSession } from "@/lib/auth/require-session";
import { formatDayTime } from "@/lib/validation/article";

import { ArticleStatus } from "./article-status";
import { DeleteArticleButton } from "./delete-article";
import { articlePath, articleResultView, NEW_ARTICLE_PATH } from "./routes";

export const metadata: Metadata = {
  title: "Articles",
};

/** Liste des articles, les plus récemment modifiés d'abord. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [articles, params] = await Promise.all([listArticles(), searchParams]);
  const result = articleResultView(params.resultat);

  const rows = articles.map((article) => {
    const working = workingVersionOf(article);
    return {
      id: article.id,
      title: working?.title || "Sans titre",
      slug: working?.slug ?? "",
      status: displayStatusOf(article),
      updatedAt: article.updatedAt,
      published: article.status === "PUBLISHED",
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">Articles</h1>
          <p className="mt-2">
            Les plus récemment modifiés d’abord. Chaque modification est enregistrée automatiquement dans un brouillon ;
            un article n’est mis en ligne que par « Publier », après une confirmation.
          </p>
        </div>
        <ButtonLink href={NEW_ARTICLE_PATH} icon={Plus}>
          Écrire un article
        </ButtonLink>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <DataTable
        caption={`Articles, les plus récemment modifiés d’abord (${rows.length})`}
        rows={rows}
        getRowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={FileText}
            title="Aucun article"
            description="Écrivez un premier article : il sera enregistré en brouillon pendant la frappe."
          >
            <ButtonLink href={NEW_ARTICLE_PATH} icon={Plus}>
              Écrire un article
            </ButtonLink>
          </EmptyState>
        }
        columns={[
          {
            key: "article",
            header: "Article",
            isRowHeader: true,
            cell: (row) => (
              // Sous 768 px, le statut passe sous le titre (la colonne « Statut » est masquée) : « Modifier » et « Supprimer » restent entiers à 390 px.
              <span className="flex flex-col gap-1">
                {/* `anywhere` (et non `break-words`) : un titre sans espace ne fixe plus la largeur minimale du tableau. */}
                <span className="font-semibold [overflow-wrap:anywhere]">{row.title}</span>
                {row.slug ? <span className="text-sm break-all">/{row.slug}</span> : <span className="text-sm">Sans slug</span>}
                <span className="mt-1 md:hidden">
                  <ArticleStatus status={row.status} />
                </span>
              </span>
            ),
          },
          {
            key: "status",
            header: "Statut",
            hideBelow: "md",
            cell: (row) => <ArticleStatus status={row.status} />,
          },
          {
            key: "updatedAt",
            header: "Dernière modification",
            hideBelow: "lg",
            cell: (row) => <span>{formatDayTime(row.updatedAt)}</span>,
          },
          {
            key: "actions",
            header: "Actions",
            cell: (row) => (
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={articlePath(row.id)} variant="secondary" icon={Pencil}>
                  Modifier<span className="sr-only"> « {row.title} »</span>
                </ButtonLink>
                <DeleteArticleButton article={{ id: row.id, title: row.title, published: row.published }} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
