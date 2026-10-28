import { getAllFormations, getProfile } from "@/app/lib/data";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

export default function FormationsPage() {
    const formations = getAllFormations();
    const profile = getProfile();

    return (
        <main className="shell py-10 md:py-16">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Retour
            </Link>

            <div className="mt-8 max-w-2xl">
                <h1 className="heading text-3xl sm:text-4xl">Formation</h1>
                <p className="mt-3 text-base leading-relaxed text-(--muted)">
                    Mon parcours académique et les compétences acquises.
                </p>
            </div>

            <div className="mt-8 divide-y divide-(--line) border-y border-(--line)">
                {formations.map((formation) => (
                    <article
                        key={`${formation.intitule}-${formation.debut}`}
                        className="grid gap-3 py-8 md:grid-cols-[10rem_1fr] md:gap-8"
                    >
                        <p className="text-sm text-(--muted)">
                            {formation.debut} —{" "}
                            {formation.fin || "aujourd’hui"}
                        </p>
                        <div>
                            <h2 className="text-lg font-semibold">
                                {formation.intitule}
                            </h2>
                            <p className="mt-1 text-sm text-(--muted)">
                                {formation.etablissement} · {formation.lieu}
                            </p>
                            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--muted)">
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
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {formation.competences.map((competence) => (
                                    <span key={competence} className="tag">
                                        {competence}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <a
                href={profile.cv}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost mt-8"
            >
                <Download className="h-4 w-4" aria-hidden />
                Télécharger le CV
            </a>
        </main>
    );
}
