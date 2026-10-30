import type {
    FaqItem,
    Formation,
    Profile,
    Project,
    PublishedProject,
    Service,
    Technology,
} from "@/app/types/data";
import articlesData from "@/data/articles.json";
import faqData from "@/data/faq.json";
import formationsData from "@/data/formations.json";
import profileData from "@/data/profile.json";
import projectsData from "@/data/projets.json";
import servicesData from "@/data/services.json";
import stackData from "@/data/stack.json";
import { cache } from "react";

export interface Article {
    id: string;
    titre: string;
    description: string;
    auteur: string;
    date: string;
    slug: string;
    mdFile: string;
    categorie: string;
    image?: string;
}

export type { PublishedProject };

export interface AdjacentItems<T> {
    previous: T | undefined;
    next: T | undefined;
}

const normalize = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

export function slugify(value: string): string {
    return normalize(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export const getProfile = cache((): Profile => profileData as Profile);

export const getAllTechnologies = cache(
    (): Technology[] => stackData as Technology[],
);

export const getServices = cache((): Service[] => servicesData as Service[]);

export const getFaq = cache((): FaqItem[] => faqData as FaqItem[]);

export const getAllProjects = cache((): PublishedProject[] =>
    (projectsData as Project[])
        .filter((project) => project.estPublie)
        .map((project) => ({
            ...project,
            slug: project.slug ? slugify(project.slug) : slugify(project.titre),
        })),
);

export function getRecentProjects(limit: number = 3): PublishedProject[] {
    return getAllProjects().slice(0, limit);
}

export const getProjectBySlug = cache(
    (slug: string): PublishedProject | undefined =>
        getAllProjects().find((project) => project.slug === slug),
);

export function getAdjacentProjects(
    slug: string,
): AdjacentItems<PublishedProject> {
    const projects = getAllProjects();
    const index = projects.findIndex((project) => project.slug === slug);

    if (index === -1 || projects.length < 2) {
        return { previous: undefined, next: undefined };
    }

    return {
        previous:
            projects[(index - 1 + projects.length) % projects.length],
        next: projects[(index + 1) % projects.length],
    };
}

export const getAllFormations = cache(
    (): Formation[] => formationsData as Formation[],
);

export const getAllArticles = cache((): Article[] =>
    [...(articlesData as Article[])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
);

export function getRecentArticles(limit: number = 6): Article[] {
    return getAllArticles().slice(0, limit);
}

export const getArticleBySlug = cache(
    (slug: string): Article | undefined =>
        getAllArticles().find((article) => article.slug === slug),
);

export function getAdjacentArticles(slug: string): AdjacentItems<Article> {
    const articles = getAllArticles();
    const index = articles.findIndex((article) => article.slug === slug);

    if (index === -1) {
        return { previous: undefined, next: undefined };
    }

    return {
        previous: articles[index - 1],
        next: articles[index + 1],
    };
}
