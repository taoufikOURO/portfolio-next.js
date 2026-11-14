/**
 * Navigation du site (E67) : uniquement des ancres vers les sections de
 * l'accueil, depuis n'importe quelle page. Les pages complètes ne s'ouvrent
 * que par le bouton « Voir plus » de chaque section.
 *
 * `id` : identifiant de la section sur l'accueil. `pages` : préfixes des
 * pages qui détaillent cette section (le lien est marqué courant quand on s'y
 * trouve).
 */
export const SITE_LINKS = [
  { id: "a-propos", href: "/#a-propos", label: "À propos", pages: ["/profil"] },
  { id: "projets", href: "/#projets", label: "Projets", pages: ["/projets"] },
  { id: "parcours", href: "/#parcours", label: "Parcours", pages: ["/formations"] },
  { id: "competences", href: "/#competences", label: "Compétences", pages: ["/competences"] },
  { id: "articles", href: "/#articles", label: "Articles", pages: ["/articles"] },
  { id: "contact", href: "/#contact", label: "Contact", pages: [] },
] as const satisfies readonly { id: string; href: string; label: string; pages: readonly string[] }[];

export type SectionId = (typeof SITE_LINKS)[number]["id"];

/** Section correspondant à une page de détail (`/projets/x` → `projets`), sinon `null`. */
export function sectionOfPath(pathname: string): SectionId | null {
  for (const link of SITE_LINKS) {
    if (link.pages.some((page: string) => pathname === page || pathname.startsWith(`${page}/`))) return link.id;
  }
  return null;
}
