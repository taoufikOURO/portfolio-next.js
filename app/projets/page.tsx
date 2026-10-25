import { getAllProjects } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";
import { HorizontalSlideItem, Reveal, Stagger } from "../components/Motion";

export default function ProjectsPage() {
    const projects = getAllProjects();
    return (
        <main className="poster-section data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-7xl">
                <Reveal>
                    <Link href="/" className="section-label">
                        Retour accueil
                    </Link>
                </Reveal>
                <Reveal delay={0.08} className="mt-12 grid items-end gap-8 md:grid-cols-[1fr_.5fr]">
                    <h1 className="display poster-heading">
                        Le laboratoire
                        <br />
                        <span className="text-[#668b26]">des projets.</span>
                    </h1>
                    <p className="max-w-sm text-lg leading-relaxed text-(--muted)">
                        Une collection de systèmes, d’expériences et de réponses
                        concrètes à des problèmes réels.
                    </p>
                </Reveal>
                <Stagger className="mt-20 grid gap-6 md:grid-cols-2">
                    {projects.map((project, index) => (
                        <HorizontalSlideItem
                            key={project.id}
                            className="editorial-card group overflow-hidden"
                        >
                            <Link href={`/projets/${project.slug}`}>
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
                                </div>
                            </Link>
                        </HorizontalSlideItem>
                    ))}
                </Stagger>
            </div>
        </main>
    );
}
