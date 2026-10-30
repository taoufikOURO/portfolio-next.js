import PageHeader from "@/app/components/PageHeader";
import ProjectsExplorer from "@/app/components/ProjectsExplorer";
import { getAllProjects } from "@/app/lib/data";
import { siteName } from "@/app/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: `Projets | ${siteName}`,
    description:
        "Une sélection de projets data, machine learning, data engineering et applications web.",
    alternates: {
        canonical: "/projets",
    },
};

export default function ProjectsPage() {
    const projects = getAllProjects();

    return (
        <main id="contenu" className="shell pb-16 pt-24 md:pt-28">
            <PageHeader
                title="Projets"
                description="Une sélection de projets data, machine learning, data engineering et applications web."
            />
            <ProjectsExplorer projects={projects} />
        </main>
    );
}
