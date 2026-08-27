import { getAllProjects, getProjectBySlug } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    return getAllProjects().map((project) => ({ slug: project.slug }));
}
export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const project = getProjectBySlug(slug);
    if (!project) notFound();
    return (
        <main className="data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-7xl">
                <Link href="/projets" className="section-label">
                    Tous les projets
                </Link>
                <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_.42fr]">
                    <div>
                        <p className="eyebrow">CASE STUDY / {project.id}</p>
                        <h1 className="display mt-6 text-6xl leading-none md:text-9xl">
                            {project.titre}
                        </h1>
                        <p className="mt-8 max-w-2xl text-xl leading-relaxed text-(--muted)">
                            {project.description}
                        </p>
                        <div className="mt-10 flex flex-wrap gap-3">
                            {project.lien && (
                                <a
                                    href={project.lien}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="lime-button"
                                >
                                    Voir le projet ↗
                                </a>
                            )}
                            {project.github && (
                                <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="outline-button"
                                >
                                    Code source ↗
                                </a>
                            )}
                        </div>
                    </div>
                    <aside className="border-t border-(--ink) pt-5">
                        <p className="font-mono text-xs text-(--muted)">
                            OUTILKIT
                        </p>
                        <div className="mt-5 space-y-3">
                            {project.stack.map((tech) => (
                                <div
                                    key={tech.name}
                                    className="flex items-center gap-3 border-b border-(--line) pb-3 font-bold"
                                >
                                    <span className="text-(--coral)">#</span>
                                    {tech.name}
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
                <div className="data-card mt-20 overflow-hidden p-3">
                    <div className="relative aspect-16/8 overflow-hidden bg-(--blue)">
                        <Image
                            src={
                                project.image ||
                                "/images/projets/default-project.svg"
                            }
                            alt={project.titre}
                            fill
                            className="object-cover grayscale transition duration-700 hover:grayscale-0"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
