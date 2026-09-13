import { getRecentProjects } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function Projects() {
    const projects = getRecentProjects(6);
    return (
        <section
            id="projets"
            className="poster-section bg-(--paper) px-6 py-24 md:px-12 md:py-36 lg:px-20"
        >
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                    <div>
                        <span className="poster-kicker">
                            04 / Études de cas
                        </span>
                        <h2 className="display poster-heading mt-7">
                            Des idées
                            <br />
                            <span className="text-[#668b26]">
                                mises à l’épreuve.
                            </span>
                        </h2>
                    </div>
                    <Link
                        href="/projets"
                        className="outline-button self-start md:self-end"
                    >
                        Tout voir ↗
                    </Link>
                </div>
                <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project, index) => (
                        <Link
                            key={project.id}
                            href={`/projets/${project.slug}`}
                            className={`editorial-card group overflow-hidden ${index === 0 ? "md:col-span-2" : ""}`}
                        >
                            <div
                                className={`relative overflow-hidden bg-(--blue) ${index === 0 ? "aspect-2/1" : "aspect-4/3"}`}
                            >
                                <Image
                                    src={
                                        project.image ||
                                        "/images/projets/default-project.svg"
                                    }
                                    alt={project.titre}
                                    fill
                                    className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                                />
                                <span className="absolute left-4 top-4 bg-(--lime) px-2 py-1 font-mono text-[10px]">
                                    CASE_{String(index + 1).padStart(2, "0")}
                                </span>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <h3 className="text-2xl font-bold group-hover:text-[#668b26]">
                                        {project.titre}
                                    </h3>
                                    <span className="text-xl transition-transform group-hover:translate-x-1">
                                        ↗
                                    </span>
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-(--muted)">
                                    {project.description}
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {project.stack.slice(0, 3).map((tech) => (
                                        <span
                                            key={tech.name}
                                            className="font-mono text-[10px] text-(--coral)"
                                        >
                                            #{tech.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
