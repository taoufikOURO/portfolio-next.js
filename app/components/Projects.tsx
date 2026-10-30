import { getRecentProjects } from "@/app/lib/data";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import ProjectCard from "./ProjectCard";
import Reveal from "./Reveal";

export default function Projects() {
    const projects = getRecentProjects(4);

    return (
        <section id="projets" className="section">
            <div className="shell">
                <div className="relative overflow-hidden">
                    <span className="ghost-text absolute -top-4 left-0">
                        Portfolio
                    </span>
                    <div className="relative flex flex-wrap items-center justify-between gap-4 pt-8 sm:pt-14">
                        <span className="label label-dot">
                            Derniers projets
                        </span>
                        <Link href="/projets" className="pill pill-dark">
                            Tous les projets
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 md:gap-5">
                    {projects.map((project, index) => (
                        <Reveal key={project.id} delay={index * 0.08}>
                            <ProjectCard project={project} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
