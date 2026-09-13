import { getProfile } from "@/app/lib/data";

export default function Contact() {
    const profile = getProfile();
    const links = [
        ["MAIL", profile.email, `mailto:${profile.email}`],
        ["GITHUB", "Voir le code", profile.liens.github],
        [
            "LINKEDIN",
            "Se connecter",
            profile.liens.linkedin.startsWith("http")
                ? profile.liens.linkedin
                : `https://${profile.liens.linkedin}`,
        ],
    ];
    return (
        <section
            id="contact"
            className="poster-section contact-poster px-6 py-24 md:px-12 md:py-36 lg:px-20"
        >
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-14 lg:grid-cols-[1fr_.8fr]">
                    <div>
                        <span className="poster-kicker text-(--ink)">
                            05 / Dernière étape
                        </span>
                        <h2 className="display poster-heading mt-8">
                            On ouvre
                            <br />
                            <span className="text-(--paper)">le dialogue.</span>
                        </h2>
                        <p className="mt-8 max-w-md text-lg leading-relaxed text-(--ink)/75">
                            Une problématique data, une interface à clarifier ou
                            simplement une idée à tester? Je suis toujours
                            partant pour commencer par une bonne question.
                        </p>
                    </div>
                    <div className="border-t border-(--ink)">
                        {links.map(([label, value, href], index) => (
                            <a
                                key={label}
                                href={href}
                                target={index === 0 ? undefined : "_blank"}
                                rel={
                                    index === 0
                                        ? undefined
                                        : "noopener noreferrer"
                                }
                                className="group flex items-center justify-between border-b border-(--ink) py-6"
                            >
                                <span>
                                    <small className="block font-mono text-[10px]">
                                        {label}
                                    </small>
                                    <strong className="mt-2 block text-lg">
                                        {value}
                                    </strong>
                                </span>
                                <span className="text-2xl transition-transform group-hover:translate-x-2">
                                    ↗
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
