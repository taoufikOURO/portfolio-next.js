import { getAllProjects, getProjectBySlug } from "@/app/lib/data";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal, Stagger, StaggerItem } from "@/app/components/Motion";

export async function generateStaticParams() {
    return getAllProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const project = getProjectBySlug(slug);

    if (!project) return {};

    const image = project.image || "/images/projets/default-project.svg";
    const title = `${project.titre} | Taoufik OURO-BANG'NA`;

    return {
        title,
        description: project.description,
        openGraph: {
            type: "website",
            title,
            description: project.description,
            images: [
                {
                    url: image,
                    alt: project.titre,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description: project.description,
            images: [image],
        },
    };
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
        <main className="poster-section data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-7xl">
                <Reveal>
                    <Link href="/projets" className="section-label">
                        Tous les projets
                    </Link>
                </Reveal>
                <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_.42fr]">
                    <Reveal>
                        <p className="eyebrow">CASE STUDY / {project.id}</p>
                        <h1 className="display poster-heading mt-6">
                            {project.titre}
                        </h1>
                        <p className="mt-8 max-w-4xl text-xl leading-relaxed text-(--muted) text-justify">
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
                                    Voir le projet
                                </a>
                            )}
                            {project.github?.map((repository) => (
                                <a
                                    key={repository.url}
                                    href={repository.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="outline-button"
                                >
                                    {repository.nom}
                                </a>
                            ))}
                        </div>
                    </Reveal>
                    <Reveal delay={0.1}>
                    <aside className="border-t border-(--ink) pt-5">
                        <p className="font-mono text-xs text-(--muted)">
                            OUTILKIT
                        </p>
                        <Stagger className="mt-5 space-y-3">
                            {project.stack.map((tech) => (
                                <StaggerItem
                                    key={tech.name}
                                    className="flex items-center gap-3 border-b border-(--line) pb-3 font-bold"
                                >
                                    <span className="text-(--coral)">
                                        <Image
                                            src={tech.icon}
                                            alt={tech.name}
                                            width={24}
                                            height={24}
                                        />
                                    </span>
                                    {tech.name}
                                </StaggerItem>
                            ))}
                        </Stagger>
                        {project.image && (
                            <div className="editorial-card mt-20 overflow-hidden p-3">
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
                        )}
                    </aside>
                    </Reveal>
                </div>
            </div>
        </main>
    );
}
