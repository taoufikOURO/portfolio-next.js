import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { listEducations } from "@/lib/educations";
import { listSkills } from "@/lib/skills";
import { EDUCATION_MESSAGES, movedMessage } from "@/lib/validation/education";
import {
  duplicateNewSkillMessage,
  normalizeSkillName,
  SKILL_MESSAGES,
  skillCreatedAndCheckedMessage,
} from "@/lib/validation/skill";
import { fakeDb, fakeId, fakeRequest, RedirectError, resetFakes } from "@/test/fakes";

import {
  createEducationAction,
  createSkillFromEducationAction,
  deleteEducationAction,
  moveEducationAction,
  updateEducationAction,
} from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

beforeEach(async () => {
  resetFakes();
  const adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: new Date() });
  const { cookieValue } = await createSession(adminId);
  fakeRequest.cookies.set("admin_session", cookieValue);
});

function addSkill(name: string) {
  const skill = { id: fakeId(), name, normalizedName: normalizeSkillName(name) };
  fakeDb.skills.push(skill);
  return skill;
}

function educationForm(fields: Record<string, string | string[]> = {}): FormData {
  const values: Record<string, string | string[]> = {
    title: "Master informatique",
    institution: "Université de Lomé",
    location: "Lomé",
    startDate: "2021-09",
    endDate: "2023-06",
    honors: "",
    grade: "",
    description: "Génie logiciel.",
    ...fields,
  };
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("L'action aurait dû rediriger.");
}

async function create(fields: Record<string, string | string[]> = {}) {
  return expectRedirect(createEducationAction(null, educationForm(fields)));
}

describe("session exigée", () => {
  it("chaque action redirige vers la connexion sans session, sans rien écrire", async () => {
    fakeRequest.cookies.clear();
    const id = fakeId();

    for (const call of [
      createEducationAction(null, educationForm()),
      createSkillFromEducationAction("Docker"),
      updateEducationAction(null, educationForm({ id })),
      moveEducationAction(null, educationForm({ id, direction: "up" })),
      deleteEducationAction(null, educationForm({ id })),
    ]) {
      expect(await expectRedirect(call)).toBe("/admin/connexion");
    }
    expect(fakeDb.educations).toHaveLength(0);
    expect(fakeDb.skills).toHaveLength(0);
  });
});

describe("createEducationAction", () => {
  it("crée deux formations qui partagent une même compétence (critère §10)", async () => {
    const shared = addSkill("Python");
    const sql = addSkill("SQL");

    expect(await create({ title: "Licence", skillIds: [shared.id] })).toBe("/admin/formations?resultat=creee");
    expect(await create({ title: "Master", skillIds: [shared.id, sql.id] })).toBe("/admin/formations?resultat=creee");

    const educations = await listEducations();
    expect(educations.map((education) => [education.title, education.position, education.skills])).toEqual([
      ["Licence", 0, [{ id: shared.id, name: "Python" }]],
      [
        "Master",
        1,
        [
          { id: shared.id, name: "Python" },
          { id: sql.id, name: "SQL" },
        ],
      ],
    ]);
    const [python] = await listSkills();
    expect(python.educations.map((education) => education.title)).toEqual(["Licence", "Master"]);
  });

  it("enregistre les dates au 1er du mois en UTC, la moyenne en décimal, les champs facultatifs vides à null", async () => {
    await create({ startDate: "2021-09", endDate: "", grade: "14,5", honors: "  " });

    const [stored] = fakeDb.educations;
    expect(stored.startDate.toISOString()).toBe("2021-09-01T00:00:00.000Z");
    expect(stored.endDate).toBeNull();
    expect(stored.grade).toBe("14.5");
    expect(stored.honors).toBeNull();
  });

  it("refuse une date de fin antérieure au début, côté serveur, et renvoie la saisie", async () => {
    const skill = addSkill("Python");
    const state = await createEducationAction(
      null,
      educationForm({ startDate: "2023-06", endDate: "2023-05", skillIds: [skill.id] }),
    );

    expect(state).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.formInvalid,
      fieldErrors: { endDate: EDUCATION_MESSAGES.endBeforeStart },
      values: { title: "Master informatique", startDate: "2023-06", endDate: "2023-05", skillIds: [skill.id] },
    });
    expect(fakeDb.educations).toHaveLength(0);
  });

  it.each(["20,5", "-1", "abc"])("refuse la moyenne %j côté serveur", async (grade) => {
    const state = await createEducationAction(null, educationForm({ grade }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { grade: EDUCATION_MESSAGES.gradeInvalid } });
    expect(fakeDb.educations).toHaveLength(0);
  });

  it("refuse une compétence supprimée entre-temps", async () => {
    const state = await createEducationAction(null, educationForm({ skillIds: [fakeId()] }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { skillIds: EDUCATION_MESSAGES.skillsMissing } });
    expect(fakeDb.educations).toHaveLength(0);
  });

  it("prend le verrou de l'ordre avant de calculer la position", async () => {
    await create();
    expect(fakeDb.calls.executeRaw.some((sql) => sql.includes("pg_advisory_xact_lock"))).toBe(true);
  });
});

