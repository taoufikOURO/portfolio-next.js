import "server-only";

import { revalidatePath } from "next/cache";

// Invalidation des pages publiques après une écriture dans l'admin (E64).
// Les pages publiques sont rendues une fois puis gardées en cache (ISR) :
// chaque action qui change un contenu visible appelle `revalidatePublic` avec
// les contenus touchés, en plus de sa propre revalidation de l'admin.
//
// Les routes dynamiques sont désignées par leur fichier, groupe de routes
// compris (`/(site)/articles/[slug]`, type « page ») : toutes leurs URL sont
// invalidées, y compris l'ancienne adresse d'un contenu dont le slug change.

export type PublicScope = "articles" | "projects" | "profile" | "educations" | "skills" | "technologies";

export type PublicPath = { path: string; type?: "page" | "layout" };

const ARTICLE_PAGE: PublicPath = { path: "/(site)/articles/[slug]", type: "page" };
const PROJECT_PAGE: PublicPath = { path: "/(site)/projets/[slug]", type: "page" };
const SITEMAP: PublicPath = { path: "/sitemap.xml" };
const HOME: PublicPath = { path: "/" };

export const PUBLIC_PATHS: Readonly<Record<PublicScope, readonly PublicPath[]>> = {
  // L'accueil (E66) montre aussi les derniers articles, le parcours, les compétences et la stack.
  articles: [{ path: "/articles" }, ARTICLE_PAGE, SITEMAP, HOME],
  // L'accueil montre les projets publiés (éventail et section « Projets »).
  projects: [HOME, { path: "/projets" }, PROJECT_PAGE, SITEMAP],
  // Nom, titre et photo apparaissent sur toutes les pages (barre, pied de page, métadonnées).
  profile: [{ path: "/", type: "layout" }],
  educations: [{ path: "/formations" }, { path: "/competences" }, HOME],
  skills: [{ path: "/competences" }, { path: "/formations" }, HOME],
  technologies: [{ path: "/projets" }, PROJECT_PAGE, { path: "/competences" }, HOME],
};

/** Chemins à invalider pour ces contenus, sans doublon, dans l'ordre de `PUBLIC_PATHS`. */
export function publicPathsFor(scopes: readonly PublicScope[]): PublicPath[] {
  const seen = new Set<string>();
  const paths: PublicPath[] = [];
  for (const scope of scopes) {
    for (const entry of PUBLIC_PATHS[scope]) {
      const key = `${entry.path}|${entry.type ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push(entry);
    }
  }
  return paths;
}

export function revalidatePublic(...scopes: PublicScope[]): void {
  for (const { path, type } of publicPathsFor(scopes)) {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  }
}
