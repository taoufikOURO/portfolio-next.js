import { getAllProjects } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function ProjectsPage() {
    const projects = getAllProjects();
    return (
        <main className="poster-section data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-7xl">
                <Link href="/" className="section-label">
                    Retour accueil
                </Link>
                <div className="mt-12 grid items-end gap-8 md:grid-cols-[1fr_.5fr]">
                    <h1 className="display poster-heading">
                        Le laboratoire
                        <br />
                        <span className="text-[#668b26]">des projets.</span>
                    </h1>
                    <p className="max-w-sm text-lg leading-relaxed text-(--muted)">
                        Une collection de systèmes, d’expériences et de réponses
                        concrètes à des problèmes réels.
                    </p>
                </div>
                <div className="mt-20 grid gap-6 md:grid-cols-2">
                    {projects.map((project, index) => (
                        <Link
                            key={project.id}
                            href={`/projets/${project.slug}`}
                            className="editorial-card group overflow-hidden"
                        >
                            <div className="relative aspect-16/10 overflow-hidden bg-(--blue)">
                                <Image
                                    src={
                                        project.image ||
                                        "/images/projets/default-project.svg"
                                    }
                                    alt={project.titre}
                                    fill
                                    className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                                />
                                <span className="absolute left-4 top-4 bg-(--coral) px-2 py-1 font-mono text-xs text-white">
                                    0{index + 1}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-6">
                                <div>
                                    <h2 className="text-2xl font-bold group-hover:text-[#668b26]">
                                        {project.titre}
                                    </h2>
                                    <p className="mt-2 text-sm text-(--muted)">
                                        {project.stack
                                            .slice(0, 3)
                                            .map((tech) => tech.name)
                                            .join(" · ")}
                                    </p>
                                </div>
                                <span className="text-2xl transition-transform group-hover:translate-x-2">
                                    ↗
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
