import { getProfile } from "@/app/lib/data";

export default function About() {
    const profile = getProfile();
    const highlights = [
        [
            "01",
            "Comprendre",
            "Je pars du problème et du terrain avant de choisir un modèle.",
        ],
        [
            "02",
            "Modéliser",
            "Je transforme la donnée brute en systèmes lisibles, testables et utiles.",
        ],
        [
            "03",
            "Transmettre",
            "Je rends les résultats accessibles à celles et ceux qui doivent agir.",
        ],
    ];
    return (
        <section
            id="about"
            className="data-grid px-6 py-24 md:px-12 md:py-36 lg:px-20"
        >
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr]">
                    <div className="reveal">
                        <span className="section-label">À propos</span>
                        <p className="mt-8 font-mono text-xs text-(--muted)">
                            SIGNAL / HUMAN_CONTEXT
                        </p>
                    </div>
                    <div className="reveal reveal-delay-1">
                        <h2 className="display max-w-4xl text-5xl leading-none md:text-7xl">
                            La donnée comme moyen,
                            <br />
                            <span className="text-[#668b26]">
                                pas comme finalité.
                            </span>
                        </h2>
                        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-(--muted)">
                            {profile.aPropos}
                        </p>
                        <div className="mt-14 grid border-t border-(--line) md:grid-cols-3">
                            {highlights.map(([number, title, text]) => (
                                <div
                                    key={number}
                                    className="border-b border-(--line) py-6 md:border-b-0 md:border-r md:px-6 first:pl-0 last:border-r-0"
                                >
                                    <span className="font-mono text-xs text-(--coral)">
                                        {number}
                                    </span>
                                    <h3 className="mt-7 text-xl font-bold">
                                        {title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-relaxed text-(--muted)">
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
