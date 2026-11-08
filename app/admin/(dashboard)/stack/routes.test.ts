import { describe, expect, it } from "vitest";

import { TECHNOLOGY_RESULTS, technologyResultView } from "./routes";

describe("technologyResultView", () => {
  it.each(["creee", "modifiee", "supprimee", "supprimee-detachee"] as const)("%s : message de succès", (key) => {
    expect(technologyResultView(key)).toEqual({ message: TECHNOLOGY_RESULTS[key], tone: "success" });
  });

  it.each(["modifiee-ancienne-icone", "supprimee-icone-conservee", "supprimee-detachee-icone-conservee"] as const)(
    "%s : avertissement qui indique que le fichier est resté dans le stockage",
    (key) => {
      const view = technologyResultView(key);
      expect(view?.tone).toBe("warning");
      expect(view?.message).toMatch(/Attention/);
      expect(view?.message).toMatch(/n’a pas pu être supprimée du stockage/);
    },
  );

  it("ignore une valeur inconnue ou mal formée", () => {
    expect(technologyResultView("autre")).toBeUndefined();
    expect(technologyResultView(["creee"])).toBeUndefined();
    expect(technologyResultView(undefined)).toBeUndefined();
    expect(technologyResultView("toString")).toBeUndefined();
  });
});
