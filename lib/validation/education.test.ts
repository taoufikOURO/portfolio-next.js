import { describe, expect, it } from "vitest";

import { firstFieldErrors } from "./auth";
import {
  EDUCATION_LIMITS,
  EDUCATION_MESSAGES,
  educationInputFromFormData,
  educationSchema,
  educationValuesFromFormData,
  formatGrade,
  formatMonthValue,
  moveEducationSchema,
  parseGrade,
  parseMonth,
} from "./education";
import { SKILL_MESSAGES } from "./skill";

const SKILL_A = "0190f2d4-8a9b-7c3d-9e1f-2a3b4c5d6e7f";
const SKILL_B = "0190f2d4-8a9b-7c3d-9e1f-2a3b4c5d6e80";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Master informatique",
    institution: "Université de Lomé",
    location: "Lomé",
    startDate: "2021-09",
    endDate: "2023-06",
    honors: "Bien",
    grade: "14,5",
    description: "Génie logiciel et systèmes distribués.",
    skillIds: [SKILL_A, SKILL_B],
    ...overrides,
  };
}

function errorsOf(input: unknown) {
  const result = educationSchema.safeParse(input);
  if (result.success) throw new Error("Le schéma aurait dû refuser la saisie.");
  return firstFieldErrors(result.error);
}

