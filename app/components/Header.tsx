import { getProfile } from "@/app/lib/data";
import { ArrowUpRight, Briefcase, Code2 } from "lucide-react";
import Link from "next/link";
import HeaderNav, { type NavigationItem } from "./HeaderNav";

const navigation: NavigationItem[] = [
    { label: "Accueil", href: "/" },
    { label: "Expertise", href: "/#expertise" },
    { label: "Projets", href: "/#projets" },
    { label: "Parcours", href: "/#parcours" },
    { label: "Notes", href: "/#notes" },
    { label: "Contact", href: "/#contact" },
];

export default function Header() {
    const profile = getProfile();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(255,255,255,0.25)] bg-(--bg)/80 backdrop-blur-md">
            <div className="shell relative flex h-20 items-center justify-between gap-4">
                <HeaderNav
                    items={navigation}
                    email={profile.email}
                    github={profile.liens.github}
                    linkedin={linkedin}
                />

                <Link
                    href="/"
                    aria-label="Retour à l'accueil"
                    className="script absolute left-1/2 -translate-x-1/2 text-3xl leading-none transition-colors hover:text-(--accent)"
                >
                    Taoufik<span className="text-(--accent)">.</span>
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden items-center gap-1.5 sm:flex">
                        <a
                            href={profile.liens.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub (nouvel onglet)"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                        >
                            <Code2 className="h-4 w-4" aria-hidden />
                        </a>
                        <a
                            href={linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn (nouvel onglet)"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                        >
                            <Briefcase className="h-4 w-4" aria-hidden />
                        </a>
                    </div>
                    <a
                        href={`mailto:${profile.email}`}
                        className="pill pill-dark"
                    >
                        Me contacter
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                </div>
            </div>
        </header>
    );
}
