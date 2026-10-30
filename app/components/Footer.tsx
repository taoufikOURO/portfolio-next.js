import { getProfile } from "@/app/lib/data";
import { Briefcase, Code2, Mail } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    const profile = getProfile();
    const year = new Date().getFullYear();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;

    return (
        <footer className="relative overflow-hidden pt-10">
            <div className="shell">
                <div className="flex flex-col items-center gap-5 border-t border-(--line-strong) pt-10">
                    <Link href="/" className="script text-4xl leading-none">
                        Taoufik<span className="text-(--accent)">.</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <a
                            href={`mailto:${profile.email}`}
                            aria-label="Envoyer un email"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                        >
                            <Mail className="h-4 w-4" aria-hidden />
                        </a>
                        <a
                            href={profile.liens.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                        >
                            <Code2 className="h-4 w-4" aria-hidden />
                        </a>
                        <a
                            href={linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                        >
                            <Briefcase className="h-4 w-4" aria-hidden />
                        </a>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 py-6 text-[0.68rem] font-medium text-(--muted)">
                    <p>
                        © {year} {profile.prenom} {profile.nom}. Tous droits
                        réservés.
                    </p>
                    <div className="flex items-center gap-4 uppercase tracking-[0.08em]">
                        <Link
                            href="/projets"
                            className="transition-colors hover:text-(--accent)"
                        >
                            Projets
                        </Link>
                        <Link
                            href="/formations"
                            className="transition-colors hover:text-(--accent)"
                        >
                            Parcours
                        </Link>
                        <Link
                            href="/articles"
                            className="transition-colors hover:text-(--accent)"
                        >
                            Notes
                        </Link>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden">
                <p className="ghost-text -mb-[0.18em] text-center text-[clamp(4rem,16vw,17rem)]">
                    Taoufik
                </p>
            </div>
        </footer>
    );
}
