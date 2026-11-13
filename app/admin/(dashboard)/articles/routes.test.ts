import { describe, expect, it } from "vitest";

import { ARTICLE_RESULTS, articleResultView, publishedResult } from "./routes";

describe("articleResultView", () => {
  it("ne réaffiche que des messages fixes", () => {
    expect(articleResultView("<script>")).toBeUndefined();
    expect(articleResultView(["publie"])).toBeUndefined();
    expect(articleResultView("toString")).toBeUndefined();
    expect(articleResultView(undefined)).toBeUndefined();
    expect(articleResultView("publie")).toEqual({ key: "publie", message: ARTICLE_RESULTS.publie, tone: "success" });
  });

  it("tonalités : avertissement si une image reste, erreur si la publication est refusée", () => {
    expect(articleResultView("republie-ancienne-image")?.tone).toBe("warning");
    expect(articleResultView("supprime-image-conservee")?.tone).toBe("warning");
    expect(articleResultView("rien-a-publier")?.tone).toBe("warning");
    expect(articleResultView("publication-incomplete")?.tone).toBe("error");
  });

  it("chaque message d'avertissement commence par « Attention » ou explique pourquoi rien n'a changé", () => {
    for (const key of ["publie-ancienne-image", "republie-ancienne-image", "abandonne-image-conservee", "supprime-image-conservee"] as const) {
      expect(ARTICLE_RESULTS[key]).toContain("Attention");
    }
  });
});

describe("publishedResult", () => {
  it("distingue première publication et republication", () => {
    expect(publishedResult(true, false)).toBe("publie");
    expect(publishedResult(false, false)).toBe("republie");
    expect(publishedResult(true, true)).toBe("publie-ancienne-image");
    expect(publishedResult(false, true)).toBe("republie-ancienne-image");
  });
});
