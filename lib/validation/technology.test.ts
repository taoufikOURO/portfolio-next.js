import { describe, expect, it } from "vitest";

import { cleanSkillName, normalizeSkillName } from "./skill";
import {
  cleanTechnologyName,
  createTechnologySchema,
  deleteTechnologyInputFromFormData,
  deleteTechnologySchema,
  duplicateTechnologyMessage,
  moveTechnologySchema,
  normalizeTechnologyName,
  technologyAtEdgeMessage,
  technologyIdField,
  technologyInUseMessage,
  technologyInputFromFormData,
  technologyMovedMessage,
  TECHNOLOGY_MESSAGES,
  TECHNOLOGY_NAME_MAX_LENGTH,
  updateTechnologySchema,
} from "./technology";

const ID = "01900000-0000-7000-8000-000000000001";
const OTHER_ID = "01900000-0000-7000-8000-000000000002";
const icon = (name = "icone.png") => new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });

describe("nom : mêmes règles que les compétences", () => {
  const samples = [
    "React",
    "  react  ",
    "Développement   Web",
    "DÉVELOPPEMENT WEB",
    "developpement web",
    "Node .js",
    "Type​Script",
    "ＲＥＡＣＴ",
    "ﬁrebase",
    "école",
    "Next.js",
    "C++",
    "C#",
  ];

  it.each(samples)("nettoyage et clé identiques pour %j", (sample) => {
    expect(cleanTechnologyName(sample)).toBe(cleanSkillName(sample));
    expect(normalizeTechnologyName(sample)).toBe(normalizeSkillName(sample));
  });

  it.each([
    ["Développement Web", "developpement   WEB"],
    ["React", " REACT "],
    ["TypeScript", "Type​Script"],
    ["Node.js", "NODE.JS"],
    ["École", "ecole"],
    ["École", "école"],
    ["React", "ＲＥＡＣＴ"],
  ])("%j et %j donnent la même clé", (a, b) => {
    expect(normalizeTechnologyName(a)).toBe(normalizeTechnologyName(b));
  });

  it.each([
    ["Java", "JavaScript"],
    ["C", "C++"],
    ["C++", "C#"],
    ["Next.js", "Nextjs"],
  ])("%j et %j restent distincts", (a, b) => {
    expect(normalizeTechnologyName(a)).not.toBe(normalizeTechnologyName(b));
  });

  it("la clé est en minuscules, sans accents ni espaces superflus", () => {
    expect(normalizeTechnologyName("  Développement   Web ")).toBe("developpement web");
  });
});

describe("createTechnologySchema", () => {
  it("accepte un nom et une icône, nom nettoyé", () => {
    const file = icon();
    const parsed = createTechnologySchema.safeParse({ name: "  Next.js  ", icon: file });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Next.js");
      expect(parsed.data.icon).toBe(file);
    }
  });

  it.each([
    ["absent", {}],
    ["null (aucun champ envoyé)", { icon: null }],
    ["fichier vide (aucun fichier choisi)", { icon: new File([], "", { type: "application/octet-stream" }) }],
    ["texte", { icon: "icone.png" }],
  ])("icône obligatoire : %s", (_label, extra) => {
    const parsed = createTechnologySchema.safeParse({ name: "React", ...extra });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
        ["icon", TECHNOLOGY_MESSAGES.iconRequired],
      ]);
    }
  });

  it.each([
    ["vide", "", TECHNOLOGY_MESSAGES.nameRequired],
    ["espaces seuls", " \t  ", TECHNOLOGY_MESSAGES.nameRequired],
    ["caractères invisibles seuls", "​​", TECHNOLOGY_MESSAGES.nameRequired],
    ["sans lettre ni chiffre", "+ - #", TECHNOLOGY_MESSAGES.nameNoLetter],
    ["trop long", "a".repeat(TECHNOLOGY_NAME_MAX_LENGTH + 1), TECHNOLOGY_MESSAGES.nameTooLong],
  ])("refuse un nom %s", (_label, name, message) => {
    const parsed = createTechnologySchema.safeParse({ name, icon: icon() });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]).toMatchObject({ path: ["name"], message });
  });

  it("refuse un nom absent ou qui n'est pas du texte", () => {
    for (const name of [undefined, null, 42, new File(["x"], "x.txt")]) {
      const parsed = createTechnologySchema.safeParse({ name, icon: icon() });
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.error.issues[0]).toMatchObject({ path: ["name"] });
    }
  });

  it("limite de longueur en points de code, après nettoyage", () => {
    const limit = "é".repeat(TECHNOLOGY_NAME_MAX_LENGTH);
    expect(createTechnologySchema.safeParse({ name: limit, icon: icon() }).success).toBe(true);
    expect(createTechnologySchema.safeParse({ name: `  ${limit}  `, icon: icon() }).success).toBe(true);
    expect(createTechnologySchema.safeParse({ name: `${limit}é`, icon: icon() }).success).toBe(false);
    // Un émoji vaut un point de code (deux unités UTF-16) : 80 points de code acceptés, 81 refusés.
    expect(createTechnologySchema.safeParse({ name: "a" + "😀".repeat(79), icon: icon() }).success).toBe(true);
    expect(createTechnologySchema.safeParse({ name: "a" + "😀".repeat(80), icon: icon() }).success).toBe(false);
  });

  it("signale le nom et l'icône ensemble", () => {
    const parsed = createTechnologySchema.safeParse({ name: "", icon: null });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(new Set(parsed.error.issues.map((issue) => issue.path[0]))).toEqual(new Set(["name", "icon"]));
  });
});

