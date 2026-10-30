import { getAllFormations } from "@/app/lib/data";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Formations() {
    const formations = getAllFormations();

    return (
        <section id="parcours" className="section">
            <div className="shell">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--line-strong) pb-4">
                    <span className="label">Parcours</span>
                    <Link href="/formations" className="pill pill-dark">
                        Voir tout
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                </div>

                <div>
                    {formations.map((formation, index) => (
                        <Reveal
                            key={`${formation.intitule}-${formation.debut}`}
                            delay={index * 0.08}
                            className="border-b border-(--line-strong)"
                        >
                            <article className="grid items-center gap-6 py-8 md:grid-cols-[1fr_auto] md:gap-10 md:py-10">
                                <div>
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-(--muted)">
                                        {formation.debut} —{" "}
                                        {formation.fin || "aujourd'hui"}
                                    </p>
                                    <h3 className="heading mt-3 max-w-4xl text-[clamp(1.35rem,2.9vw,2.5rem)]">
                                        {formation.intitule}
                                    </h3>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--muted) md:text-base">
                                        {formation.description}
                                    </p>
                                    <p className="mt-4 text-xs font-semibold">
                                        {formation.etablissement} ·{" "}
                                        {formation.lieu}
                                    </p>
                                    {formation.mention && (
                                        <p className="mt-1 text-xs text-(--accent)">
                                            Mention {formation.mention}
                                            {formation.moyenne
                                                ? ` — ${formation.moyenne}/20`
                                                : ""}
                                        </p>
                                    )}
                                </div>

                                <div className="hidden h-36 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-full bg-(--surface) text-center md:flex lg:h-44 lg:w-44">
                                    <GraduationCap
                                        className="h-9 w-9 text-(--ink)"
                                        strokeWidth={1.4}
                                        aria-hidden
                                    />
                                    <span className="max-w-24 text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.06em] text-(--muted)">
                                        {formation.lieu}
                                    </span>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
