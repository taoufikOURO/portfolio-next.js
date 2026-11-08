import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { decideSkillDeletion } from "@/lib/skills";
import {
  duplicateSkillMessage,
  normalizeSkillName,
  SKILL_MESSAGES,
  skillCreatedMessage,
  skillInUseMessage,
} from "@/lib/validation/skill";
import { fakeDb, fakeId, fakeRequest, RedirectError, resetFakes, revalidatedPaths } from "@/test/fakes";

import { createSkillAction, deleteSkillAction, renameSkillAction } from "./actions";

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

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
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

function addSkill(name: string) {
  const skill = { id: fakeId(), name, normalizedName: normalizeSkillName(name) };
  fakeDb.skills.push(skill);
  return skill;
}

function addEducation(title: string, position: number, skillIds: string[] = []) {
  const education = {
    id: fakeId(),
    title,
    description: "Description",
    institution: "Établissement",
    location: "Lomé",
    startDate: new Date("2020-09-01T00:00:00.000Z"),
    endDate: null,
    honors: null,
    grade: null,
    position,
  };
  fakeDb.educations.push(education);
  for (const skillId of skillIds) fakeDb.educationSkills.push({ educationId: education.id, skillId });
  return education;
}

describe("session exigée", () => {
  it("chaque action redirige vers la connexion sans session, sans rien écrire", async () => {
    fakeRequest.cookies.clear();
    const skill = addSkill("React");

    expect(await expectRedirect(createSkillAction(null, form({ name: "Vue" })))).toBe("/admin/connexion");
    expect(await expectRedirect(renameSkillAction(null, form({ id: skill.id, name: "Vue" })))).toBe(
      "/admin/connexion",
    );
    expect(await expectRedirect(deleteSkillAction(null, form({ id: skill.id, confirmed: "1" })))).toBe(
      "/admin/connexion",
    );
    expect(fakeDb.skills).toEqual([skill]);
  });
});

describe("createSkillAction", () => {
  it("ajoute la compétence avec son nom nettoyé et sa clé normalisée", async () => {
    const state = await createSkillAction(null, form({ name: "  Développement   Web " }));

    expect(state).toEqual({ ok: true, message: skillCreatedMessage("Développement Web"), fieldErrors: {} });
    expect(fakeDb.skills).toEqual([
      { id: expect.any(String), name: "Développement Web", normalizedName: "developpement web" },
    ]);
    expect(revalidatedPaths).toEqual(["/admin/competences (layout)", "/admin/formations (layout)"]);
  });

  it.each(["développement web", "DEVELOPPEMENT WEB", "  Developpement  web ", "Développement Web"])(
    "refuse le doublon %j",
    async (name) => {
      addSkill("Développement Web");
      const state = await createSkillAction(null, form({ name }));

      expect(state).toEqual({
        ok: false,
        message: SKILL_MESSAGES.formInvalid,
        fieldErrors: { name: duplicateSkillMessage("Développement Web") },
        values: { name },
      });
      expect(fakeDb.skills).toHaveLength(1);
    },
  );

  it("refuse un nom vide (validation serveur, sans JavaScript)", async () => {
    const state = await createSkillAction(null, form({ name: "   " }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { name: SKILL_MESSAGES.nameRequired } });
    expect(fakeDb.skills).toHaveLength(0);
  });

  it("doublon détecté par la contrainte d'unicité (création simultanée)", async () => {
    const findUnique = vi.spyOn(fakeDb.client.skill, "findUnique");
    addSkill("React");
    // La première lecture ne voit pas encore la compétence créée en parallèle.
    findUnique.mockResolvedValueOnce(null);

    const state = await createSkillAction(null, form({ name: "react" }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { name: duplicateSkillMessage("React") } });
    expect(fakeDb.skills).toHaveLength(1);
    findUnique.mockRestore();
  });
});

describe("renameSkillAction", () => {
  it("renomme puis revient à la liste", async () => {
    const skill = addSkill("react");
    const url = await expectRedirect(renameSkillAction(null, form({ id: skill.id, name: "React" })));

    expect(url).toBe("/admin/competences?resultat=renommee");
    expect(fakeDb.skills[0]).toEqual({ id: skill.id, name: "React", normalizedName: "react" });
  });

  it("refuse le nom d'une autre compétence, quelle que soit la casse", async () => {
    addSkill("TypeScript");
    const skill = addSkill("JavaScript");
    const state = await renameSkillAction(null, form({ id: skill.id, name: "typescript" }));

    expect(state).toMatchObject({ ok: false, fieldErrors: { name: duplicateSkillMessage("TypeScript") } });
    expect(fakeDb.skills[1].name).toBe("JavaScript");
  });

  it("compétence supprimée entre-temps ou identifiant invalide : message, rien d'écrit", async () => {
    expect(await renameSkillAction(null, form({ id: fakeId(), name: "React" }))).toMatchObject({
      ok: false,
      message: SKILL_MESSAGES.notFound,
    });
    expect(await renameSkillAction(null, form({ id: "pas-un-uuid", name: "React" }))).toMatchObject({
      ok: false,
      message: SKILL_MESSAGES.notFound,
    });
    expect(fakeDb.skills).toHaveLength(0);
  });
});

