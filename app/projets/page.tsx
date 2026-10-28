import ProjectCard from "@/app/components/ProjectCard";
import { getAllProjects } from "@/app/lib/data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectsPage() {
    const projects = getAllProjects();

    return (
        <main className="shell py-10 md:py-16">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Retour
            </Link>

            <div className="mt-8 max-w-2xl">
                <h1 className="heading text-3xl sm:text-4xl">Projets</h1>
                <p className="mt-3 text-base leading-relaxed text-(--muted)">
                    Une sélection de projets data, machine learning et
                    applications web.
                </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        </main>
    );
}
