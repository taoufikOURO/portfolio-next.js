import type { Profile, Project, Technology } from "@/app/types/data";
import profileData from "@/data/profile.json";
import projectsData from "@/data/projets.json";
import stackData from "@/data/stack.json";

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
