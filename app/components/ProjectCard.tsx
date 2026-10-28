import type { Project } from "@/app/types/data";
import { ArrowUpRight, FolderGit2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ProjectCard({ project }: { project: Project }) {
    return (
        <Link
            href={`/projets/${project.slug}`}
            className="card group flex flex-col overflow-hidden"
        >
            <div className="media-frame aspect-16/10 border-b border-(--line)">
                {project.image ? (
                    <Image
                        src={project.image}
                        alt={project.titre}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-(--surface-2)">
                        <FolderGit2
                            className="h-9 w-9 text-(--line-strong)"
                            aria-hidden
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold leading-snug transition-colors group-hover:text-(--accent)">
                        {project.titre}
                    </h3>
                    <ArrowUpRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-(--muted) transition-colors group-hover:text-(--accent)"
                        aria-hidden
                    />
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-(--muted)">
                    {project.description}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {project.stack.map((technology) => (
                        <span key={technology.name} className="tag">
                            {technology.name}
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
}
