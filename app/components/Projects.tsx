import { getRecentProjects } from "@/app/lib/data";
import { ArrowUpRight, FolderGit2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Projects() {
    const projects = getRecentProjects(5);

    return (
        <section id="projects" className="section">
            <Reveal className="shell">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="heading section-heading text-3xl">
                        Projets
                    </h2>
                    <Link
                        href="/projets"
                        className="inline-flex items-center gap-1 text-sm font-medium text-(--accent) hover:underline"
                    >
                        Tous les projets
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                </div>

                <div className="mt-8 border-t border-(--line)">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projets/${project.slug}`}
                            className="group flex items-center gap-4 border-b border-(--line) py-4"
                        >
                            <div className="relative hidden h-14 w-20 shrink-0 overflow-hidden rounded border border-(--line) bg-(--surface-2) sm:block">
                                {project.image ? (
                                    <Image
                                        src={project.image}
                                        alt=""
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <FolderGit2
                                            className="h-5 w-5 text-(--line-strong)"
                                            aria-hidden
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold transition-colors group-hover:text-(--accent)">
                                    {project.titre}
                                </h3>
                                <p className="mt-0.5 line-clamp-1 text-sm text-(--muted)">
                                    {project.description}
                                </p>
                            </div>
                            <div className="hidden shrink-0 gap-1.5 md:flex">
                                {project.stack.slice(0, 3).map((technology) => (
                                    <span key={technology.name} className="tag">
                                        {technology.name}
                                    </span>
                                ))}
                            </div>
                            <ArrowUpRight
                                className="h-4 w-4 shrink-0 text-(--muted) transition-colors group-hover:text-(--accent)"
                                aria-hidden
                            />
                        </Link>
                    ))}
                </div>
            </Reveal>
        </section>
    );
}
