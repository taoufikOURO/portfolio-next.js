import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { MarkdownPreview } from "@/components/admin/MarkdownPreview";
import { articleCoverUrl, isSlugTaken } from "@/lib/articles/read";
import { versionToken } from "@/lib/articles/rules";
import { requireSession } from "@/lib/auth/require-session";
import { ARTICLE_MESSAGES, duplicateSlugMessage, formatDay, hasErrors, publishBlockers } from "@/lib/validation/article";

import { PublicationForm } from "../../confirm-forms";
import { loadArticleOrNotFound } from "../../load-article";
import { articlePath, publicArticlePath } from "../../routes";

export const metadata: Metadata = {
  title: "Publier un article",
};

/**
 * Confirmation de la publication (fonctionne sans JavaScript) : montre la
 * version qui sera mise en ligne. Champs exigés manquants (E55 a) : retour à
 * l'éditeur, où chaque champ en cause est signalé.
 */
export default async function ArticlePublicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const article = await loadArticleOrNotFound(params);
  const draft = article.draftVersion;

  if (draft && hasErrors(publishBlockers(draft))) redirect(`${articlePath(article.id)}?resultat=publication-incomplete`);
  const slugTaken = draft ? await isSlugTaken(draft.slug, article.id) : false;
  const first = article.publishedAt === null;
  const title = (draft ?? article.publishedVersion)?.title || "Sans titre";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={articlePath(article.id)} className="inline-flex min-h-11 items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir à l’éditeur
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">
          {first ? `Publier « ${title} » ?` : `Publier les modifications de « ${title} » ?`}
        </h1>
      </div>

      {!draft ? (
        <>
          <Alert tone="warning">{ARTICLE_MESSAGES.nothingToPublish}</Alert>
          <div>
            <ButtonLink href={articlePath(article.id)} variant="secondary">
              Revenir à l’éditeur
            </ButtonLink>
          </div>
        </>
      ) : slugTaken ? (
        <>
          <Alert tone="error">{`${duplicateSlugMessage(draft.slug)} Modifiez-le dans l’éditeur avant de publier.`}</Alert>
          <div>
            <ButtonLink href={articlePath(article.id)} variant="secondary">
              Revenir à l’éditeur
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <p>
            {first
              ? `L’article sera visible sur le site public à l’adresse ${publicArticlePath(draft.slug)}. « Publié le » prendra la date du jour et ne changera plus.`
              : `La version ci-dessous remplacera la version en ligne${
                  article.slug && article.slug !== draft.slug
                    ? `, et l’adresse passera de ${publicArticlePath(article.slug)} à ${publicArticlePath(draft.slug)} (les liens vers l’ancienne adresse ne fonctionneront plus)`
                    : ""
                }. « Mis à jour le » prendra la date du jour ; « Publié le » (${formatDay(article.publishedAt!)}) ne change pas.`}
          </p>

          <section aria-labelledby="version-a-publier" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
            <h2 id="version-a-publier" className="text-xl font-bold">
              Version qui sera publiée
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold">Titre</dt>
              <dd className="break-words">{draft.title}</dd>
              <dt className="font-semibold">Adresse</dt>
              <dd className="break-all">{publicArticlePath(draft.slug)}</dd>
              <dt className="font-semibold">Description</dt>
              <dd className="break-words">{draft.description || "Aucune"}</dd>
              <dt className="font-semibold">Catégorie</dt>
              <dd className="break-words">{draft.category || "Aucune"}</dd>
              <dt className="font-semibold">Auteur</dt>
              <dd className="break-words">{draft.author || "Non renseigné"}</dd>
              <dt className="font-semibold">Couverture</dt>
              <dd>
                {draft.coverImagePath ? (
                  <Image
                    src={articleCoverUrl(draft.coverImagePath)}
                    alt="Image de couverture qui sera publiée"
                    width={320}
                    height={180}
                    unoptimized
                    className="h-auto w-full max-w-xs rounded-md border border-slate-blue/25 object-contain"
                  />
                ) : (
                  "Aucune"
                )}
              </dd>
            </dl>
            <h3 className="mt-6 font-semibold">Contenu</h3>
            <div className="mt-2 rounded-md border border-slate-blue p-4">
              <MarkdownPreview content={draft.content} />
            </div>
          </section>

          <PublicationForm article={{ id: article.id, version: versionToken(article.updatedAt), first }} />
        </>
      )}
    </div>
  );
}
