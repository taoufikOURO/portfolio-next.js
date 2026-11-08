import { describe, expect, it } from "vitest";

import { isValidSlug, slugify, SLUG_MAX_LENGTH } from "./slug";

describe("slugify", () => {
  it.each([
    ["Mon Projet", "mon-projet"],
    ["Café crème à Paris", "cafe-creme-a-paris"],
    ["  Portfolio   Next.js 16  ", "portfolio-next-js-16"],
    ["Œuvre & cœur", "oeuvre-coeur"],
    ["Straße", "strasse"],
    ["L’été — 2024 !", "l-ete-2024"],
    ["Développement", "developpement"],
    ["ﬁchier", "fichier"],
    ["---API---REST---", "api-rest"],
  ])("« %s » → « %s »", (title, slug) => {
    expect(slugify(title)).toBe(slug);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("renvoie une chaîne vide si le titre n'a ni lettre latine ni chiffre", () => {
    expect(slugify("东京")).toBe("");
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it(`coupe à ${SLUG_MAX_LENGTH} caractères, entre deux mots, sans tiret final`, () => {
    const slug = slugify("projet ".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug).toMatch(/^projet(-projet)*$/);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("coupe un mot trop long sans laisser de tiret", () => {
    const slug = slugify(`a ${"b".repeat(200)}`);
    expect(slug.length).toBe(SLUG_MAX_LENGTH);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe("isValidSlug", () => {
  it.each(["", "Mon-projet", "mon--projet", "-mon", "mon-", "mon projet", "café", "a".repeat(SLUG_MAX_LENGTH + 1)])(
    "refuse « %s »",
    (value) => {
      expect(isValidSlug(value)).toBe(false);
    },
  );

  it("accepte un slug de la longueur maximale", () => {
    expect(isValidSlug("a".repeat(SLUG_MAX_LENGTH))).toBe(true);
  });
});
