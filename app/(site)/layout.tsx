import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import { SiteFooter } from "@/components/site/SiteFooter";
import { ScrollReveal } from "@/components/site/ScrollReveal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteNameOf } from "@/lib/public/content";
import { getPublicProfile } from "@/lib/public/queries";
import { absoluteUrl, openGraphImages, siteUrl } from "@/lib/public/site";

import "./site.css";

/**
 * Police du site public (E62) : Archivo, variable, axe de largeur compris
 * (`wdth` jusqu'à 125 %) pour les titres larges et gras ; servie par next/font.
 */
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublicProfile();
  const name = siteNameOf(profile);
  const description = profile.bio || profile.jobTitle || name;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: name, template: `%s | ${name}` },
    description,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: name,
      images: openGraphImages(profile.photo, name),
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#ececec",
  colorScheme: "light",
};

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getPublicProfile();
  const person = profile.fullName
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: profile.fullName,
        jobTitle: profile.jobTitle || undefined,
        description: profile.bio || undefined,
        image: profile.photo.isDefault ? undefined : profile.photo.src,
        url: siteUrl,
        sameAs: [profile.githubUrl, profile.linkedinUrl].filter(Boolean),
        mainEntityOfPage: absoluteUrl("/profil"),
      }
    : null;

  return (
    <div className={`site-root ${archivo.variable} min-h-dvh`}>
      <div aria-hidden="true" className="site-progress" />
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <SiteHeader name={profile.fullName} />
      {children}
      <SiteFooter profile={profile} />
      <ScrollReveal />
      {person ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      ) : null}
    </div>
  );
}