describe("decideSkillDeletion (règle de suppression)", () => {
  it("compétence inutilisée : suppression, avec ou sans confirmation", () => {
    expect(decideSkillDeletion([], null)).toBe("delete");
    expect(decideSkillDeletion([], [])).toBe("delete");
  });

  it("compétence utilisée sans confirmation : bloquée", () => {
    expect(decideSkillDeletion(["a"], null)).toBe("blocked");
  });

  it("compétence utilisée avec confirmation de toutes ses formations : suppression", () => {
    expect(decideSkillDeletion(["a", "b"], ["b", "a"])).toBe("delete");
    // Une formation confirmée puis détachée entre-temps ne bloque rien.
    expect(decideSkillDeletion(["a"], ["a", "b"])).toBe("delete");
  });

  it("formation rattachée après la confirmation : bloquée", () => {
    expect(decideSkillDeletion(["a", "c"], ["a", "b"])).toBe("blocked");
    expect(decideSkillDeletion(["a"], [])).toBe("blocked");
  });
});

describe("deleteSkillAction", () => {
  it("supprime une compétence inutilisée", async () => {
    const skill = addSkill("Rust");
    const url = await expectRedirect(deleteSkillAction(null, form({ id: skill.id, confirmed: "1" })));

    expect(url).toBe("/admin/competences?resultat=supprimee");
    expect(fakeDb.skills).toHaveLength(0);
    expect(fakeDb.calls.executeRaw.some((sql) => sql.includes("FOR UPDATE"))).toBe(true);
  });

  it("bloque la suppression d'une compétence utilisée sans confirmation, et liste ses formations", async () => {
    const skill = addSkill("Python");
    const master = addEducation("Master", 0, [skill.id]);
    const licence = addEducation("Licence", 1, [skill.id]);

    const state = await deleteSkillAction(null, form({ id: skill.id }));

    expect(state).toEqual({
      ok: false,
      message: skillInUseMessage(2),
      fieldErrors: {},
      educations: [
        { id: master.id, title: "Master" },
        { id: licence.id, title: "Licence" },
      ],
    });
    expect(fakeDb.skills).toHaveLength(1);
    expect(fakeDb.educationSkills).toHaveLength(2);
  });

  it("supprime après confirmation et détache les liens, sans toucher aux formations", async () => {
    const skill = addSkill("Python");
    const other = addSkill("SQL");
    const master = addEducation("Master", 0, [skill.id, other.id]);
    const licence = addEducation("Licence", 1, [skill.id]);

    const url = await expectRedirect(
      deleteSkillAction(null, form({ id: skill.id, confirmed: "1", educationIds: [master.id, licence.id] })),
    );

    expect(url).toBe("/admin/competences?resultat=supprimee-detachee");
    expect(fakeDb.skills).toEqual([other]);
    expect(fakeDb.educations).toHaveLength(2);
    expect(fakeDb.educationSkills).toEqual([{ educationId: master.id, skillId: other.id }]);
  });

  it("bloque si une formation a été rattachée après l'affichage de la confirmation", async () => {
    const skill = addSkill("Python");
    const master = addEducation("Master", 0, [skill.id]);
    const licence = addEducation("Licence", 1, [skill.id]);

    const state = await deleteSkillAction(null, form({ id: skill.id, confirmed: "1", educationIds: [master.id] }));

    expect(state).toMatchObject({
      ok: false,
      message: skillInUseMessage(2),
      educations: [
        { id: master.id, title: "Master" },
        { id: licence.id, title: "Licence" },
      ],
    });
    expect(fakeDb.skills).toHaveLength(1);
  });

  it("une confirmation vide ne suffit pas pour une compétence utilisée", async () => {
    const skill = addSkill("Python");
    addEducation("Master", 0, [skill.id]);

    const state = await deleteSkillAction(null, form({ id: skill.id, confirmed: "1" }));
    expect(state).toMatchObject({ ok: false, message: skillInUseMessage(1) });
    expect(fakeDb.skills).toHaveLength(1);
  });

  it("compétence déjà supprimée ou identifiant invalide : message, aucune requête d'écriture", async () => {
    expect(await deleteSkillAction(null, form({ id: fakeId(), confirmed: "1" }))).toMatchObject({
      ok: false,
      message: SKILL_MESSAGES.notFound,
    });
    const before = fakeDb.calls.executeRaw.length;
    expect(await deleteSkillAction(null, form({ id: "1 OR 1=1", confirmed: "1" }))).toMatchObject({
      ok: false,
      message: SKILL_MESSAGES.notFound,
    });
    expect(fakeDb.calls.executeRaw).toHaveLength(before);
  });
});
