import { describe, expect, it } from "vitest";

import {
  emptyTally,
  formatTally,
  frenchMonthToValue,
  isLegacyArticlePublic,
  isPersonalKey,
  legacyDay,
  legacyProjectLinks,
  looksPersonal,
  parseImportArgs,
  personalFieldPaths,
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

  it("repère les champs personnels par leur nom, sans lire leur valeur", () => {
    for (const key of ["email", "E-mail", "téléphone", "phone", "adresse", "codePostal", "dateNaissance", "date_de_naissance", "birthday"]) {
      expect(isPersonalKey(key), key).toBe(true);
    }
    for (const key of ["nom", "prenom", "bio", "lieu", "etablissement", "github", "date"]) {
      expect(isPersonalKey(key), key).toBe(false);
    }
    expect(
      personalFieldPaths("profile.json", {
        nom: "Exemple",
        email: "a@exemple.invalid",
        contact: { telephone: "00 00 00 00 00" },
        liste: [{ adresse: "x" }, { adresse: "y" }],
      }),
    ).toEqual(["profile.json : contact.telephone", "profile.json : email", "profile.json : liste[].adresse"]);
  });

  it("signale un texte qui ressemble à un e-mail ou à un téléphone", () => {
    expect(looksPersonal("Écrivez à quelqu.un@exemple.invalid")).toBe(true);
    expect(looksPersonal("Appel au 06 12 34 56 78")).toBe(true);
    expect(looksPersonal("Projet réalisé en 2025 avec Next.js 16")).toBe(false);
  });

  it("article public : daté au plus tard aujourd'hui, sans marque de brouillon", () => {
    const today = new Date("2026-11-14T12:00:00Z");
    const past = new Date("2025-03-01T12:00:00Z");
    const future = new Date("2027-01-01T12:00:00Z");
    expect(isLegacyArticlePublic({}, past, today)).toBe(true);
    expect(isLegacyArticlePublic({}, future, today)).toBe(false);
    expect(isLegacyArticlePublic({ estPublie: false }, past, today)).toBe(false);
    expect(isLegacyArticlePublic({ brouillon: true }, past, today)).toBe(false);
    expect(isLegacyArticlePublic({ published: true }, future, today)).toBe(false);
  });

  it("lit une date d'article AAAA-MM-JJ, sinon null", () => {
    expect(legacyDay("2025-03-14")?.toISOString()).toBe("2025-03-14T12:00:00.000Z");
    expect(legacyDay("14/03/2025")).toBeNull();
    expect(legacyDay(undefined)).toBeNull();
  });

  it("options : simulation par défaut, modes exclusifs, option inconnue refusée", () => {
    expect(parseImportArgs([])).toEqual({ ok: true, options: { apply: false, confirmProduction: false } });
    expect(parseImportArgs(["--dry-run"])).toEqual({ ok: true, options: { apply: false, confirmProduction: false } });
    expect(parseImportArgs(["--", "--apply", "--confirm-production"])).toEqual({
      ok: true,
      options: { apply: true, confirmProduction: true },
    });
    expect(parseImportArgs(["--apply", "--dry-run"]).ok).toBe(false);
    expect(parseImportArgs(["--confirm-prod"]).ok).toBe(false);
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
