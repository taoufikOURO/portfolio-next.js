import type { MetadataRoute } from "next";
import { getAllArticles, getAllProjects } from "./lib/data";
import { siteUrl } from "./lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            changeFrequency: "monthly",
            priority: 1,
        },
        {
            url: `${siteUrl}/projets`,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${siteUrl}/articles`,
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: `${siteUrl}/formations`,
            changeFrequency: "yearly",
            priority: 0.6,
        },
    ];

    const projects: MetadataRoute.Sitemap = getAllProjects().map(
        (project) => ({
            url: `${siteUrl}/projets/${project.slug}`,
            changeFrequency: "monthly",
            priority: 0.8,
        }),
    );

    const articles: MetadataRoute.Sitemap = getAllArticles().map((article) => ({
        url: `${siteUrl}/articles/${article.slug}`,
        lastModified: new Date(article.date),
        changeFrequency: "yearly",
        priority: 0.6,
    }));

    return [...staticRoutes, ...projects, ...articles];
}
