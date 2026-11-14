import type { MetadataRoute } from "next";

import { getPublicArticles, getPublicProjects } from "@/lib/public/queries";
import { siteUrl } from "@/lib/public/site";

export const revalidate = 3600;

/** Plan du site : pages fixes, projets publiés et articles publiés (lus depuis la base). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, articles] = await Promise.all([getPublicProjects(), getPublicArticles()]);
  const pages = ["", "/projets", "/articles", "/formations", "/competences", "/profil"].map((path) => ({ url: `${siteUrl}${path}` }));
  return [
    ...pages,
    ...projects.map((project) => ({ url: `${siteUrl}/projets/${project.slug}` })),
    ...articles.map((article) => ({
      url: `${siteUrl}/articles/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt,
    })),
  ];
}
