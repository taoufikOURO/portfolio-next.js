import { getAllFormations } from "@/app/lib/data";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Formations() {
    const formations = getAllFormations();

    return (
        <section id="formations" className="section">
            <Reveal className="shell">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="heading section-heading text-3xl">
                        Formation
                    </h2>
                    <Link
                        href="/formations"
                        className="inline-flex items-center gap-1 text-sm font-medium text-(--accent) hover:underline"
                    >
                        Voir le parcours
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                </div>

                <div className="mt-8 divide-y divide-(--line) border-y border-(--line)">
                    {formations.map((formation) => (
                        <article
                            key={`${formation.intitule}-${formation.debut}`}
                            className="grid gap-3 py-6 md:grid-cols-[10rem_1fr] md:gap-8"
                        >
                            <p className="text-sm font-medium text-(--accent)">
                                {formation.debut} —{" "}
                                {formation.fin || "aujourd’hui"}
                            </p>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {formation.intitule}
                                </h3>
                                <p className="mt-1 text-sm text-(--muted)">
                                    {formation.etablissement} ·{" "}
                                    {formation.lieu}
                                </p>
                                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--muted)">
                                    {formation.description}
                                </p>
                                {formation.mention && (
                                    <p className="mt-2 text-sm text-(--accent)">
                                        Mention {formation.mention}
                                        {formation.moyenne
                                            ? ` · ${formation.moyenne}/20`
                                            : ""}
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </Reveal>
        </section>
    );
}
