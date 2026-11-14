import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SITE_LINKS, sectionOfPath } from "./links";

// Navigation par ancres (E67) : la barre et le pied de page ne mènent qu'aux
// sections de l'accueil ; les pages complètes s'ouvrent par « Voir plus ».

const sections = readFileSync(join(process.cwd(), "components", "site", "home", "Sections.tsx"), "utf8");

describe("navigation par ancres", () => {
  it("chaque lien est une ancre de l'accueil vers une section qui existe", () => {
    for (const link of SITE_LINKS) {
      expect(link.href).toBe(`/#${link.id}`);
      expect(sections, link.id).toContain(`id="${link.id}"`);
    }
  });

  it("les sections, dans l'ordre de la navigation", () => {
    expect(SITE_LINKS.map((link) => link.label)).toEqual(["À propos", "Projets", "Parcours", "Compétences", "Articles", "Contact"]);
  });

  it("chaque section détaillée a son bouton « Voir plus » vers sa page complète", () => {
    for (const href of ["/profil", "/projets", "/formations", "/competences", "/articles"]) {
      expect(sections).toMatch(new RegExp(`<MoreButton\\s+href="${href}"`));
    }
  });

  it("une page de détail est rattachée à sa section", () => {
    expect(sectionOfPath("/projets")).toBe("projets");
    expect(sectionOfPath("/projets/un-projet")).toBe("projets");
    expect(sectionOfPath("/formations")).toBe("parcours");
    expect(sectionOfPath("/articles/un-article")).toBe("articles");
    expect(sectionOfPath("/profil")).toBe("a-propos");
    expect(sectionOfPath("/projetsxyz")).toBeNull();
    expect(sectionOfPath("/")).toBeNull();
  });

  it("la barre et le pied de page n'utilisent que ces ancres", () => {
    for (const file of ["SiteNav.tsx", "SiteFooter.tsx"]) {
      const text = readFileSync(join(process.cwd(), "components", "site", file), "utf8");
      expect(text, file).toContain("SITE_LINKS");
      expect(text, file).not.toMatch(/href="\/(projets|articles|formations|competences|profil)"/);
    }
  });
});