describe("updateTechnologySchema", () => {
  it.each([
    ["absente", undefined],
    ["null", null],
    ["chaîne vide", ""],
    ["fichier vide", new File([], "")],
  ])("icône facultative : %s → null", (_label, value) => {
    const parsed = updateTechnologySchema.safeParse({ id: ID, name: "React", icon: value });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.icon).toBeNull();
  });

  it("garde le fichier choisi", () => {
    const file = icon("nouvelle.png");
    const parsed = updateTechnologySchema.safeParse({ id: ID, name: "React", icon: file });
    expect(parsed.success && parsed.data.icon).toBe(file);
  });

  it("refuse une icône qui n'est ni un fichier ni vide", () => {
    const parsed = updateTechnologySchema.safeParse({ id: ID, name: "React", icon: "icone.png" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]).toMatchObject({ path: ["icon"], message: TECHNOLOGY_MESSAGES.iconInvalid });
  });

  it("refuse un identifiant qui n'est pas un UUID", () => {
    const parsed = updateTechnologySchema.safeParse({ id: "1; DROP TABLE technologies", name: "React", icon: null });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]).toMatchObject({ path: ["id"], message: TECHNOLOGY_MESSAGES.idInvalid });
  });
});

describe("technologyInputFromFormData", () => {
  it("lit l'identifiant, le nom et le fichier du formulaire", () => {
    const data = new FormData();
    data.set("id", ID);
    data.set("name", "React");
    const file = icon();
    data.set("icon", file);
    const input = technologyInputFromFormData(data);
    expect(input.id).toBe(ID);
    expect(input.name).toBe("React");
    expect((input.icon as File).name).toBe("icone.png");
  });

  it("champs absents → null (refusés par les schémas)", () => {
    expect(technologyInputFromFormData(new FormData())).toEqual({ id: null, name: null, icon: null });
  });
});

describe("ordre", () => {
  it.each(["up", "down"] as const)("accepte la direction %s", (direction) => {
    expect(moveTechnologySchema.safeParse({ id: ID, direction }).success).toBe(true);
  });

  it.each([undefined, "", "left", "UP", 1])("refuse la direction %j", (direction) => {
    const parsed = moveTechnologySchema.safeParse({ id: ID, direction });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].message).toBe(TECHNOLOGY_MESSAGES.moveInvalid);
  });

  it("refuse un identifiant mal formé", () => {
    expect(moveTechnologySchema.safeParse({ id: "x", direction: "up" }).success).toBe(false);
    expect(technologyIdField.safeParse(ID).success).toBe(true);
  });

  it("messages de position", () => {
    expect(technologyMovedMessage("React", 2, 5)).toBe("« React » est maintenant en position 2 sur 5.");
    expect(technologyAtEdgeMessage("React", "up")).toBe("« React » est déjà en première position.");
    expect(technologyAtEdgeMessage("React", "down")).toBe("« React » est déjà en dernière position.");
  });
});

describe("suppression", () => {
  it("lit la confirmation et les projets affichés", () => {
    const data = new FormData();
    data.set("id", ID);
    data.set("confirmed", "1");
    data.append("projectIds", ID);
    data.append("projectIds", OTHER_ID);
    expect(deleteTechnologySchema.parse(deleteTechnologyInputFromFormData(data))).toEqual({
      id: ID,
      confirmed: true,
      confirmedProjectIds: [ID, OTHER_ID],
    });
  });

  it("sans confirmation, `confirmed` vaut faux", () => {
    const data = new FormData();
    data.set("id", ID);
    for (const value of ["", "0", "true", "oui"]) {
      data.set("confirmed", value);
      expect(deleteTechnologyInputFromFormData(data).confirmed).toBe(false);
    }
  });

  it("refuse un identifiant de projet qui n'est pas un UUID", () => {
    expect(
      deleteTechnologySchema.safeParse({ id: ID, confirmed: true, confirmedProjectIds: ["pas-un-uuid"] }).success,
    ).toBe(false);
  });

  it("messages", () => {
    expect(technologyInUseMessage(1)).toContain("1 projet");
    expect(technologyInUseMessage(3)).toContain("3 projets");
    expect(duplicateTechnologyMessage("React")).toContain("« React » existe déjà");
  });
});
