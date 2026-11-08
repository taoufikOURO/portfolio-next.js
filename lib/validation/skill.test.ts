import { describe, expect, it } from "vitest";

import { firstFieldErrors } from "./auth";
import {
  cleanSkillName,
  deleteSkillInputFromFormData,
  deleteSkillSchema,
  normalizeSkillName,
  optionalSkillNameField,
  renameSkillSchema,
  SKILL_MESSAGES,
  SKILL_NAME_MAX_LENGTH,
  skillSchema,
} from "./skill";

const UUID = "0190f2d4-8a9b-7c3d-9e1f-2a3b4c5d6e7f";

describe("normalizeSkillName", () => {
  it("donne la même clé quelle que soit la casse, les accents et les espaces superflus", () => {
    const variants = [
      "Développement Web",
      "developpement web",
      "DÉVELOPPEMENT WEB",
      "  Développement   Web  ",
      "Développement Web", // « é » décomposé (e + accent combinant)
      "Développement Web", // espace insécable
      "Développement\tWeb\n",
      "Dévelo​ppement Web", // espace sans chasse
      "Ｄéveloppement Ｗeb", // lettres pleine chasse
    ];
    for (const variant of variants) {
      expect(normalizeSkillName(variant), variant).toBe("developpement web");
    }
  });

  it("garde les espaces entre les mots et la ponctuation significative", () => {
    expect(normalizeSkillName("Node JS")).not.toBe(normalizeSkillName("NodeJS"));
    expect(normalizeSkillName("C++")).toBe("c++");
    expect(normalizeSkillName("C#")).toBe("c#");
    expect(normalizeSkillName("C")).not.toBe(normalizeSkillName("C#"));
  });

  it("ramène les ligatures typographiques et les lettres accentuées majuscules", () => {
    expect(normalizeSkillName("ﬁnance")).toBe("finance");
    expect(normalizeSkillName("ÇA ÉTÉ")).toBe("ca ete");
  });
});

describe("cleanSkillName", () => {
  it("conserve la casse et les accents, rogne et réduit les espaces", () => {
    expect(cleanSkillName("  Développement    Web ")).toBe("Développement Web");
    expect(cleanSkillName("Re​act")).toBe("React");
    expect(cleanSkillName("Pyt\u0000hon")).toBe("Python");
  });

  it("recompose les accents décomposés (NFC)", () => {
    expect(cleanSkillName("Réseau")).toBe("Réseau");
  });
});

describe("skillSchema", () => {
  it("accepte un nom et le renvoie nettoyé", () => {
    expect(skillSchema.parse({ name: "  TypeScript  " })).toEqual({ name: "TypeScript" });
  });

  it.each([
    ["", SKILL_MESSAGES.nameRequired],
    ["   ", SKILL_MESSAGES.nameRequired],
    ["​ ", SKILL_MESSAGES.nameRequired],
    [null, SKILL_MESSAGES.nameRequired],
    ["#", SKILL_MESSAGES.nameNoLetter],
    ["́", SKILL_MESSAGES.nameNoLetter],
    ["a".repeat(SKILL_NAME_MAX_LENGTH + 1), SKILL_MESSAGES.nameTooLong],
  ])("refuse %j", (name, message) => {
    const result = skillSchema.safeParse({ name });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstFieldErrors(result.error)).toEqual({ name: message });
  });

  it("compte la longueur en caractères, pas en unités UTF-16", () => {
    expect(skillSchema.safeParse({ name: "😀".repeat(SKILL_NAME_MAX_LENGTH - 1) + "a" }).success).toBe(true);
    expect(skillSchema.safeParse({ name: "a".repeat(SKILL_NAME_MAX_LENGTH) }).success).toBe(true);
  });
});

describe("renameSkillSchema et deleteSkillSchema", () => {
  it("exigent un identifiant UUID", () => {
    expect(renameSkillSchema.safeParse({ id: "1", name: "React" }).success).toBe(false);
    expect(renameSkillSchema.safeParse({ id: UUID, name: "React" }).success).toBe(true);
    expect(deleteSkillSchema.safeParse({ id: "x", confirmed: false, confirmedEducationIds: [] }).success).toBe(false);
  });

  it("lit la confirmation et la liste des formations confirmées dans le formulaire", () => {
    const data = new FormData();
    data.set("id", UUID);
    data.set("confirmed", "1");
    data.append("educationIds", UUID);
    expect(deleteSkillSchema.parse(deleteSkillInputFromFormData(data))).toEqual({
      id: UUID,
      confirmed: true,
      confirmedEducationIds: [UUID],
    });

    const unconfirmed = new FormData();
    unconfirmed.set("id", UUID);
    expect(deleteSkillSchema.parse(deleteSkillInputFromFormData(unconfirmed))).toEqual({
      id: UUID,
      confirmed: false,
      confirmedEducationIds: [],
    });
  });

  it("refuse une liste de formations mal formée", () => {
    const data = new FormData();
    data.set("id", UUID);
    data.set("confirmed", "1");
    data.append("educationIds", "pas-un-uuid");
    expect(deleteSkillSchema.safeParse(deleteSkillInputFromFormData(data)).success).toBe(false);
  });
});

describe("optionalSkillNameField (« Nouvelle compétence »)", () => {
  it("vide, blanc ou absent → null", () => {
    for (const value of ["", "   ", "​", null, undefined]) {
      expect(optionalSkillNameField.parse(value), JSON.stringify(value)).toBeNull();
    }
  });

  it("nettoie le nom comme pour une compétence", () => {
    expect(optionalSkillNameField.parse("  Docker   Compose ")).toBe("Docker Compose");
  });

  it("applique les mêmes refus (longueur, au moins une lettre ou un chiffre)", () => {
    expect(optionalSkillNameField.safeParse("a".repeat(SKILL_NAME_MAX_LENGTH + 1)).error?.issues[0].message).toBe(
      SKILL_MESSAGES.nameTooLong,
    );
    expect(optionalSkillNameField.safeParse("#").error?.issues[0].message).toBe(SKILL_MESSAGES.nameNoLetter);
  });
});
