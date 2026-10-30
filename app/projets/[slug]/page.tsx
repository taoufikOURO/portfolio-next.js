import PageHeader from "@/app/components/PageHeader";
import { getAllProjects, getAdjacentProjects, getProjectBySlug } from "@/app/lib/data";
import { siteName } from "@/app/lib/site";
import { ArrowLeft, ArrowRight, Code2, ExternalLink } from "lucide-react";
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

    const title = `${project.titre} | ${siteName}`;

    return {
        title,
        description: project.description,
        alternates: {
            canonical: `/projets/${project.slug}`,
        },
        openGraph: {
            type: "website",
            title,
            description: project.description,
            ...(project.image
                ? {
                      images: [
                          {
                              url: project.image,
                              alt: project.titre,
                          },
                      ],
                  }
                : {}),
        },
        twitter: {
            card: "summary_large_image",
            title,
            description: project.description,
            ...(project.image ? { images: [project.image] } : {}),
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

    const { previous, next } = getAdjacentProjects(slug);

    return (
        <main id="contenu" className="shell pb-16 pt-24 md:pt-28">
            <PageHeader
                title={project.titre}
                description={project.description}
                backHref="/projets"
                backLabel="Tous les projets"
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
                <div>
                    {project.image && (
                        <div className="media-frame aspect-video overflow-hidden rounded-3xl">
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
                </div>

                <aside className="h-max rounded-3xl bg-(--surface) p-6">
                    <span className="label">Outils</span>
                    <ul className="mt-5 space-y-3">
                        {project.stack.map((technology) => (
                            <li
                                key={technology.name}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--surface-2)">
                                    <Image
                                        src={technology.icon}
                                        alt=""
                                        width={18}
                                        height={18}
                                        className="h-4 w-4 object-contain"
                                    />
                                </span>
                                {technology.name}
                            </li>
                        ))}
                    </ul>

                    {(project.lien ||
                        (project.github && project.github.length > 0)) && (
                        <div className="mt-6 flex flex-col gap-2 border-t border-(--line) pt-5">
                            {project.lien && (
                                <a
                                    href={project.lien}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary w-full"
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
                                    className="btn btn-ghost w-full"
                                >
                                    <Code2 className="h-4 w-4" aria-hidden />
                                    {repository.nom}
                                </a>
                            ))}
                        </div>
                    )}
                </aside>
            </div>

            {(previous || next) && (
                <nav
                    aria-label="Navigation entre les projets"
                    className="mt-10 grid gap-4 sm:grid-cols-2"
                >
                    {previous && (
                        <Link
                            href={`/projets/${previous.slug}`}
                            aria-label={`Projet précédent : ${previous.titre}`}
                            className="group flex items-center gap-4 rounded-3xl bg-(--surface) p-6 transition-colors hover:bg-white md:p-8"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--ink) text-white transition-transform group-hover:-translate-x-1">
                                <ArrowLeft
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                            </span>
                            <div className="min-w-0">
                                <span className="label">Projet précédent</span>
                                <p className="heading mt-3 line-clamp-2 text-[clamp(1.2rem,2.4vw,2rem)] transition-colors group-hover:text-(--accent)">
                                    {previous.titre}
                                </p>
                            </div>
                        </Link>
                    )}
                    {next && (
                        <Link
                            href={`/projets/${next.slug}`}
                            aria-label={`Projet suivant : ${next.titre}`}
                            className="group flex items-center justify-between gap-4 rounded-3xl bg-(--surface) p-6 transition-colors hover:bg-white md:p-8 sm:col-start-2"
                        >
                            <div className="min-w-0">
                                <span className="label">Projet suivant</span>
                                <p className="heading mt-3 line-clamp-2 text-[clamp(1.2rem,2.4vw,2rem)] transition-colors group-hover:text-(--accent)">
                                    {next.titre}
                                </p>
                            </div>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--ink) text-white transition-transform group-hover:translate-x-1">
                                <ArrowRight
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                            </span>
                        </Link>
                    )}
                </nav>
            )}
        </main>
    );
}
