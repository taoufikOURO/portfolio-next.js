import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { formatDay, type PublicArticleSummary, type PublicProject } from "@/lib/public/content";

import { SiteImage } from "./SiteImage";

const GRID_SIZES = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw";

/** Carte d'un projet (liste) : image inclinée au survol, titre, technologies. */
export function ProjectCard({ project, index }: { project: PublicProject; index: number }) {
  const style = { "--order": Math.min(index, 8), "--tilt": `${index % 2 === 0 ? -2 : 2}deg` } as CSSProperties;
  return (
    <li className="site-reveal" style={style}>
      <Link href={`/projets/${project.slug}`} className="group block rounded-[1.25rem]">
        <span className="site-card-face site-lift block aspect-[4/5]">
          <SiteImage image={project.image} alt="" sizes={GRID_SIZES} />
          <span className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-paper">
            <ArrowUpRight aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
        </span>
        <span className="mt-4 block">
          <span className="site-wide block text-lg leading-tight sm:text-xl">{project.title}</span>
          {project.technologies.length > 0 ? (
            <span className="mt-2 block text-sm text-muted">{project.technologies.map((technology) => technology.name).join(" · ")}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

/** Dates d'un article : « Publié le » et, après une republication, « Mis à jour le ». */
export function ArticleDates({ article }: { article: Pick<PublicArticleSummary, "publishedAt" | "updatedAt"> }) {
  return (
    <>
      <span>
        Publié le <time dateTime={article.publishedAt.toISOString()}>{formatDay(article.publishedAt)}</time>
      </span>
      {article.updatedAt ? (
        <span>
          Mis à jour le <time dateTime={article.updatedAt.toISOString()}>{formatDay(article.updatedAt)}</time>
        </span>
      ) : null}
    </>
  );
}

/** Carte d'un article (liste) : couverture, catégorie, titre, dates, description. */
export function ArticleCard({ article, index }: { article: PublicArticleSummary; index: number }) {
  const style = { "--order": Math.min(index, 8), "--tilt": `${index % 2 === 0 ? -1.5 : 1.5}deg` } as CSSProperties;
  return (
    <li className="site-reveal" style={style}>
      <Link href={`/articles/${article.slug}`} className="group grid gap-5 rounded-[1.25rem] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
        <span className="site-card-face site-lift block aspect-[16/10]">
          <SiteImage image={article.cover} alt="" sizes="(min-width: 640px) 40vw, 100vw" />
        </span>
        <span className="block">
          {article.category ? <span className="site-eyebrow block">{article.category}</span> : null}
          <span className="site-wide mt-2 block text-xl leading-tight sm:text-2xl">{article.title}</span>
          <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <ArticleDates article={article} />
          </span>
          {article.description ? <span className="mt-3 block max-w-prose leading-relaxed">{article.description}</span> : null}
        </span>
      </Link>
    </li>
  );
}

/** État vide d'une liste. */
export function EmptyList({ children }: { children: string }) {
  return (
    <p className="site-reveal relative rounded-[1.25rem] border border-dashed border-ink px-6 py-14 text-center font-semibold">{children}</p>
  );
}
