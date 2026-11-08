import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import {
  createTechnology,
  decideTechnologyDeletion,
  deleteTechnology,
  findDuplicateTechnologyName,
  listTechnologies,
  moveTechnology,
  updateTechnology,
} from "./technologies";
import { normalizeTechnologyName } from "./validation/technology";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));

beforeEach(() => resetFakes());

function addTechnology(name: string, position: number, iconPath = `${fakeId()}.png`) {
  const technology = { id: fakeId(), name, normalizedName: normalizeTechnologyName(name), iconPath, position };
  fakeDb.technologies.push(technology);
  return technology;
}

function addProject(title: string, position = 0, technologyIds: string[] = []) {
  const project = { id: fakeId(), title, position };
  fakeDb.projects.push(project);
  for (const technologyId of technologyIds) fakeDb.projectTechnologies.push({ projectId: project.id, technologyId });
  return project;
}

describe("decideTechnologyDeletion", () => {
  const A = "a";
  const B = "b";
  const C = "c";

  it.each([
    ["aucun projet, sans confirmation", [], null, "delete"],
    ["aucun projet, avec confirmation vide", [], [], "delete"],
    ["aucun projet, confirmation d'un projet détaché depuis", [], [A], "delete"],
    ["un projet, sans confirmation", [A], null, "blocked"],
    ["un projet, confirmation vide", [A], [], "blocked"],
    ["un projet, confirmé", [A], [A], "delete"],
    ["deux projets, un seul confirmé", [A, B], [A], "blocked"],
    ["deux projets, tous confirmés", [A, B], [B, A], "delete"],
    ["projet lié après l'affichage de la confirmation", [A, B, C], [A, B], "blocked"],
    ["confirmation plus large que les liens actuels", [A], [A, B], "delete"],
    ["confirmation d'un autre projet", [A], [B], "blocked"],
  ] as const)("%s", (_label, linked, confirmed, expected) => {
    expect(decideTechnologyDeletion(linked, confirmed)).toBe(expected);
  });
});

describe("createTechnology", () => {
  it("ajoute en dernière position, clé normalisée", async () => {
    addTechnology("React", 0);
    addTechnology("Vue", 4);

    const result = await createTechnology("Next.js", "chemin.png");
    expect(result.status).toBe("saved");
    expect(fakeDb.technologies.at(-1)).toMatchObject({
      name: "Next.js",
      normalizedName: "next.js",
      iconPath: "chemin.png",
      position: 5,
    });
  });

  it("commence à la position 0", async () => {
    await createTechnology("React", "chemin.png");
    expect(fakeDb.technologies[0].position).toBe(0);
  });

  it("refuse un doublon sans rien écrire, avec le nom existant", async () => {
    addTechnology("Développement Web", 0);
    expect(await createTechnology("developpement   web", "chemin.png")).toEqual({
      status: "duplicate",
      existingName: "Développement Web",
    });
    expect(fakeDb.technologies).toHaveLength(1);
  });

  it("verrouille l'ordre pendant la création", async () => {
    await createTechnology("React", "chemin.png");
    expect(fakeDb.calls.executeRaw.some((query) => query.includes("pg_advisory_xact_lock"))).toBe(true);
  });
});

describe("findDuplicateTechnologyName", () => {
  it("trouve le nom existant malgré casse, accents et espaces", async () => {
    addTechnology("Développement Web", 0);
    expect(await findDuplicateTechnologyName("DEVELOPPEMENT  web")).toBe("Développement Web");
    expect(await findDuplicateTechnologyName("Autre")).toBeNull();
  });

  it("ignore la technologie en cours de modification", async () => {
    const react = addTechnology("react", 0);
    expect(await findDuplicateTechnologyName("React", react.id)).toBeNull();
    expect(await findDuplicateTechnologyName("React")).toBe("react");
  });
});

describe("updateTechnology", () => {
  it("change la casse de son propre nom", async () => {
    const react = addTechnology("react", 0);
    expect(await updateTechnology(react.id, { name: "React" })).toMatchObject({ status: "saved" });
    expect(fakeDb.technologies[0]).toMatchObject({ name: "React", normalizedName: "react" });
  });

  it("garde le chemin de l'icône sans `iconPath`, le change avec", async () => {
    const react = addTechnology("React", 0, "ancien.png");
    await updateTechnology(react.id, { name: "React" });
    expect(fakeDb.technologies[0].iconPath).toBe("ancien.png");
    await updateTechnology(react.id, { name: "React", iconPath: "nouveau.png" });
    expect(fakeDb.technologies[0].iconPath).toBe("nouveau.png");
  });

  it("refuse le nom d'une autre technologie", async () => {
    addTechnology("Vue", 0);
    const react = addTechnology("React", 1);
    expect(await updateTechnology(react.id, { name: "vue" })).toEqual({ status: "duplicate", existingName: "Vue" });
    expect(fakeDb.technologies[1].name).toBe("React");
  });

  it("technologie supprimée entre-temps", async () => {
    expect(await updateTechnology(fakeId(), { name: "React" })).toEqual({ status: "not-found" });
  });
});

