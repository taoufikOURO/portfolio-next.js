import { describe, expect, it } from "vitest";

import {
  deleteProjectPath,
  NEW_PROJECT_PATH,
  projectPath,
  projectPublicationPath,
  projectResultView,
  PROJECT_RESULTS,
  savedResult,
} from "./routes";

describe("chemins", () => {
  it("URL en français ; « nouveau » au masculin (un projet)", () => {
    expect(NEW_PROJECT_PATH).toBe("/admin/projets/nouveau");
    expect(projectPath("a")).toBe("/admin/projets/a");
    expect(projectPublicationPath("a")).toBe("/admin/projets/a/publication");
    expect(deleteProjectPath("a")).toBe("/admin/projets/a/supprimer");
  });
});

describe("projectResultView", () => {
  it.each(["cree", "modifie", "publie", "depublie", "supprime", "collaborateur-recupere"] as const)(
    "%s : message de succès",
    (key) => {
      expect(projectResultView(key)).toEqual({ message: PROJECT_RESULTS[key], tone: "success" });
    },
  );

  it.each([
    "cree-github",
    "modifie-github",
    "modifie-ancienne-image",
    "modifie-ancienne-image-github",
    "supprime-image-conservee",
    "collaborateur-echec",
    "statut-inchange",
  ] as const)("%s : avertissement", (key) => {
    const view = projectResultView(key);
    expect(view?.tone).toBe("warning");
  });

  it("les avertissements d'échec commencent par « Attention » ou le contiennent", () => {
    for (const key of ["cree-github", "modifie-ancienne-image", "supprime-image-conservee", "collaborateur-echec"] as const) {
      expect(PROJECT_RESULTS[key]).toMatch(/Attention/);
    }
  });

  it("ignore une valeur inconnue ou mal formée", () => {
    expect(projectResultView("autre")).toBeUndefined();
    expect(projectResultView(["cree"])).toBeUndefined();
    expect(projectResultView(undefined)).toBeUndefined();
    expect(projectResultView("toString")).toBeUndefined();
  });
});

describe("savedResult", () => {
  it("choisit le message selon les avertissements", () => {
    expect(savedResult("create", { previousImageKept: false, githubFailed: false })).toBe("cree");
    expect(savedResult("create", { previousImageKept: false, githubFailed: true })).toBe("cree-github");
    expect(savedResult("update", { previousImageKept: false, githubFailed: false })).toBe("modifie");
    expect(savedResult("update", { previousImageKept: true, githubFailed: false })).toBe("modifie-ancienne-image");
    expect(savedResult("update", { previousImageKept: false, githubFailed: true })).toBe("modifie-github");
    expect(savedResult("update", { previousImageKept: true, githubFailed: true })).toBe("modifie-ancienne-image-github");
  });
});
