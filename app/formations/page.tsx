import { getAllFormations } from "@/app/lib/data";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "../components/Motion";

export default function FormationsPage() {
    const formations = getAllFormations();
    return (
        <main className="poster-section data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-6xl">
                <Reveal>
                    <Link href="/" className="section-label">
                        Retour accueil
                    </Link>
                </Reveal>
                <Reveal delay={0.08} className="mt-12 max-w-4xl">
                    <h1 className="display poster-heading">
                        Les fondations
                        <br />
                        <span className="text-[#668b26]">du parcours.</span>
                    </h1>
                    <p className="mt-8 max-w-xl text-lg leading-relaxed text-(--muted)">
                        Les étapes qui ont construit ma façon de questionner,
                        modéliser et transmettre.
                    </p>
                </Reveal>
                <Stagger className="mt-20 border-t border-(--ink)">
                    {formations.map((formation, index) => (
                        <StaggerItem
                            key={index}
                            className="line-item grid gap-6 border-b border-(--line) py-10 md:grid-cols-[.2fr_1fr_.4fr]"
                        >
                            <span className="font-mono text-sm text-(--coral)">
                                {formation.debut} → {formation.fin || "now"}
                            </span>
                            <div>
                                <h2 className="text-3xl font-bold">
                                    {formation.intitule}
                                </h2>
                                <p className="mt-2 text-(--muted)">
                                    {formation.etablissement} · {formation.lieu}
                                </p>
                                <p className="mt-6 max-w-2xl leading-relaxed text-(--muted)">
                                    {formation.description}
                                </p>
                            </div>
                            <div className="flex flex-wrap content-start gap-2 md:justify-end">
                                {formation.competences.map((item) => (
                                    <span
                                        key={item}
                                        className="border border-(--line) px-3 py-2 font-mono text-[10px]"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </StaggerItem>
                    ))}
                </Stagger>
            </div>
        </main>
    );
}
