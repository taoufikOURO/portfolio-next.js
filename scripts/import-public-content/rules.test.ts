import { describe, expect, it } from "vitest";

import {
  emptyTally,
  formatTally,
  frenchMonthToValue,
  legacyProjectLinks,
  localPublicPath,
  skip,
  stripLeadingTitle,
  withHttps,
} from "./rules";

describe("règles de l'import", () => {
  it("convertit un mois écrit en français", () => {
    expect(frenchMonthToValue("Octobre 2025")).toBe("2025-10");
    expect(frenchMonthToValue("Août 2025")).toBe("2025-08");
    expect(frenchMonthToValue("février 2024")).toBe("2024-02");
    expect(frenchMonthToValue("2025")).toBeNull();
    expect(frenchMonthToValue(undefined)).toBeNull();
  });

  it("retire le titre de première ligne du Markdown", () => {
    expect(stripLeadingTitle("# Titre\n\nTexte")).toBe("Texte");
    expect(stripLeadingTitle("Texte\n# Pas en tête")).toBe("Texte\n# Pas en tête");
  });

  it("complète un lien sans protocole", () => {
    expect(withHttps("linkedin.com/in/exemple")).toBe("https://linkedin.com/in/exemple");
    expect(withHttps("https://github.com/exemple")).toBe("https://github.com/exemple");
    expect(withHttps("")).toBe("");
  });

  it("liens d'un ancien projet : le site d'abord, puis les dépôts", () => {
    expect(
      legacyProjectLinks({
        lien: "https://exemple.org",
        github: [{ nom: "Dépôt", url: "https://github.com/exemple/depot" }, { nom: "Vide", url: "" }],
      }),
    ).toEqual({ labels: ["Voir le projet", "Dépôt"], urls: ["https://exemple.org", "https://github.com/exemple/depot"] });
  });

  it("image locale seulement, sans remontée de dossier", () => {
    expect(localPublicPath("/images/projets/a.png")).toBe("images/projets/a.png");
    expect(localPublicPath("https://exemple.org/a.png")).toBeNull();
    expect(localPublicPath("/images/../.env")).toBeNull();
    expect(localPublicPath("")).toBeNull();
  });

  it("compteurs : aucun contenu, seulement des nombres et des raisons", () => {
    const tally = emptyTally();
    tally.create = 2;
    tally.existing = 1;
    skip(tally, "image de plus de 1 Mo");
    expect(formatTally("Projets", tally, false)).toBe("Projets : 2 à créer, 1 déjà présent(s) ; 1 ignoré(s) : image de plus de 1 Mo");
    expect(formatTally("Projets", emptyTally(), true)).toBe("Projets : 0 créé(s), 0 déjà présent(s)");
  });
});
