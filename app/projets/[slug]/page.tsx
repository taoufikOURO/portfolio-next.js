import { getAllProjects, getProjectBySlug } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateStaticParams() {
    const projects = getAllProjects();
    return projects.map((projet) => ({
        slug: projet.slug,
    }));
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const projet = getProjectBySlug(slug);

    if (!projet) {
        notFound();
    }

    return (
        <section className="min-h-screen py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center gap-4 mb-12">
                    <Link
                        href="/projets"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[#14213d]/20 text-sm font-medium text-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Tous les projets
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[#14213d]/20 text-sm font-medium text-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Accueil
                    </Link>
                </div>

                <div className="mb-16">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] leading-tight mb-4">
                        {projet.titre}
                    </h1>

                    <div className="w-16 h-1 bg-[#fca311] mb-6"></div>

                    <p className="text-lg text-[#14213d]/70 font-light">
                        Projet personnel • Développement web
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Contenu principal */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Image principale */}
                        <div className="border border-[#14213d]/10 overflow-hidden">
                            {projet.image ? (
                                <div className="relative h-100 lg:h-125 bg-gray-100">
                                    <Image
                                        src={projet.image}
                                        alt={projet.titre}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-100 lg:h-125 bg-gray-50 flex items-center justify-center text-[#14213d]/20">
                                    <i className="fa fa-image text-6xl"></i>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="relative bg-white border border-[#14213d]/10 p-8">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold text-[#14213d] mb-6 flex items-center gap-3">
                                    <div className="w-12 h-12 flex items-center justify-center border border-[#14213d]/20">
                                        <i className="fas fa-file-alt text-[#fca311]"></i>
                                    </div>
                                    Description du projet
                                </h2>
                                <p className="text-lg text-[#14213d]/80 leading-relaxed whitespace-pre-line">
                                    {projet.description}
                                </p>
                            </div>

                            {/* Éléments décoratifs */}
                            <div className="absolute -top-4 -left-4 w-8 h-8 bg-[#fca311]"></div>
                            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-4 border-[#fca311]"></div>
                        </div>

                        {/* Caractéristiques principales */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="p-6 bg-white border border-[#14213d]/10 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 flex items-center justify-center border border-[#14213d]/20 mb-4">
                                    <i className="fas fa-rocket text-[#fca311] text-xl"></i>
                                </div>
                                <h3 className="font-bold text-[#14213d] mb-2">
                                    Performance
                                </h3>
                                <p className="text-sm text-[#14213d]/70">
                                    Optimisé pour une expérience rapide et
                                    fluide
                                </p>
                            </div>
                            <div className="p-6 bg-white border border-[#14213d]/10 hover:-translate-y-1 transition-all duration-200">
                                <div className="w-12 h-12 flex items-center justify-center border border-[#14213d]/20 mb-4">
                                    <i className="fas fa-mobile-alt text-[#fca311] text-xl"></i>
                                </div>
                                <h3 className="font-bold text-[#14213d] mb-2">
                                    Responsive
                                </h3>
                                <p className="text-sm text-[#14213d]/70">
                                    Adapté à tous les écrans et appareils
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-8">
                        {/* Liens */}
                        {(projet.lien || projet.github) && (
                            <div className="bg-white border border-[#14213d]/10 p-6">
                                <h3 className="font-bold text-[#14213d] mb-4 flex items-center gap-2 text-lg">
                                    <i className="fas fa-link text-[#fca311]"></i>
                                    Liens
                                </h3>
                                <div className="space-y-3">
                                    {projet.lien && (
                                        <a
                                            href={projet.lien}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 w-full px-4 py-3 bg-[#fca311] hover:bg-[#e09200] text-white transition-colors duration-200"
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <i className="fa fa-external-link-alt text-white"></i>
                                            </div>
                                            <span className="font-semibold">
                                                Voir le site
                                            </span>
                                        </a>
                                    )}
                                    {projet.github && (
                                        <a
                                            href={projet.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 w-full px-4 py-3 border-2 border-[#14213d] text-[#14213d] hover:bg-[#14213d] hover:text-white transition-all duration-200"
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <i className="fab fa-github"></i>
                                            </div>
                                            <span className="font-semibold">
                                                Code source
                                            </span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Stack */}
                        {projet.stack && projet.stack.length > 0 && (
                            <div className="bg-white border border-[#14213d]/10 p-6">
                                <h3 className="font-bold text-[#14213d] mb-4 flex items-center gap-2 text-lg">
                                    <i className="fas fa-layer-group text-[#fca311]"></i>
                                    Technologies
                                </h3>
                                <div className="space-y-3">
                                    {projet.stack.map((tech, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-3 bg-gray-50 border border-[#14213d]/10 hover:border-[#fca311] transition-colors duration-200"
                                        >
                                            {tech.icon && (
                                                <div className="relative w-8 h-8">
                                                    <Image
                                                        src={tech.icon}
                                                        alt={tech.name}
                                                        fill
                                                        className="object-contain"
                                                    />
                                                </div>
                                            )}
                                            <span className="font-medium text-[#14213d]">
                                                {tech.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </section>
    );
}
