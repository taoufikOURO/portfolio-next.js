import type { Formation, Profile, Project, Technology } from "@/app/types/data";
import articlesData from "@/data/articles.json";
import formationsData from "@/data/formations.json";
import profileData from "@/data/profile.json";
import projectsData from "@/data/projets.json";
import stackData from "@/data/stack.json";

export interface Article {
    id: string;
    titre: string;
    description: string;
    auteur: string;
    date: string;
    slug: string;
    categorie: string;
    image?: string;
}

export function getProfile(): Profile {
    return profileData as Profile;
}

export function getAllTechnologies(): Technology[] {
    return stackData as Technology[];
}

export function getAllProjects(): Project[] {
    return (projectsData as Project[])
        .filter((p) => p.estPublie)
        .map((p) => ({
            ...p,
            slug:
                p.slug ||
                p.titre
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, ""),
        }));
}

export function getRecentProjects(limit: number = 3): Project[] {
    return getAllProjects().slice(0, limit);
}

export function getProjectBySlug(slug: string): Project | undefined {
    const projects = getAllProjects();
    const projet = projects.find((p) => p.slug === slug);
    return projet;
}

export function getAllFormations(): Formation[] {
    return formationsData as Formation[];
}

export function getAllArticles(): Article[] {
    return (articlesData as Article[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function getRecentArticles(limit: number = 6): Article[] {
    return getAllArticles().slice(0, limit);
}

export function getArticleBySlug(slug: string): Article | undefined {
    const articles = getAllArticles();
    return articles.find((a) => a.slug === slug);
}
