import type { Metadata } from "next";

import { DEFAULT_IMAGE_SRC, type SiteImage } from "./content";

// Réglages du site public qui ne sont pas du contenu : adresse du site, pour
// les URL absolues des métadonnées. Cache des pages : `revalidate = 3600`
// (repli d'une heure) dans chaque page, en plus de l'invalidation par l'admin (E64).

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Image Open Graph : l'image donnée (couverture, projet, photo), sinon l'image par défaut. */
export function openGraphImages(image: SiteImage | null, alt: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [{ url: absoluteUrl(image?.src ?? DEFAULT_IMAGE_SRC), alt }];
}
