import { getAllProjects } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function ProjectsPage() {
    const projects = getAllProjects();

    return (
        <section className="min-h-screen py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header épuré */}
                <div className="text-center mb-16">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[#14213d]/20 text-sm font-medium text-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all mb-6"
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
                        Retour à l&apos;accueil
                    </Link>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] mb-6 leading-tight">
                        Portfolio{" "}
                        <span className="text-[#14213d]">Complet</span>
                    </h1>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto mb-6"></div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        Découvrez l&apos;ensemble de mes réalisations et
                        explorez les technologies que j&apos;utilise pour créer
                        des expériences web uniques.
                    </p>
                </div>

                {projects.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {projects.map((projet, index) => (
                                <article
                                    key={projet.id}
                                    className="group bg-white border border-[#14213d]/10 hover:border-[#fca311] overflow-hidden hover:-translate-y-2 transition-all duration-200"
                                >
                                    <Link
                                        href={`/projets/${projet.slug}`}
                                        className="block"
                                    >
                                        {/* Image du projet */}
                                        <div className="relative h-56 bg-gray-100 overflow-hidden">
                                            <Image
                                                src={
                                                    projet.image ||
                                                    "/images/projets/default-project.svg"
                                                }
                                                alt={projet.titre}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                            />

                                            {/* Badge en overlay */}
                                            <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 text-xs font-semibold text-[#14213d] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                Voir le projet
                                            </div>
                                        </div>

                                        {/* Contenu de la carte */}
                                        <div className="p-6 space-y-4">
                                            <h3 className="text-xl font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors">
                                                {projet.titre}
                                            </h3>

                                            <p className="text-[#14213d]/70 text-sm leading-relaxed line-clamp-3">
                                                {projet.description}
                                            </p>

                                            {/* Stack technologies */}
                                            {projet.stack &&
                                                projet.stack.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        {projet.stack
                                                            .slice(0, 3)
                                                            .map(
                                                                (tech, idx) => (
                                                                    <span
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-[#14213d]/10 text-xs font-medium text-[#14213d] group-hover:border-[#fca311] transition-colors"
                                                                    >
                                                                        {tech.icon && (
                                                                            <Image
                                                                                src={
                                                                                    tech.icon
                                                                                }
                                                                                alt={
                                                                                    tech.name
                                                                                }
                                                                                width={
                                                                                    14
                                                                                }
                                                                                height={
                                                                                    14
                                                                                }
                                                                                className="object-contain"
                                                                            />
                                                                        )}
                                                                        {
                                                                            tech.name
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                        {projet.stack.length >
                                                            3 && (
                                                            <span className="inline-flex items-center px-3 py-1 bg-[#fca311]/10 text-xs font-medium text-[#14213d]">
                                                                +
                                                                {projet.stack
                                                                    .length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                            {/* CTA */}
                                            <div className="flex items-center gap-2 text-[#fca311] font-semibold text-sm pt-2">
                                                <span className="group-hover:mr-2 transition-all">
                                                    Découvrir le projet
                                                </span>
                                                <svg
                                                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                    />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Accent décoratif en bas */}
                                        <div className="h-1 bg-[#fca311] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
                                    </Link>
                                </article>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="mt-16 text-center">
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#fca311] text-white">
                                <i className="fas fa-check-circle"></i>
                                <span className="font-semibold">
                                    {projects.length}{" "}
                                    {projects.length > 1
                                        ? "projets réalisés"
                                        : "projet réalisé"}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-24 h-24 border-2 border-[#14213d]/20 mb-6">
                            <i className="fas fa-folder-open text-[#14213d]/40 text-4xl"></i>
                        </div>
                        <p className="text-[#14213d]/60 text-lg mb-2">
                            Aucun projet publié pour le moment.
                        </p>
                        <p className="text-sm text-[#14213d]/40 mb-8">
                            Revenez bientôt pour découvrir mes réalisations !
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#fca311] hover:bg-[#e09200] text-white font-semibold transition-colors duration-200"
                        >
                            <i className="fas fa-home"></i>
                            Retour à l&apos;accueil
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