describe("deleteTechnology", () => {
  it("supprime une technologie inutilisée sans confirmation", async () => {
    const react = addTechnology("React", 0);
    expect(await deleteTechnology(react.id, null)).toEqual({
      status: "deleted",
      name: "React",
      detachedCount: 0,
      iconPath: react.iconPath,
    });
    expect(fakeDb.technologies).toHaveLength(0);
  });

  it("bloque une technologie utilisée sans confirmation et liste les projets", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);
    const outcome = await deleteTechnology(react.id, null);
    expect(outcome).toMatchObject({ status: "blocked" });
    if (outcome.status === "blocked") expect(outcome.technology.projects).toEqual([{ id: portfolio.id, title: "Portfolio" }]);
    expect(fakeDb.technologies).toHaveLength(1);
    expect(fakeDb.projectTechnologies).toHaveLength(1);
  });

  it("supprime après confirmation, détache les liens, garde les projets", async () => {
    const react = addTechnology("React", 0);
    const vue = addTechnology("Vue", 1);
    const first = addProject("Premier", 0, [react.id, vue.id]);
    const second = addProject("Second", 1, [react.id]);

    expect(await deleteTechnology(react.id, [first.id, second.id])).toEqual({
      status: "deleted",
      name: "React",
      detachedCount: 2,
      iconPath: react.iconPath,
    });
    expect(fakeDb.technologies.map((technology) => technology.name)).toEqual(["Vue"]);
    expect(fakeDb.projectTechnologies).toEqual([{ projectId: first.id, technologyId: vue.id }]);
    expect(fakeDb.projects).toHaveLength(2);
  });

  it("bloque si un projet a été lié après l'affichage de la confirmation", async () => {
    const react = addTechnology("React", 0);
    const first = addProject("Premier", 0, [react.id]);
    const late = addProject("Tardif", 1, [react.id]);

    const outcome = await deleteTechnology(react.id, [first.id]);
    expect(outcome.status).toBe("blocked");
    if (outcome.status === "blocked") {
      expect(outcome.technology.projects.map((project) => project.id)).toEqual([first.id, late.id]);
    }
    expect(fakeDb.technologies).toHaveLength(1);
  });

  it("technologie introuvable", async () => {
    expect(await deleteTechnology(fakeId(), null)).toEqual({ status: "not-found" });
  });

  it("verrouille la ligne pendant la suppression", async () => {
    const react = addTechnology("React", 0);
    await deleteTechnology(react.id, null);
    expect(fakeDb.calls.executeRaw.some((query) => query.includes("FOR UPDATE"))).toBe(true);
  });
});

describe("moveTechnology", () => {
  it("échange avec la voisine et écrit des positions 0, 1, 2…", async () => {
    const a = addTechnology("A", 0);
    const b = addTechnology("B", 1);
    const c = addTechnology("C", 2);

    expect(await moveTechnology(c.id, "up")).toEqual({ status: "moved", name: "C", position: 2, total: 3 });
    const order = (await listTechnologies()).map((technology) => [technology.name, technology.position]);
    expect(order).toEqual([["A", 0], ["C", 1], ["B", 2]]);
    expect([a, b, c].map((technology) => technology.position)).toEqual([0, 2, 1]);
  });

  it("renumérote après des trous laissés par des suppressions", async () => {
    addTechnology("A", 0);
    const b = addTechnology("B", 3);
    addTechnology("C", 7);

    await moveTechnology(b.id, "down");
    expect((await listTechnologies()).map((technology) => [technology.name, technology.position])).toEqual([
      ["A", 0],
      ["C", 1],
      ["B", 2],
    ]);
  });

  it("refuse en bout de liste, sans rien écrire", async () => {
    const a = addTechnology("A", 0);
    const b = addTechnology("B", 1);
    expect(await moveTechnology(a.id, "up")).toEqual({ status: "edge", name: "A" });
    expect(await moveTechnology(b.id, "down")).toEqual({ status: "edge", name: "B" });
    expect([a.position, b.position]).toEqual([0, 1]);
  });

  it("technologie introuvable", async () => {
    addTechnology("A", 0);
    expect(await moveTechnology(fakeId(), "up")).toEqual({ status: "not-found" });
  });
});
