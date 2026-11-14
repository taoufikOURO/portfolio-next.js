import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetFakes, revalidatedPaths } from "@/test/fakes";

vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));

import { publicPathsFor, revalidatePublic } from "./revalidate";

beforeEach(() => resetFakes());

describe("revalidatePublic", () => {
  it("articles : liste, toutes les pages d'article (groupe de routes compris), plan du site et accueil", () => {
    revalidatePublic("articles");
    expect(revalidatedPaths).toEqual(["/articles", "/(site)/articles/[slug] (page)", "/sitemap.xml", "/"]);
  });

  it("projets : accueil (éventail), liste, détail et plan du site", () => {
    revalidatePublic("projects");
    expect(revalidatedPaths).toEqual(["/", "/projets", "/(site)/projets/[slug] (page)", "/sitemap.xml"]);
  });

  it("profil : tout le site (barre, pied de page, métadonnées)", () => {
    revalidatePublic("profile");
    expect(revalidatedPaths).toEqual(["/ (layout)"]);
  });

  it("plusieurs contenus : chaque chemin une seule fois", () => {
    expect(publicPathsFor(["educations", "skills"]).map((entry) => entry.path)).toEqual(["/formations", "/competences", "/"]);
    expect(publicPathsFor(["technologies"]).map((entry) => entry.path)).toEqual([
      "/projets",
      "/(site)/projets/[slug]",
      "/competences",
      "/",
    ]);
  });
});
