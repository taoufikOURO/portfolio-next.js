import { getAllProjects, getProjectBySlug } from "@/app/lib/data";
import {
    ArrowLeft,
    ArrowRight,
    Code2,
    ExternalLink,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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

    const projects = getAllProjects();
    const currentIndex = projects.findIndex((item) => item.slug === slug);
    const nextProject =
        currentIndex >= 0
            ? projects[(currentIndex + 1) % projects.length]
            : undefined;

    return (
        <main className="shell py-10 md:py-16">
            <Link
                href="/projets"
                className="inline-flex items-center gap-2 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Tous les projets
            </Link>

            <article className="mt-8">
                <div className="grid gap-10 md:grid-cols-[1fr_14rem]">
                    <header>
                        <h1 className="heading max-w-3xl text-3xl sm:text-5xl">
                            {project.titre}
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-relaxed text-(--muted)">
                            {project.description}
                        </p>

                        {(project.lien ||
                            (project.github && project.github.length > 0)) && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {project.lien && (
                                    <a
                                        href={project.lien}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Voir le projet
                                        <ExternalLink
                                            className="h-4 w-4"
                                            aria-hidden
                                        />
                                    </a>
                                )}
                                {project.github?.map((repository) => (
                                    <a
                                        key={repository.url}
                                        href={repository.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-ghost"
                                    >
                                        <Code2
                                            className="h-4 w-4"
                                            aria-hidden
                                        />
                                        {repository.nom}
                                    </a>
                                ))}
                            </div>
                        )}
                    </header>

                    <aside className="md:pt-2">
                        <h2 className="text-sm font-semibold">Outils</h2>
                        <ul className="mt-3 space-y-2">
                            {project.stack.map((technology) => (
                                <li
                                    key={technology.name}
                                    className="flex items-center gap-2.5 text-sm text-(--muted)"
                                >
                                    <Image
                                        src={technology.icon}
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="h-4.5 w-4.5 object-contain"
                                    />
                                    {technology.name}
                                </li>
                            ))}
                        </ul>
                    </aside>
                </div>

                {project.image && (
                    <div className="media-frame mt-10 aspect-video overflow-hidden rounded-lg border border-(--line)">
                        <Image
                            src={project.image}
                            alt={project.titre}
                            fill
                            priority
                            sizes="(min-width: 1024px) 1024px, 100vw"
                            className="object-cover"
                        />
                    </div>
                )}
            </article>

            {nextProject && (
                <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-(--line) pt-6">
                    <Link
                        href="/projets"
                        className="text-sm text-(--muted) transition-colors hover:text-(--text)"
                    >
                        Tous les projets
                    </Link>
                    <Link
                        href={`/projets/${nextProject.slug}`}
                        className="group inline-flex items-center gap-2 text-sm font-medium"
                    >
                        Projet suivant : {nextProject.titre}
                        <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </Link>
                </div>
            )}
        </main>
    );
}
