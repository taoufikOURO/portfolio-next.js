import { getAllFormations } from "@/app/lib/data";
import Link from "next/link";

export default function Formations() {
    const formations = getAllFormations();

    return (
        <section
            id="formations"
            className="py-24 md:py-32 bg-linear-to-b from-white to-[#f8fafc] relative overflow-hidden"
        >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-72 h-72 blob blob-accent rounded-full opacity-10" />
            <div className="absolute bottom-32 left-0 w-96 h-96 blob blob-primary rounded-full opacity-5" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                {/* Header avec animations */}
                <div className="text-center mb-20 animate-fade-in-up">
                    <span className="inline-block text-sm font-bold text-[#fca311] uppercase tracking-widest mb-4">
                        Mon Parcours Académique
                    </span>

                    <h2 className="text-5xl md:text-6xl font-black text-[#14213d] mb-6 leading-tight">
                        Mon{" "}
                        <span className="text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                            Parcours
                        </span>
                    </h2>

                    <div className="flex justify-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-16 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full animate-gradient-shift"></div>
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                    </div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        Découvrez mon cheminement académique et les compétences
                        que j&apos;ai acquises en Data Science et développement
                        Web
                    </p>
                </div>

                {/* Timeline interactive */}
                <div className="relative">
                    {/* Ligne centrale */}
                    <div className="absolute left-4 md:left-1/2 top-8 bottom-0 w-1 bg-linear-to-b from-[#fca311] to-[#fdb84d] md:transform md:-translate-x-1/2"></div>

                    {formations.map((formation, index) => (
                        <article
                            key={index}
                            className="relative mb-16 md:mb-12 last:mb-0 animate-fade-in-up"
                            style={{
                                animation: `fadeInUp 0.8s ease-out forwards`,
                                animationDelay: `${200 + index * 100}ms`,
                            }}
                        >
                            {/* Point sur la timeline */}
                            <div className="absolute left-0 top-6 w-8 h-8 md:left-1/2 md:transform md:-translate-x-1/2 md:top-6">
                                <div className="w-full h-full bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full border-4 border-white shadow-md z-10 animate-pulse-glow"></div>
                            </div>

                            {/* Contenu de la formation */}
                            <div
                                className={`md:w-1/2 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:ml-auto md:pl-12"}`}
                            >
                                <div className="ml-12 md:ml-0 glass rounded-2xl p-8 hover-lift hover:shadow-[0_20px_40px_rgba(252,163,17,0.15)] hover:border-[#fca311]/40 border-[#fca311]/20 transition-all group">
                                    {/* En-tête */}
                                    <div className="flex flex-col gap-4 mb-4">
                                        <div className="flex items-start justify-between gap-4 flex-wrap">
                                            <div>
                                                <h3 className="text-2xl font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors mb-2">
                                                    {formation.intitule}
                                                </h3>
                                                <p className="text-[#fca311] font-semibold text-sm mb-1">
                                                    {formation.etablissement}
                                                </p>
                                            </div>
                                            <div className="px-4 py-2 bg-linear-to-r from-[#fca311]/20 to-[#fdb84d]/10 border border-[#fca311]/30 rounded-xl text-sm font-bold text-[#14213d] group-hover:border-[#fca311]/60 transition-all shrink-0">
                                                {formation.debut}
                                                {formation.fin &&
                                                    ` - ${formation.fin}`}
                                            </div>
                                        </div>
                                        <p className="text-[#14213d]/70 text-sm flex items-center gap-2">
                                            <i className="fas fa-map-marker-alt text-[#fca311]"></i>
                                            {formation.lieu}
                                        </p>
                                    </div>

                                    {/* Compétences acquises */}
                                    {formation.competences &&
                                        formation.competences.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-[#14213d]/60 uppercase tracking-widest mb-3">
                                                    Compétences acquises
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {formation.competences
                                                        .slice(0, 4)
                                                        .map(
                                                            (
                                                                competence,
                                                                idx,
                                                            ) => (
                                                                <span
                                                                    key={idx}
                                                                    className="inline-block px-4 py-2 bg-linear-to-r from-[#fca311]/10 to-[#fdb84d]/10 border border-[#fca311]/30 text-xs font-semibold text-[#14213d] rounded-full group-hover:border-[#fca311]/60 group-hover:bg-[#fca311]/20 transition-all"
                                                                >
                                                                    {competence}
                                                                </span>
                                                            ),
                                                        )}
                                                    {formation.competences
                                                        .length > 4 && (
                                                        <span className="inline-block px-4 py-2 bg-[#fca311]/10 border border-[#fca311]/20 text-xs font-semibold text-[#14213d] rounded-full">
                                                            +
                                                            {formation
                                                                .competences
                                                                .length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Bottom accent line */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl"></div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* CTA pour voir le parcours complet */}
                {formations.length > 0 && (
                    <div className="mt-16 md:mt-24 text-center animate-fade-in-up animation-delay-500">
                        <Link
                            href="/formations"
                            className="inline-flex items-center justify-center gap-3 bg-linear-to-r from-[#fca311] to-[#fdb84d] hover:from-[#fdb84d] hover:to-[#fca311] text-[#14213d] px-10 py-4 font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(252,163,17,0.4)] hover-lift group"
                        >
                            <span>Voir mon parcours complet</span>
                            <svg
                                className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300"
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
                )}

                {formations.length === 0 && (
                    <div className="text-center py-24 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl border-4 border-[#fca311]/20 bg-linear-to-br from-[#fca311]/10 to-transparent mb-8">
                            <i className="fas fa-graduation-cap text-[#fca311]/40 text-5xl animate-float"></i>
                        </div>
                        <p className="text-[#14213d]/60 text-xl font-light">
                            Formations en cours d&apos;ajout...
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
