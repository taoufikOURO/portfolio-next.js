import { ArrowUpRight, Mail } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { PageHero } from "@/components/site/PageHero";
import { SiteImage } from "@/components/site/SiteImage";
import { siteNameOf } from "@/lib/public/content";
import { getPublicProfile } from "@/lib/public/queries";
import { openGraphImages } from "@/lib/public/site";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublicProfile();
  const name = siteNameOf(profile);
  return {
    title: "Profil",
    description: profile.bio || profile.jobTitle || undefined,
    alternates: { canonical: "/profil" },
    openGraph: { type: "profile", title: `Profil | ${name}`, images: openGraphImages(profile.photo, name) },
  };
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default async function ProfilePage() {
  const profile = await getPublicProfile();
  const links = [
    profile.githubUrl ? { href: profile.githubUrl, label: "GitHub" } : null,
    profile.linkedinUrl ? { href: profile.linkedinUrl, label: "LinkedIn" } : null,
    profile.resumeHref ? { href: profile.resumeHref, label: "Voir le CV" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <main id="contenu">
      <PageHero eyebrow={profile.jobTitle || "Profil"} title="Profil" label={profile.fullName ? `Profil de ${profile.fullName}` : "Profil"} />

      <div className="site-shell mt-12 grid gap-12 sm:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden="true" className="site-block absolute -right-3 -top-4 h-3/4 w-2/5 rounded-[1.25rem] bg-signal" />
          <div className="site-card-face site-reveal relative aspect-[3/4] rotate-2">
            <SiteImage image={profile.photo} alt={profile.fullName ? `Photo de ${profile.fullName}` : ""} sizes="(min-width: 1024px) 448px, 90vw" eager />
          </div>
        </div>

        <div className="min-w-0">
          {profile.fullName ? (
            <h2 className="site-wide site-reveal text-[clamp(1.8rem,5vw,3.5rem)] leading-[0.95]" style={{ "--order": 1 } as CSSProperties}>
              {profile.fullName}
            </h2>
          ) : null}
          {profile.jobTitle ? (
            <p className="site-reveal mt-3 text-sm font-bold uppercase tracking-[0.1em] text-muted" style={{ "--order": 2 } as CSSProperties}>
              {profile.jobTitle}
            </p>
          ) : null}
          {profile.bio ? (
            <p className="site-reveal mt-8 text-xl leading-relaxed sm:text-2xl" style={{ "--order": 3 } as CSSProperties}>
              {profile.bio}
            </p>
          ) : null}
          {profile.about ? (
            <div className="site-reveal mt-6 grid gap-4 leading-relaxed text-muted" style={{ "--order": 4 } as CSSProperties}>
              {paragraphs(profile.about).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line [overflow-wrap:anywhere]">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}
          {!profile.fullName && !profile.bio && !profile.about ? (
            <p className="mt-2 font-semibold">Le profil n&apos;est pas encore renseigné.</p>
          ) : null}

          {links.length > 0 || profile.email ? (
            <ul className="site-reveal mt-10 flex flex-wrap gap-3" style={{ "--order": 5 } as CSSProperties}>
              {profile.email ? (
                <li>
                  <a href={`mailto:${profile.email}`} className="site-button site-button-primary">
                    <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    Écrire un e-mail
                  </a>
                </li>
              ) : null}
              {links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="site-button site-button-secondary">
                    {link.label}
                    <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </main>
  );
}
