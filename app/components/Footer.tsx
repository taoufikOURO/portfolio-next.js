import { getProfile } from "@/app/lib/data";
import { Briefcase, Code2, Mail } from "lucide-react";

export default function Footer() {
    const profile = getProfile();
    const year = new Date().getFullYear();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;

    return (
        <footer className="border-t border-(--line)">
            <div className="shell flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-(--muted)">
                <p>
                    © {year} {profile.prenom} {profile.nom}
                </p>
                <div className="flex items-center gap-4">
                    <a
                        href={`mailto:${profile.email}`}
                        aria-label="Envoyer un email"
                        className="transition-colors hover:text-(--text)"
                    >
                        <Mail className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                        href={profile.liens.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub"
                        className="transition-colors hover:text-(--text)"
                    >
                        <Code2 className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                        className="transition-colors hover:text-(--text)"
                    >
                        <Briefcase className="h-4 w-4" aria-hidden />
                    </a>
                </div>
            </div>
        </footer>
    );
}
