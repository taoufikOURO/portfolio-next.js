import { getAllFormations } from "@/app/lib/data";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Formations - Taoufik OURO‑BANG'NA",
    description:
        "Parcours académique et formations de Taoufik OURO‑BANG'NA, ingénieur en informatique.",
};

export default function FormationsPage() {
    const formations = getAllFormations();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero section */}
            <section className="py-20 md:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] mb-6 leading-tight">
                        Mon <span className="text-[#fca311]">parcours</span>{" "}
                        académique
                    </h1>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto mb-6"></div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        Découvrez en détail mon parcours académique, mes
                        formations et les compétences que j&apos;ai développées tout
                        au long de mes études.
                    </p>

                    <div className="mt-8">
                        <Link
                            href="/#formations"
                            className="inline-flex items-center gap-2 text-[#fca311] hover:text-[#14213d] font-medium transition-colors"
                        >
                            <i className="fas fa-arrow-left"></i>
                            Retour à l&apos;accueil
                        </Link>
                    </div>
                </div>
            </section>

            {/* Timeline détaillée */}
            <section className="py-16">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="relative">
                        {/* Ligne centrale */}
                        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-[#fca311]/30 hidden md:block"></div>

                        {formations.map((formation, index) => (
                            <article
                                key={index}
                                className="relative mb-12 md:mb-16 last:mb-0"
                            >
                                {/* Point sur la timeline */}
                                <div className="absolute left-6 top-8 w-4 h-4 bg-[#fca311] rounded-full border-4 border-white shadow-lg z-10 hidden md:block"></div>

                                {/* Contenu de la formation */}
                                <div className="md:ml-20 bg-white border border-[#14213d]/10 hover:border-[#fca311] transition-all duration-300 hover:shadow-lg group">
                                    <div className="p-6 md:p-8">
                                        {/* En-tête avec dates */}
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                            <div className="flex-1">
                                                <h2 className="text-xl md:text-2xl font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors mb-3">
                                                    {formation.intitule}
                                                </h2>
                                                <p className="text-[#14213d]/80 font-medium text-base mb-2">
                                                    {formation.etablissement}
                                                </p>
                                                <p className="text-[#14213d]/60 text-sm">
                                                    <i className="fas fa-map-marker-alt mr-1"></i>
                                                    {formation.lieu}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fca311]/10 text-[#14213d] text-sm font-semibold rounded-full">
                                                    <i className="fas fa-calendar-alt"></i>
                                                    <span>
                                                        {formation.debut}
                                                        {formation.fin &&
                                                            ` - ${formation.fin}`}
                                                    </span>
                                                </div>

                                                {formation.mention && (
                                                    <div className="mt-2 text-sm text-[#fca311] font-semibold">
                                                        <i className="fas fa-medal mr-1"></i>
                                                        {formation.mention}
                                                        {formation.moyenne &&
                                                            ` (${formation.moyenne}/20)`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="mb-8">
                                            <h3 className="text-sm font-semibold text-[#14213d] mb-3 uppercase tracking-wide">
                                                <i className="fas fa-info-circle mr-2 text-[#fca311]"></i>
                                                À propos de la formation
                                            </h3>
                                            <p className="text-[#14213d]/70 leading-relaxed">
                                                {formation.description}
                                            </p>
                                        </div>

                                        {/* Compétences */}
                                        {formation.competences &&
                                            formation.competences.length >
                                                0 && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[#14213d] mb-4 uppercase tracking-wide">
                                                        <i className="fas fa-lightbulb mr-2 text-[#fca311]"></i>
                                                        Compétences acquises
                                                    </h3>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {formation.competences.map(
                                                            (
                                                                competence,
                                                                idx,
                                                            ) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-start gap-2 p-3 bg-gray-50 border border-[#14213d]/10 group-hover:border-[#fca311] transition-colors"
                                                                >
                                                                    <i className="fas fa-check-circle text-[#fca311] mt-1 text-sm"></i>
                                                                    <span className="text-sm text-[#14213d] font-medium">
                                                                        {
                                                                            competence
                                                                        }
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA de retour */}
            <section className="py-16 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="p-8 bg-gray-50 border border-[#14213d]/10">
                        <h2 className="text-2xl font-bold text-[#14213d] mb-4">
                            Découvrir mes projets
                        </h2>
                        <p className="text-[#14213d]/70 mb-6">
                            Maintenant que vous connaissez mon parcours,
                            explorez les projets que j&apos;ai réalisés.
                        </p>
                        <Link
                            href="/#projets"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-[#fca311] text-white font-semibold hover:bg-[#e8930e] transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        >
                            <span>Voir mes projets</span>
                            <i className="fas fa-arrow-right"></i>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
