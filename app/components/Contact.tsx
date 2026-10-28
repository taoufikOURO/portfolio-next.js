import { getProfile } from "@/app/lib/data";
import { ArrowUpRight, Briefcase, Code2, Mail } from "lucide-react";
import Reveal from "./Reveal";

export default function Contact() {
    const profile = getProfile();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;
    const year = new Date().getFullYear();

    return (
        <section id="contact" className="section">
            <Reveal className="shell grid gap-8 md:grid-cols-[11rem_1fr] md:gap-12">
                <h2 className="heading section-heading text-3xl">
                    Contact
                </h2>
                <div>
                    <p className="max-w-xl text-lg leading-relaxed text-(--muted)">
                        Une question, une idée de projet ou une collaboration
                        à proposer ? Le plus simple reste de m’écrire.
                    </p>
                    <a
                        href={`mailto:${profile.email}`}
                        className="group mt-6 inline-flex items-center gap-2 text-2xl font-medium text-(--accent) hover:underline md:text-3xl"
                    >
                        <Mail className="h-6 w-6" aria-hidden />
                        {profile.email}
                        <ArrowUpRight
                            className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </a>
                    <div className="mt-8 flex flex-wrap gap-5 text-sm">
                        <a
                            href={profile.liens.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-(--muted) transition-colors hover:text-(--accent)"
                        >
                            <Code2
                                className="h-4 w-4 text-(--accent-2)"
                                aria-hidden
                            />
                            GitHub
                        </a>
                        <a
                            href={linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-(--muted) transition-colors hover:text-(--accent)"
                        >
                            <Briefcase
                                className="h-4 w-4 text-(--accent)"
                                aria-hidden
                            />
                            LinkedIn
                        </a>
                        <a
                            href={profile.cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-(--muted) transition-colors hover:text-(--accent)"
                        >
                            CV
                            <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </a>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--line) pt-4 text-xs text-(--muted) md:col-start-2">
                    <span>
                        © {year} {profile.prenom} {profile.nom}
                    </span>
                    <span>Data Scientist · Lomé, Togo</span>
                </div>
            </Reveal>
        </section>
    );
}