describe("updateEducationAction", () => {
  it("remplace les champs et la sélection de compétences, sans changer l'ordre", async () => {
    const python = addSkill("Python");
    const sql = addSkill("SQL");
    await create({ title: "Licence" });
    await create({ title: "Master", skillIds: [python.id] });
    const master = fakeDb.educations[1];

    const url = await expectRedirect(
      updateEducationAction(null, educationForm({ id: master.id, title: "Master 2", skillIds: [sql.id], grade: "20" })),
    );

    expect(url).toBe("/admin/formations?resultat=modifiee");
    const updated = (await listEducations())[1];
    expect(updated).toMatchObject({ title: "Master 2", position: 1, grade: "20", skills: [{ id: sql.id, name: "SQL" }] });
  });

  it("formation supprimée entre-temps : message, rien d'écrit", async () => {
    const state = await updateEducationAction(null, educationForm({ id: fakeId() }));
    expect(state).toMatchObject({ ok: false, message: EDUCATION_MESSAGES.notFound });
  });

  it("identifiant absent ou invalide : refus avant la validation des champs", async () => {
    expect(await updateEducationAction(null, educationForm({ id: "abc" }))).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.notFound,
    });
  });
});

describe("moveEducationAction", () => {
  async function seed(titles: string[]) {
    for (const title of titles) await create({ title });
    return fakeDb.educations.map((education) => education.id);
  }

  async function order() {
    return (await listEducations()).map((education) => education.title);
  }

  it("monte et descend une formation ; l'ordre est enregistré en base", async () => {
    const [, b, c] = await seed(["A", "B", "C"]);

    expect(await moveEducationAction(null, educationForm({ id: c, direction: "up" }))).toEqual({
      ok: true,
      message: movedMessage("C", 2, 3),
      fieldErrors: {},
      direction: "up",
      position: 2,
      total: 3,
    });
    expect(await order()).toEqual(["A", "C", "B"]);

    await moveEducationAction(null, educationForm({ id: b, direction: "up" }));
    await moveEducationAction(null, educationForm({ id: b, direction: "up" }));
    expect(await order()).toEqual(["B", "A", "C"]);
    // Positions renumérotées 0, 1, 2 (persistantes : relues depuis la base).
    expect(fakeDb.educations.map((education) => [education.title, education.position]).sort()).toEqual([
      ["A", 1],
      ["B", 0],
      ["C", 2],
    ]);
  });

  it("aux extrémités : rien ne change, message explicite", async () => {
    const [a, , c] = await seed(["A", "B", "C"]);

    expect(await moveEducationAction(null, educationForm({ id: a, direction: "up" }))).toMatchObject({
      ok: false,
      message: "« A » est déjà en première position.",
    });
    expect(await moveEducationAction(null, educationForm({ id: c, direction: "down" }))).toMatchObject({
      ok: false,
      message: "« C » est déjà en dernière position.",
    });
    expect(await order()).toEqual(["A", "B", "C"]);
  });

  it("répare les trous et les égalités de positions", async () => {
    const [a, b, c] = await seed(["A", "B", "C"]);
    fakeDb.educations.find((education) => education.id === a)!.position = 5;
    fakeDb.educations.find((education) => education.id === b)!.position = 5;
    fakeDb.educations.find((education) => education.id === c)!.position = 9;

    await moveEducationAction(null, educationForm({ id: c, direction: "up" }));
    expect(await order()).toEqual(["A", "C", "B"]);
    expect((await listEducations()).map((education) => education.position)).toEqual([0, 1, 2]);
  });

  it("refuse une direction ou un identifiant invalide", async () => {
    const [a] = await seed(["A", "B"]);
    expect(await moveEducationAction(null, educationForm({ id: a, direction: "left" }))).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.moveInvalid,
    });
    expect(await moveEducationAction(null, educationForm({ id: fakeId(), direction: "up" }))).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.notFound,
    });
  });
});

