import { describe, expect, it } from "vitest";

import {
  ARTICLE_LIMITS,
  ARTICLE_MESSAGES,
  articleDraftInputFromFormData,
  articleDraftSchema,
  confirmedVersionSchema,
  coverSchema,
  createArticleSchema,
  formatTime,
  hasErrors,
  publishBlockers,
  savedAtMessage,
  slugProblem,
} from "./article";

const ID = "00000000-0000-7000-8000-000000000001";
const VERSION = "2026-11-12T10:00:00.000Z";

function draft(fields: Record<string, unknown>) {
  return articleDraftSchema.safeParse({ id: ID, version: VERSION, ...fields });
}

describe("articleDraftSchema", () => {
  it("rogne les champs sur une ligne, garde le contenu tel quel (retours à la ligne normalisés)", () => {
    const parsed = draft({ title: "  Titre  ", slug: " mon-slug ", description: " d ", category: " c ", author: " a ", content: "  x  \r\ny" });
    expect(parsed.success && parsed.data).toMatchObject({
      title: "Titre",
      slug: "mon-slug",
      description: "d",
      category: "c",
      author: "a",
      content: "  x  \ny",
    });
  });

  it("accepte un brouillon vide (champs absents compris)", () => {
    const parsed = draft({});
    expect(parsed.success && parsed.data).toMatchObject({ title: "", slug: "", content: "" });
  });

  it.each([
    ["title", ARTICLE_LIMITS.title, ARTICLE_MESSAGES.titleTooLong],
    ["description", ARTICLE_LIMITS.description, ARTICLE_MESSAGES.descriptionTooLong],
    ["category", ARTICLE_LIMITS.category, ARTICLE_MESSAGES.categoryTooLong],
    ["author", ARTICLE_LIMITS.author, ARTICLE_MESSAGES.authorTooLong],
    ["content", ARTICLE_LIMITS.content, ARTICLE_MESSAGES.contentTooLong],
  ] as const)("limite %s à %i caractères", (field, max, message) => {
    expect(draft({ [field]: "é".repeat(max) }).success).toBe(true);
    const parsed = draft({ [field]: "é".repeat(max + 1) });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toBe(message);
  });

  it("compte les caractères, pas les unités UTF-16 (emoji)", () => {
    expect(draft({ title: "😀".repeat(ARTICLE_LIMITS.title) }).success).toBe(true);
  });

  it("refuse un identifiant ou un jeton mal formé", () => {
    expect(articleDraftSchema.safeParse({ id: "x", version: VERSION }).success).toBe(false);
    const parsed = articleDraftSchema.safeParse({ id: ID, version: "hier" });
    expect(parsed.error?.issues[0].message).toBe(ARTICLE_MESSAGES.versionInvalid);
  });

  it("lit le formulaire sans prendre de fichier ni de statut", () => {
    const data = new FormData();
    data.set("title", "t");
    data.set("status", "PUBLISHED");
    data.set("file", new File(["x"], "x.png"));
    expect(Object.keys(articleDraftInputFromFormData(data)).sort()).toEqual(
      ["author", "category", "content", "description", "id", "slug", "title", "version"].sort(),
    );
  });
});

describe("slugProblem", () => {
  it("vide permis, non conforme refusé (jamais réécrit)", () => {
    expect(slugProblem("")).toBeNull();
    expect(slugProblem("mon-article-2")).toBeNull();
    for (const value of ["Mon-article", "mon article", "mon--article", "-mon", "café", "a".repeat(81)]) {
      expect(slugProblem(value)).toBe(ARTICLE_MESSAGES.slugInvalid);
    }
  });
});

describe("publishBlockers (E55 a)", () => {
  it("titre, slug et contenu exigés, chacun avec son message", () => {
    expect(publishBlockers({ title: "", slug: "", content: "" })).toEqual({
      title: ARTICLE_MESSAGES.publishTitleEmpty,
      slug: ARTICLE_MESSAGES.publishSlugEmpty,
      content: ARTICLE_MESSAGES.publishContentEmpty,
    });
    expect(publishBlockers({ title: " ", slug: "s", content: "\n\t" })).toEqual({
      title: ARTICLE_MESSAGES.publishTitleEmpty,
      content: ARTICLE_MESSAGES.publishContentEmpty,
    });
    expect(hasErrors(publishBlockers({ title: "t", slug: "s", content: "c" }))).toBe(false);
  });
});

describe("autres schémas", () => {
  it("création : titre obligatoire", () => {
    expect(createArticleSchema.safeParse({ title: "  " }).error?.issues[0].message).toBe(ARTICLE_MESSAGES.titleRequired);
    expect(createArticleSchema.safeParse({ title: " Titre " }).data).toEqual({ title: "Titre" });
  });

  it("publication et abandon : confirmed doit valoir « 1 »", () => {
    expect(confirmedVersionSchema.safeParse({ id: ID, version: VERSION, confirmed: "1" }).success).toBe(true);
    for (const confirmed of [undefined, null, "0", "true", 1]) {
      expect(confirmedVersionSchema.safeParse({ id: ID, version: VERSION, confirmed }).success).toBe(false);
    }
  });

  it("couverture : un fichier non vide est exigé", () => {
    expect(coverSchema.safeParse({ id: ID, version: VERSION, file: new File([], "vide.png") }).success).toBe(false);
    expect(coverSchema.safeParse({ id: ID, version: VERSION, file: "texte" }).success).toBe(false);
    expect(coverSchema.safeParse({ id: ID, version: VERSION, file: new File(["x"], "x.png") }).success).toBe(true);
  });
});

describe("heures affichées", () => {
  it("heure de Paris (« Enregistré à hh:mm »)", () => {
    expect(formatTime(new Date("2026-11-12T13:05:00.000Z"))).toBe("14:05");
    expect(formatTime(new Date("2026-07-12T13:05:00.000Z"))).toBe("15:05");
    expect(savedAtMessage(new Date("2026-11-12T13:05:00.000Z"))).toBe("Enregistré à 14:05");
  });
});
