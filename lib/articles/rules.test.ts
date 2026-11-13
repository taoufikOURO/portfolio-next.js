import { describe, expect, it } from "vitest";

import { SLUG_MAX_LENGTH } from "@/lib/slug";

import {
  coversToRemoveOnDelete,
  coverToRemoveOnDiscard,
  coverToRemoveOnPublish,
  coverToRemoveOnReplace,
  displayStatusOf,
  isCurrentVersion,
  nextUpdatedAt,
  publicationDates,
  sameContent,
  slugCandidate,
  versionToken,
} from "./rules";

describe("displayStatusOf", () => {
  it("brouillon, publié, modifications en attente", () => {
    expect(displayStatusOf({ status: "DRAFT", draftVersionId: "d" })).toBe("draft");
    expect(displayStatusOf({ status: "PUBLISHED", draftVersionId: null })).toBe("published");
    expect(displayStatusOf({ status: "PUBLISHED", draftVersionId: "d" })).toBe("pending");
  });
});

describe("jeton de version", () => {
  it("correspond à la milliseconde près", () => {
    const date = new Date("2026-11-12T10:00:00.123Z");
    expect(isCurrentVersion(date, versionToken(date))).toBe(true);
    expect(isCurrentVersion(date, "2026-11-12T10:00:00.124Z")).toBe(false);
    expect(isCurrentVersion(date, "n'importe quoi")).toBe(false);
    expect(isCurrentVersion(date, "")).toBe(false);
  });

  it("nextUpdatedAt avance toujours d'au moins une milliseconde", () => {
    const previous = new Date("2026-11-12T10:00:00.000Z");
    expect(nextUpdatedAt(previous, new Date("2026-11-12T10:00:05.000Z")).toISOString()).toBe("2026-11-12T10:00:05.000Z");
    expect(nextUpdatedAt(previous, previous).toISOString()).toBe("2026-11-12T10:00:00.001Z");
    // Horloge revenue en arrière : on avance quand même.
    expect(nextUpdatedAt(previous, new Date("2026-11-12T09:00:00.000Z")).toISOString()).toBe("2026-11-12T10:00:00.001Z");
  });
});

describe("publicationDates", () => {
  const now = new Date("2026-11-12T10:00:00.000Z");

  it("première publication : publishedAt maintenant, lastPublishedAt vide", () => {
    expect(publicationDates({ publishedAt: null }, now)).toEqual({ publishedAt: now, lastPublishedAt: null, first: true });
  });

  it("republication : publishedAt inchangée, lastPublishedAt maintenant", () => {
    const first = new Date("2026-01-01T00:00:00.000Z");
    expect(publicationDates({ publishedAt: first }, now)).toEqual({ publishedAt: first, lastPublishedAt: now, first: false });
  });
});

describe("images de couverture à supprimer", () => {
  it("remplacement : l'ancienne du brouillon, jamais celle de la version publiée", () => {
    expect(coverToRemoveOnReplace({ previous: "a.png", next: "b.png", published: null })).toBe("a.png");
    expect(coverToRemoveOnReplace({ previous: "a.png", next: "b.png", published: "a.png" })).toBeNull();
    expect(coverToRemoveOnReplace({ previous: null, next: "b.png", published: "a.png" })).toBeNull();
    expect(coverToRemoveOnReplace({ previous: "b.png", next: "b.png", published: null })).toBeNull();
  });

  it("publication : l'ancienne image en ligne si la nouvelle version ne l'utilise plus", () => {
    expect(coverToRemoveOnPublish({ oldPublished: "a.png", newPublished: "b.png" })).toBe("a.png");
    expect(coverToRemoveOnPublish({ oldPublished: "a.png", newPublished: "a.png" })).toBeNull();
    expect(coverToRemoveOnPublish({ oldPublished: "a.png", newPublished: null })).toBe("a.png");
    expect(coverToRemoveOnPublish({ oldPublished: null, newPublished: "b.png" })).toBeNull();
  });

  it("abandon : l'image du brouillon si la version publiée ne l'utilise pas", () => {
    expect(coverToRemoveOnDiscard({ draft: "b.png", published: "a.png" })).toBe("b.png");
    expect(coverToRemoveOnDiscard({ draft: "a.png", published: "a.png" })).toBeNull();
    expect(coverToRemoveOnDiscard({ draft: null, published: "a.png" })).toBeNull();
  });

  it("suppression : toutes, sans doublon", () => {
    expect(coversToRemoveOnDelete(["a.png", null, "a.png", "b.png"])).toEqual(["a.png", "b.png"]);
  });
});

describe("slugCandidate", () => {
  it("slug du titre, puis suffixes", () => {
    expect(slugCandidate("Bonjour le monde", 1)).toBe("bonjour-le-monde");
    expect(slugCandidate("Bonjour le monde", 2)).toBe("bonjour-le-monde-2");
    expect(slugCandidate("¿¡", 3)).toBe("");
  });

  it("le suffixe tient dans la longueur maximale", () => {
    const candidate = slugCandidate("a".repeat(200), 12);
    expect(candidate.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(candidate.endsWith("-12")).toBe(true);
  });
});

describe("sameContent", () => {
  const base = { title: "t", slug: "s", description: "d", category: "c", author: "a", content: "x" };
  it("compare chaque champ", () => {
    expect(sameContent(base, { ...base })).toBe(true);
    for (const field of Object.keys(base) as (keyof typeof base)[]) {
      expect(sameContent(base, { ...base, [field]: "autre" })).toBe(false);
    }
  });
});
