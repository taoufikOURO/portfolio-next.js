import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import type { PublicProfile } from "@/lib/public/content";

import { Crosses } from "./Crosses";
import { SITE_LINKS } from "./links";

/** Pied de page : nom et titre, liens du profil, CV, ancres vers les sections de l'accueil (E67). */
export function SiteFooter({ profile }: { profile: PublicProfile }) {
  const external = [
    profile.githubUrl ? { href: profile.githubUrl, label: "GitHub" } : null,
    profile.linkedinUrl ? { href: profile.linkedinUrl, label: "LinkedIn" } : null,
    profile.resumeHref ? { href: profile.resumeHref, label: "CV" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <footer className="site-shell mt-24 pb-10">
      <div className="relative grid gap-10 border-t border-ink px-1 pt-10 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-0">
        <Crosses />
        <div>
          {profile.fullName ? <p className="site-wide text-lg sm:text-xl">{profile.fullName}</p> : null}
          {profile.jobTitle ? <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted">{profile.jobTitle}</p> : null}
          {profile.email ? (
            <a href={`mailto:${profile.email}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
              {profile.email}
            </a>
          ) : null}
        </div>
        <nav aria-label="Sections de l'accueil">
          <ul className="flex flex-col">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.06em]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {external.length > 0 ? (
          <nav aria-label="Liens externes">
            <ul className="flex flex-col">
              {external.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold uppercase tracking-[0.06em]"
                  >
                    {link.label}
                    <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
