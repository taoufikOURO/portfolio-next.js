import { getAllFormations } from "@/app/lib/data";
import Link from "next/link";

export default function Formations() {
    const formations = getAllFormations();
    return (
        <section
            id="formations"
            className="bg-(--paper) px-6 py-24 md:px-12 md:py-36 lg:px-20"
        >
            <div className="mx-auto max-w-7xl">
                <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <span className="section-label">Parcours</span>
                        <h2 className="display mt-7 text-5xl md:text-7xl">
                            Construire
                            <br />
                            <span className="text-[#668b26]">
                                les fondations.
                            </span>
                        </h2>
                    </div>
                    <Link
                        href="/formations"
                        className="outline-button self-start md:self-end"
                    >
                        Voir le détail ↗
                    </Link>
                </div>
                <div className="border-t border-(--ink)">
                    {formations.map((formation, index) => (
                        <article
                            key={index}
                            className="group grid gap-4 border-b border-(--line) py-8 md:grid-cols-[.18fr_1fr_.35fr] md:items-start"
                        >
                            <span className="font-mono text-sm text-(--coral)">
                                {formation.debut}
                            </span>
                            <div>
                                <h3 className="text-2xl font-bold transition-colors group-hover:text-[#668b26]">
                                    {formation.intitule}
                                </h3>
                                <p className="mt-2 text-(--muted)">
                                    {formation.etablissement} · {formation.lieu}
                                </p>
                            </div>
                            <div className="text-sm text-(--muted) md:text-right">
                                {formation.fin
                                    ? `→ ${formation.fin}`
                                    : "En cours"}
                                <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                                    {formation.competences
                                        .slice(0, 3)
                                        .map((item) => (
                                            <span
                                                key={item}
                                                className="border border-(--line) px-2 py-1 font-mono text-[10px]"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}