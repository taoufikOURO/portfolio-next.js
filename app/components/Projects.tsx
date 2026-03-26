import { getRecentProjects } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function Projects() {
    const projects = getRecentProjects(6);

    return (
        <section
            id="projets"
            className="py-24 md:py-32 bg-linear-to-b from-white via-[#f8fafc] to-white relative overflow-hidden"
        >
            {/* Decorative elements */}
            <div className="absolute top-32 left-0 w-80 h-80 blob blob-accent rounded-full opacity-10" />
            <div className="absolute bottom-0 right-20 w-96 h-96 blob blob-primary rounded-full opacity-5" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header avec animations */}
                <div className="text-center mb-20 animate-fade-in-up">
                    <span className="inline-block text-sm font-bold text-[#fca311] uppercase tracking-widest mb-4">
                        Mon Portfolio
                    </span>

                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#14213d] mb-6 leading-tight">
                        Projets{" "}
                        <span className="text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                            Récents
                        </span>
                    </h2>

                    <div className="flex justify-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-16 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full animate-gradient-shift"></div>
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                    </div>

                    <p className="text-lg md:text-xl text-[#14213d]/70 max-w-3xl mx-auto font-light">
                        Des réalisations innovantes alliant Data Science, Web
                        Development et Design UX/UI, pensées pour créer un vrai
                        impact.
                    </p>
                </div>

                {projects.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 animate-fade-in-up animation-delay-200">
                            {projects.map((projet, index) => (
                                <article
                                    key={projet.id}
                                    className="group h-full"
                                    style={{
                                        animation: `fadeInUp 0.8s ease-out forwards`,
                                        animationDelay: `${300 + index * 100}ms`,
                                    }}
                                >
                                    <Link
                                        href={`/projets/${projet.slug}`}
                                        className="block h-full group"
                                    >
                                        <div className="glass rounded-2xl overflow-hidden hover-lift hover:shadow-[0_20px_50px_rgba(252,163,17,0.25)] hover:border-[#fca311]/60 border-[#fca311]/20 h-full flex flex-col transition-all">
                                            {/* Image du projet - avec parallax effect */}
                                            <div className="relative h-56 bg-linear-to-br from-[#14213d]/20 to-[#fca311]/10 overflow-hidden">
                                                <Image
                                                    src={
                                                        projet.image ||
                                                        "/images/projets/default-project.svg"
                                                    }
                                                    alt={projet.titre}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500 group-hover:brightness-110"
                                                />
                                                {/* Overlay gradient */}
                                                <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                {/* Badge en overlay */}
                                                <div className="absolute top-4 right-4 px-4 py-2 bg-white/95 backdrop-blur-md text-xs font-bold text-[#14213d] rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-75 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                                                    Voir plus
                                                </div>

                                                {/* Glow on hover */}
                                                <div className="absolute inset-0 bg-linear-to-r from-[#fca311]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            </div>

                                            {/* Contenu de la carte */}
                                            <div className="p-8 flex-1 flex flex-col">
                                                <h3 className="text-2xl font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors mb-3 line-clamp-2">
                                                    {projet.titre}
                                                </h3>

                                                <p className="text-[#14213d]/70 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                                                    {projet.description}
                                                </p>

                                                {/* Stack technologies */}
                                                {projet.stack &&
                                                    projet.stack.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-6">
                                                            {projet.stack
                                                                .slice(0, 3)
                                                                .map(
                                                                    (
                                                                        tech,
                                                                        idx,
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                idx
                                                                            }
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-[#fca311]/10 to-[#fdb84d]/10 border border-[#fca311]/30 text-xs font-semibold text-[#14213d] rounded-full group-hover:border-[#fca311] group-hover:bg-[#fca311]/20 transition-all"
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
                                                            {projet.stack
                                                                .length > 3 && (
                                                                <span className="inline-flex items-center px-3 py-1.5 bg-[#fca311]/10 border border-[#fca311]/20 text-xs font-semibold text-[#14213d] rounded-full">
                                                                    +
                                                                    {projet
                                                                        .stack
                                                                        .length -
                                                                        3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                {/* CTA avec animation */}
                                                <div className="flex items-center gap-2 text-[#fca311] font-bold text-sm group-hover:text-white group-hover:gap-3 transition-all">
                                                    <span>Découvrir</span>
                                                    <svg
                                                        className="w-5 h-5 group-hover:translate-x-2 transition-transform"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2.5}
                                                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Bottom accent line */}
                                            <div className="h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left"></div>
                                        </div>
                                    </Link>
                                </article>
                            ))}
                        </div>

                        {/* Bouton voir tous les projets */}
                        <div className="text-center animate-spring-in animation-delay-500">
                            <Link
                                href="/projets"
                                className="inline-flex items-center justify-center gap-3 bg-linear-to-r from-[#fca311] to-[#fdb84d] hover:from-[#fdb84d] hover:to-[#fca311] text-white px-12 py-5 font-bold rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#fca311]/30 hover-lift group text-lg"
                            >
                                <span>Voir tous mes projets</span>
                                <svg
                                    className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-32 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-40 h-40 rounded-3xl border-4 border-[#fca311]/20 bg-linear-to-br from-[#fca311]/10 to-transparent mb-8">
                            <i className="fas fa-folder-open text-[#fca311]/40 text-6xl animate-float"></i>
                        </div>
                        <p className="text-[#14213d] text-2xl font-bold mb-3">
                            Aucun projet disponible pour le moment
                        </p>
                        <p className="text-[#14213d]/60 text-lg">
                            Cette section accueillera bientôt des réalisations
                            révolutionnaires
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
