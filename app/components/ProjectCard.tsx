import type { Project } from "@/app/types/data";
import { ArrowUpRight, FolderGit2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ProjectCard({ project }: { project: Project }) {
    return (
        <Link
            href={`/projets/${project.slug}`}
            className="group relative block aspect-4/3 overflow-hidden rounded-3xl bg-(--surface-2) group-hover:-translate-y-0.5 group-hover:shadow-[0_4px_12px_rgba(9,7,8,0.15)]"
        >
            {project.image ? (
                <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
            ) : (
                <div className="relative flex h-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#ec2712,#f5765b_55%,#6358a4)]">
                    <span className="heading text-[9rem] leading-none text-white/25">
                        {project.titre.charAt(0)}
                    </span>
                    <FolderGit2
                        className="absolute left-5 top-5 h-7 w-7 text-white/70"
                        aria-hidden
                    />
                </div>
            )}

            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/5 to-transparent" />

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 md:inset-x-5 md:bottom-5">
                <span className="line-clamp-1 rounded-full bg-(--surface) px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.03em] text-(--ink) md:text-xs">
                    {project.titre}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--surface) text-(--ink) transition-colors group-hover:bg-(--ink) group-hover:text-white md:h-10 md:w-10">
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
            </div>
        </Link>
    );
}