describe("parseMonth et formatMonthValue", () => {
  it("stocke le mois au 1er, à minuit UTC", () => {
    expect(parseMonth("2024-09")?.toISOString()).toBe("2024-09-01T00:00:00.000Z");
    expect(parseMonth("2024-12")?.toISOString()).toBe("2024-12-01T00:00:00.000Z");
    expect(parseMonth("2024-01")?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it.each(["2024-13", "2024-00", "2024-9", "24-09", "2024/09", "09/2024", "2024-09-01", "1899-12", "2101-01", ""])(
    "refuse %j",
    (value) => {
      expect(parseMonth(value)).toBeNull();
    },
  );

  it("relit la date en UTC (aller-retour)", () => {
    for (const value of ["1900-01", "2021-09", "2100-12"]) {
      expect(formatMonthValue(parseMonth(value)!)).toBe(value);
    }
  });
});

describe("parseGrade et formatGrade", () => {
  it.each([
    ["0", "0"],
    ["20", "20"],
    ["20,00", "20"],
    ["14,5", "14.5"],
    ["14.50", "14.5"],
    ["9,75", "9.75"],
    [" 12 ", "12"],
    ["07", "7"],
  ])("accepte %j → %j", (input, expected) => {
    expect(parseGrade(input)).toBe(expected);
  });

  it.each(["-1", "20,01", "20.5", "21", "100", "14,555", "14,", ",5", "abc", "1e1", "14 ,5 ,5"])("refuse %j", (input) => {
    expect(parseGrade(input)).toBeNull();
  });

  it("affiche la virgule décimale", () => {
    expect(formatGrade("14.5")).toBe("14,5");
    expect(formatGrade("20")).toBe("20");
  });
});

describe("educationSchema", () => {
  it("accepte une formation complète et normalise les valeurs", () => {
    expect(educationSchema.parse(validInput({ title: "  Master informatique  " }))).toEqual({
      title: "Master informatique",
      institution: "Université de Lomé",
      location: "Lomé",
      startDate: new Date("2021-09-01T00:00:00.000Z"),
      endDate: new Date("2023-06-01T00:00:00.000Z"),
      honors: "Bien",
      grade: "14.5",
      description: "Génie logiciel et systèmes distribués.",
      skillIds: [SKILL_A, SKILL_B],
      newSkill: null,
    });
  });

  it("« Nouvelle compétence » : facultative, nettoyée, mêmes refus qu'un nom de compétence", () => {
    expect(educationSchema.parse(validInput({ newSkill: "  Docker  " })).newSkill).toBe("Docker");
    expect(educationSchema.parse(validInput({ newSkill: "   " })).newSkill).toBeNull();
    expect(errorsOf(validInput({ newSkill: "#" }))).toEqual({ newSkill: SKILL_MESSAGES.nameNoLetter });
  });

  it("date de fin, mention, moyenne et compétences facultatives", () => {
    const parsed = educationSchema.parse(
      validInput({ endDate: "", honors: "   ", grade: "", skillIds: [] }),
    );
    expect(parsed).toMatchObject({ endDate: null, honors: null, grade: null, skillIds: [] });

    // Champs absents du formulaire (FormData.get renvoie null).
    const absent = educationSchema.parse(validInput({ endDate: null, honors: null, grade: null }));
    expect(absent).toMatchObject({ endDate: null, honors: null, grade: null });
  });

  it("accepte une date de fin égale à la date de début (même mois)", () => {
    expect(educationSchema.safeParse(validInput({ startDate: "2023-06", endDate: "2023-06" })).success).toBe(true);
  });

  it("refuse une date de fin antérieure à la date de début", () => {
    expect(errorsOf(validInput({ startDate: "2023-06", endDate: "2023-05" }))).toEqual({
      endDate: EDUCATION_MESSAGES.endBeforeStart,
    });
    expect(errorsOf(validInput({ startDate: "2023-01", endDate: "2022-12" }))).toEqual({
      endDate: EDUCATION_MESSAGES.endBeforeStart,
    });
  });

  it("signale la date de fin antérieure en même temps que les autres erreurs", () => {
    expect(errorsOf(validInput({ title: "", startDate: "2023-06", endDate: "2020-01" }))).toEqual({
      title: EDUCATION_MESSAGES.titleRequired,
      endDate: EDUCATION_MESSAGES.endBeforeStart,
    });
  });

  it("ne compare pas les dates si l'une d'elles est invalide", () => {
    expect(errorsOf(validInput({ startDate: "2023-13", endDate: "2020-01" }))).toEqual({
      startDate: EDUCATION_MESSAGES.startInvalid,
    });
    expect(errorsOf(validInput({ startDate: "", endDate: "2020-01" }))).toEqual({
      startDate: EDUCATION_MESSAGES.startRequired,
    });
  });

  it.each([
    ["-0,5"],
    ["20,5"],
    ["21"],
    ["quinze"],
  ])("refuse la moyenne %j", (grade) => {
    expect(errorsOf(validInput({ grade }))).toEqual({ grade: EDUCATION_MESSAGES.gradeInvalid });
  });

  it("accepte les bornes 0 et 20", () => {
    expect(educationSchema.parse(validInput({ grade: "0" })).grade).toBe("0");
    expect(educationSchema.parse(validInput({ grade: "20" })).grade).toBe("20");
  });

  it("exige les champs obligatoires", () => {
    expect(
      errorsOf({ title: "", institution: " ", location: null, startDate: null, description: "", skillIds: [] }),
    ).toEqual({
      title: EDUCATION_MESSAGES.titleRequired,
      institution: EDUCATION_MESSAGES.institutionRequired,
      location: EDUCATION_MESSAGES.locationRequired,
      startDate: EDUCATION_MESSAGES.startRequired,
      description: EDUCATION_MESSAGES.descriptionRequired,
    });
  });

  it("limite la longueur des textes", () => {
    expect(errorsOf(validInput({ title: "a".repeat(EDUCATION_LIMITS.title + 1) }))).toEqual({
      title: EDUCATION_MESSAGES.titleTooLong,
    });
    expect(errorsOf(validInput({ honors: "a".repeat(EDUCATION_LIMITS.honors + 1) }))).toEqual({
      honors: EDUCATION_MESSAGES.honorsTooLong,
    });
    expect(errorsOf(validInput({ description: "a".repeat(EDUCATION_LIMITS.description + 1) }))).toEqual({
      description: EDUCATION_MESSAGES.descriptionTooLong,
    });
  });

  it("refuse un identifiant de compétence mal formé et dédoublonne les autres", () => {
    expect(errorsOf(validInput({ skillIds: ["1; DROP TABLE skills"] }))).toEqual({
      skillIds: EDUCATION_MESSAGES.skillsInvalid,
    });
    expect(educationSchema.parse(validInput({ skillIds: [SKILL_A, SKILL_A, SKILL_B] })).skillIds).toEqual([
      SKILL_A,
      SKILL_B,
    ]);
  });
});

describe("lecture du formulaire", () => {
  it("lit toutes les compétences cochées et les champs vides", () => {
    const data = new FormData();
    for (const [name, value] of Object.entries(validInput({ skillIds: undefined, grade: "", endDate: "" }))) {
      if (typeof value === "string") data.set(name, value);
    }
    data.append("skillIds", SKILL_A);
    data.append("skillIds", SKILL_B);
    data.set("newSkill", " Docker ");

    const input = educationInputFromFormData(data);
    expect(input.newSkill).toBe(" Docker ");
    expect(input.skillIds).toEqual([SKILL_A, SKILL_B]);
    expect(educationSchema.parse(input)).toMatchObject({ grade: null, endDate: null, skillIds: [SKILL_A, SKILL_B] });

    expect(educationValuesFromFormData(data)).toMatchObject({
      title: "Master informatique",
      grade: "",
      skillIds: [SKILL_A, SKILL_B],
      newSkill: " Docker ",
    });
  });

  it("formulaire vide : aucune compétence, champs obligatoires signalés", () => {
    const input = educationInputFromFormData(new FormData());
    expect(input.skillIds).toEqual([]);
    expect(Object.keys(errorsOf(input)).sort()).toEqual(
      ["description", "institution", "location", "startDate", "title"].sort(),
    );
  });
});

describe("moveEducationSchema", () => {
  it("n'accepte que « up » et « down »", () => {
    expect(moveEducationSchema.safeParse({ id: SKILL_A, direction: "up" }).success).toBe(true);
    expect(moveEducationSchema.safeParse({ id: SKILL_A, direction: "down" }).success).toBe(true);
    expect(moveEducationSchema.safeParse({ id: SKILL_A, direction: "left" }).success).toBe(false);
    expect(moveEducationSchema.safeParse({ id: "x", direction: "up" }).success).toBe(false);
  });
});
