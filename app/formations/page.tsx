import PageHeader from "@/app/components/PageHeader";
import { getAllFormations, getProfile } from "@/app/lib/data";
import { siteName } from "@/app/lib/site";
import { Download, GraduationCap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: `Parcours | ${siteName}`,
    description:
        "Mon parcours académique et les compétences acquises au fil des formations.",
    alternates: {
        canonical: "/formations",
    },
};

export default function FormationsPage() {
    const formations = getAllFormations();
    const profile = getProfile();

    return (
        <main id="contenu" className="shell pb-16 pt-24 md:pt-28">
            <PageHeader
                title="Parcours"
                description="Mon parcours académique et les compétences acquises au fil des formations."
            />

            <div className="mt-4">
                {formations.map((formation) => (
                    <article
                        key={`${formation.intitule}-${formation.debut}`}
                        className="grid items-start gap-6 border-b border-(--line-strong) py-8 md:grid-cols-[1fr_auto] md:gap-10 md:py-10"
                    >
                        <div>
                            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-(--muted)">
                                {formation.debut} —{" "}
                                {formation.fin || "aujourd'hui"}
                            </p>
                            <h2 className="heading mt-3 max-w-4xl text-[clamp(1.4rem,3vw,2.6rem)]">
                                {formation.intitule}
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-(--muted) md:text-base">
                                {formation.description}
                            </p>
                            <p className="mt-4 text-xs font-semibold">
                                {formation.etablissement} · {formation.lieu}
                            </p>
                            {formation.mention && (
                                <p className="mt-1 text-xs text-(--accent)">
                                    Mention {formation.mention}
                                    {formation.moyenne
                                        ? ` — ${formation.moyenne}/20`
                                        : ""}
                                </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {formation.competences.map((competence) => (
                                    <span key={competence} className="tag">
                                        {competence}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="hidden h-36 w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-full bg-(--surface) text-center md:flex lg:h-44 lg:w-44">
                            <GraduationCap
                                className="h-9 w-9"
                                strokeWidth={1.4}
                                aria-hidden
                            />
                            <span className="max-w-24 text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.06em] text-(--muted)">
                                {formation.lieu}
                            </span>
                        </div>
                    </article>
                ))}
            </div>

            <a
                href={profile.cv}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-8"
            >
                <Download className="h-4 w-4" aria-hidden />
                Télécharger le CV
            </a>
        </main>
    );
}
