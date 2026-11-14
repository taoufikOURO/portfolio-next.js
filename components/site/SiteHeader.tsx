import Link from "next/link";

import { SiteNav } from "./SiteNav";

/** Barre du site, collée en haut au défilement : nom du profil (lien vers l'accueil) et liens des pages. */
export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <div className="site-shell flex min-h-16 items-center justify-between gap-4 py-2">
        <Link href="/" className="site-wide inline-flex min-h-11 items-center text-sm sm:text-base">
          {name || "Accueil"}
          {name ? <span className="sr-only"> : accueil</span> : null}
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
