import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { MarkdownPreview } from "@/components/admin/MarkdownPreview";
import { ArticleDates } from "@/components/site/Cards";
import { Crosses } from "@/components/site/Crosses";
import { SiteImage } from "@/components/site/SiteImage";
import { getPublicArticle, getPublicArticles } from "@/lib/public/queries";
import { absoluteUrl, openGraphImages } from "@/lib/public/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublicArticles()).map((article) => ({ slug: article.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug);
  if (!article) return { title: "Article introuvable" };
  return {
    title: article.title,
    description: article.description || undefined,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description || undefined,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: (article.updatedAt ?? article.publishedAt).toISOString(),
      authors: article.author ? [article.author] : undefined,
      images: openGraphImages(article.cover, article.title),
    },
  };
}

/** Article publié, dans sa version publiée. Un brouillon (ou un slug inconnu) répond 404. */
export default async function ArticlePage({ params }: Props) {
  const article = await getPublicArticle((await params).slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description || undefined,
    datePublished: article.publishedAt.toISOString(),
    dateModified: (article.updatedAt ?? article.publishedAt).toISOString(),
    author: article.author ? { "@type": "Person", name: article.author } : undefined,
    image: absoluteUrl(article.cover.src),
    mainEntityOfPage: absoluteUrl(`/articles/${article.slug}`),
  };

  return (
    <main id="contenu">
      <article>
        <header className="site-shell pt-8 sm:pt-12">
          <div className="relative px-3 py-8 sm:px-10 sm:py-12">
            <Crosses thirds />
            <Link href="/articles" className="site-reveal relative inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.06em]">
              <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Tous les articles
            </Link>
            {article.category ? <p className="site-eyebrow site-reveal relative mt-6">{article.category}</p> : null}
            <h1
              className="site-wide site-reveal relative mt-3 max-w-5xl text-[clamp(1.9rem,6vw,4.5rem)] leading-[0.95] [overflow-wrap:anywhere]"
              style={{ "--order": 1 } as CSSProperties}
            >
              {article.title}
            </h1>
            <p className="site-reveal relative mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" style={{ "--order": 2 } as CSSProperties}>
              {article.author ? <span>Par {article.author}</span> : null}
              <ArticleDates article={article} />
            </p>
          </div>
        </header>

        <div className="site-shell mt-8 sm:mt-12">
          <div className="site-card-face site-reveal relative aspect-[16/9] w-full" style={{ "--order": 3 } as CSSProperties}>
            <SiteImage image={article.cover} alt="" sizes="(min-width: 1344px) 1280px, 100vw" eager />
          </div>
          {article.description ? <p className="mx-auto mt-10 max-w-3xl text-lg leading-relaxed sm:text-xl">{article.description}</p> : null}
          <MarkdownPreview content={article.content} className="site-prose mx-auto mt-8 max-w-3xl [overflow-wrap:anywhere]" />
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
