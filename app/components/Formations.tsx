import { getAllFormations } from "@/app/lib/data";
import Link from "next/link";

export default function Formations() {
    const formations = getAllFormations();

    return (
        <section id="formations" className="py-24 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header épuré */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] mb-6 leading-tight">
                        Mon <span className="text-[#fca311]">parcours</span>
                    </h2>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto mb-6"></div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        Un aperçu de mon parcours académique et des compétences
                        acquises tout au long de mes formations.
                    </p>
                </div>

                {/* Timeline résumée */}
                <div className="relative mb-12">
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
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors mb-2">
                                                {formation.intitule}
                                            </h3>
                                            <p className="text-[#14213d]/80 font-medium text-sm mb-1">
                                                {formation.etablissement}
                                            </p>
                                            <p className="text-[#14213d]/60 text-sm mb-4">
                                                <i className="fas fa-map-marker-alt mr-1"></i>
                                                {formation.lieu}
                                            </p>

                                            {/* Aperçu des compétences */}
                                            {formation.competences &&
                                                formation.competences.length >
                                                    0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {formation.competences
                                                            .slice(0, 3)
                                                            .map(
                                                                (
                                                                    competence,
                                                                    idx,
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="inline-block px-3 py-1 bg-gray-50 border border-[#14213d]/10 text-xs font-medium text-[#14213d] group-hover:border-[#fca311] transition-colors"
                                                                    >
                                                                        {
                                                                            competence
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                        {formation.competences
                                                            .length > 3 && (
                                                            <span className="inline-block px-3 py-1 bg-[#fca311]/10 text-xs font-medium text-[#14213d]">
                                                                +
                                                                {formation
                                                                    .competences
                                                                    .length -
                                                                    3}{" "}
                                                                autres
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                        </div>

                                        <div className="text-left md:text-right shrink-0">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fca311]/10 text-[#14213d] text-sm font-semibold rounded-full mb-2">
                                                <i className="fas fa-calendar-alt"></i>
                                                <span>
                                                    {formation.debut}
                                                    {formation.fin &&
                                                        ` - ${formation.fin}`}
                                                </span>
                                            </div>

                                            {formation.mention && (
                                                <div className="text-sm text-[#fca311] font-semibold">
                                                    <i className="fas fa-medal mr-1"></i>
                                                    {formation.mention}
                                                    {formation.moyenne &&
                                                        ` (${formation.moyenne}/20)`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* CTA vers la page formations complète */}
                <div className="text-center">
                    <Link
                        href="/formations"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-[#fca311] text-white font-semibold hover:bg-[#e8930e] transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                        <span>Voir mon parcours complet</span>
                        <i className="fas fa-arrow-right"></i>
                    </Link>
                </div>
            </div>
        </section>
    );
}