describe("deleteEducationAction", () => {
  it("supprime la formation et ses liens, conserve les compétences", async () => {
    const python = addSkill("Python");
    await create({ title: "Licence", skillIds: [python.id] });
    const [licence] = fakeDb.educations;

    const url = await expectRedirect(deleteEducationAction(null, educationForm({ id: licence.id })));

    expect(url).toBe("/admin/formations?resultat=supprimee");
    expect(fakeDb.educations).toHaveLength(0);
    expect(fakeDb.educationSkills).toHaveLength(0);
    expect(fakeDb.skills).toEqual([python]);
  });

  it("formation déjà supprimée : message", async () => {
    expect(await deleteEducationAction(null, educationForm({ id: fakeId() }))).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.notFound,
    });
  });
});

describe("« Nouvelle compétence » à l'enregistrement (sans JavaScript)", () => {
  it("crée la compétence, la coche et la relie à la formation", async () => {
    const python = addSkill("Python");
    expect(await create({ title: "Master", skillIds: [python.id], newSkill: "  Docker   Compose " })).toBe(
      "/admin/formations?resultat=creee",
    );

    const docker = fakeDb.skills.find((skill) => skill.name === "Docker Compose");
    expect(docker).toMatchObject({ normalizedName: "docker compose" });
    const [master] = await listEducations();
    expect(master.skills.map((skill) => skill.name)).toEqual(["Docker Compose", "Python"]);
  });

  it("doublon (casse, accents, espaces) : rien n'est créé, ni compétence ni formation, saisie renvoyée", async () => {
    addSkill("Développement Web");
    const state = await createEducationAction(null, educationForm({ newSkill: " developpement  WEB" }));

    expect(state).toMatchObject({
      ok: false,
      message: EDUCATION_MESSAGES.formInvalid,
      fieldErrors: { newSkill: duplicateNewSkillMessage("Développement Web") },
      values: { newSkill: " developpement  WEB", title: "Master informatique" },
    });
    expect(fakeDb.skills).toHaveLength(1);
    expect(fakeDb.educations).toHaveLength(0);
  });

  it("formation invalide : la nouvelle compétence n'est pas créée", async () => {
    const state = await createEducationAction(null, educationForm({ title: "", newSkill: "Docker" }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { title: EDUCATION_MESSAGES.titleRequired } });
    expect(fakeDb.skills).toHaveLength(0);
  });

  it("nom invalide : erreur sur le champ, rien d'écrit", async () => {
    const state = await createEducationAction(null, educationForm({ newSkill: "#" }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { newSkill: SKILL_MESSAGES.nameNoLetter } });
    expect(fakeDb.skills).toHaveLength(0);
    expect(fakeDb.educations).toHaveLength(0);
  });

  it("à la modification : ajoutée à la sélection", async () => {
    const python = addSkill("Python");
    await create({ title: "Licence", skillIds: [python.id] });
    const [licence] = fakeDb.educations;

    await expectRedirect(
      updateEducationAction(null, educationForm({ id: licence.id, title: "Licence", skillIds: [python.id], newSkill: "Rust" })),
    );
    expect((await listEducations())[0].skills.map((skill) => skill.name)).toEqual(["Python", "Rust"]);
  });

  it("champ vide : aucune compétence créée", async () => {
    await create({ newSkill: "   " });
    expect(fakeDb.skills).toHaveLength(0);
    expect(fakeDb.educations).toHaveLength(1);
  });
});

describe("createSkillFromEducationAction (« Créer et cocher », avec JavaScript)", () => {
  it("crée la compétence et la renvoie, sans créer de formation", async () => {
    const result = await createSkillFromEducationAction("  Kubernetes ");

    expect(result).toEqual({
      ok: true,
      message: skillCreatedAndCheckedMessage("Kubernetes"),
      skill: { id: expect.any(String), name: "Kubernetes" },
    });
    expect(fakeDb.skills).toEqual([{ id: expect.any(String), name: "Kubernetes", normalizedName: "kubernetes" }]);
    expect(fakeDb.educations).toHaveLength(0);
  });

  it("doublon : refus avec le même message qu'à l'enregistrement", async () => {
    addSkill("Développement Web");
    expect(await createSkillFromEducationAction("DÉVELOPPEMENT web")).toEqual({
      ok: false,
      message: duplicateNewSkillMessage("Développement Web"),
    });
    expect(fakeDb.skills).toHaveLength(1);
  });

  it("nom vide ou non textuel : refus, rien d'écrit", async () => {
    expect(await createSkillFromEducationAction("   ")).toEqual({ ok: false, message: SKILL_MESSAGES.nameRequired });
    expect(await createSkillFromEducationAction({ name: "x" })).toEqual({
      ok: false,
      message: SKILL_MESSAGES.nameRequired,
    });
    expect(fakeDb.skills).toHaveLength(0);
  });
});
