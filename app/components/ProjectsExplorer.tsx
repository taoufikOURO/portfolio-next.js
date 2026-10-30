"use client";

import { cn } from "@/app/lib/format";
import type { PublishedProject } from "@/app/types/data";
import { FolderGit2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import ProjectCard from "./ProjectCard";

const normalize = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

export default function ProjectsExplorer({
    projects,
}: {
    projects: PublishedProject[];
}) {
    const [query, setQuery] = useState("");
    const [technology, setTechnology] = useState<string | null>(null);

    const technologies = useMemo(
        () =>
            Array.from(
                new Set(
                    projects.flatMap((project) =>
                        project.stack.map((item) => item.name),
                    ),
                ),
            ).sort((a, b) => a.localeCompare(b, "fr")),
        [projects],
    );

    const filteredProjects = useMemo(() => {
        const needle = normalize(query.trim());

        return projects.filter((project) => {
            if (
                technology &&
                !project.stack.some((item) => item.name === technology)
            ) {
                return false;
            }

            if (!needle) return true;

            const haystack = normalize(
                [
                    project.titre,
                    project.description,
                    ...project.stack.map((item) => item.name),
                ].join(" "),
            );

            return haystack.includes(needle);
        });
    }, [projects, query, technology]);

    const isFiltering = Boolean(query.trim()) || Boolean(technology);

    const reset = () => {
        setQuery("");
        setTechnology(null);
    };

    return (
        <div className="mt-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                    <label htmlFor="project-search" className="sr-only">
                        Rechercher un projet
                    </label>
                    <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)"
                        aria-hidden
                    />
                    <input
                        id="project-search"
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher un projet ou une techno…"
                        className="w-full rounded-full border border-(--line) bg-(--surface) py-3 pl-11 pr-11 text-sm outline-none transition-colors focus:border-(--accent)"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Effacer la recherche"
                            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-(--surface-2)"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    )}
                </div>

                <p
                    role="status"
                    aria-live="polite"
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-(--muted)"
                >
                    {filteredProjects.length} projet
                    {filteredProjects.length > 1 ? "s" : ""}
                    {isFiltering ? " correspondant" : ""}
                    {isFiltering && filteredProjects.length > 1 ? "s" : ""}
                </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={() => setTechnology(null)}
                    aria-pressed={technology === null}
                    className={cn(
                        "rounded-full px-3 py-1.5 text-[0.7rem] font-semibold leading-5 transition-colors",
                        technology === null
                            ? "bg-(--ink) text-white"
                            : "bg-(--surface-2) hover:bg-white",
                    )}
                >
                    Toutes
                </button>
                {technologies.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() =>
                            setTechnology((current) =>
                                current === item ? null : item,
                            )
                        }
                        aria-pressed={technology === item}
                        className={cn(
                            "rounded-full px-3 py-1.5 text-[0.7rem] font-semibold leading-5 transition-colors",
                            technology === item
                                ? "bg-(--ink) text-white"
                                : "bg-(--surface-2) hover:bg-white",
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {filteredProjects.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl bg-(--surface) px-6 py-16 text-center">
                    <FolderGit2
                        className="h-8 w-8 text-(--muted)"
                        aria-hidden
                    />
                    <p className="text-sm text-(--muted)">
                        Aucun projet publié pour le moment – revenez plus tard pour de nouvelles réalisations.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        className="btn btn-ghost"
                    >
                        Réinitialiser les filtres
                    </button>
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5">
                    {filteredProjects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
