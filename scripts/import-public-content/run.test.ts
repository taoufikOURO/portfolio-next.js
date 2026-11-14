import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { normalizeSkillName } from "@/lib/validation/skill";
import { normalizeTechnologyName } from "@/lib/validation/technology";

import { TODAY, fakeSources } from "./fixtures";
import { buildImportPlan, type PlannedArticle, type ProfileIdentity } from "./plan";
import { runImport, type ImportStore } from "./run";

/** Base en mémoire : seules les tables de contenu, plus un administrateur que l'import ne doit jamais voir. */
function memoryStore() {
  let next = 0;
  const id = () => `id-${(next += 1)}`;
  const state = {
    admin: { email: "admin@exemple.invalid", passwordHash: "hash", sessions: ["session"], tokens: ["jeton"] },
    technologies: [] as { id: string; name: string; normalizedName: string; iconPath: string }[],
    skills: [] as { id: string; name: string; normalizedName: string }[],
    educations: [] as { title: string; institution: string; skillIds: string[] }[],
    profile: { firstName: "", lastName: "", email: "", photoPath: null as string | null, resumeUrl: null as string | null } as Partial<ProfileIdentity> & {
      firstName: string;
      lastName: string;
      email: string;
      photoPath: string | null;
      resumeUrl: string | null;
    },
    projects: [] as { slug: string; technologyIds: string[]; collaborators: string[]; links: string[]; imagePath: null; isPublished: boolean }[],
    articles: [] as (PlannedArticle & { coverImagePath: null })[],
  };
  let writes = 0;
  const store: ImportStore = {
    async findTechnologyId(normalizedName) {
      return state.technologies.find((row) => row.normalizedName === normalizedName)?.id ?? null;
    },
    async createTechnology(name) {
      writes += 1;
      const row = { id: id(), name, normalizedName: normalizeTechnologyName(name), iconPath: "" };
      state.technologies.push(row);
      return row.id;
    },
    async findSkillId(normalizedName) {
      return state.skills.find((row) => row.normalizedName === normalizedName)?.id ?? null;
    },
    async createSkill(name) {
      writes += 1;
      const row = { id: id(), name, normalizedName: normalizeSkillName(name) };
      state.skills.push(row);
      return row.id;
    },
    async educationExists(title, institution) {
      return state.educations.some((row) => row.title === title && row.institution === institution);
    },
    async createEducation(input) {
      writes += 1;
      state.educations.push({ title: input.title, institution: input.institution, skillIds: input.skillIds });
      return true;
    },
    async profileState() {
      return { hasIdentity: !!(state.profile.firstName || state.profile.lastName), hasResume: !!state.profile.resumeUrl };
    },
    async saveProfileIdentity(identity) {
      writes += 1;
      Object.assign(state.profile, identity);
    },
    async saveProfileResumeUrl(url) {
      writes += 1;
      state.profile.resumeUrl = url;
    },
    async projectExists(slug) {
      return state.projects.some((row) => row.slug === slug);
    },
    async createProject(input, isPublished) {
      writes += 1;
      state.projects.push({
        slug: input.slug,
        technologyIds: input.technologyIds,
        collaborators: input.collaborators,
        links: input.links.map((link) => link.url),
        imagePath: null,
        isPublished,
      });
      return true;
    },
    async articleSlugTaken(slug) {
      return state.articles.some((row) => row.slug === slug);
    },
    async createArticle(article) {
      writes += 1;
      state.articles.push({ ...article, coverImagePath: null });
      return true;
    },
  };
  return { store, state, writes: () => writes };
}

const plan = () => buildImportPlan(fakeSources(), TODAY);

describe("exécution de l'import (store en mémoire)", () => {
  it("simulation : comptes seulement, aucune écriture", async () => {
    const memory = memoryStore();
    const tallies = await runImport(plan(), memory.store, { apply: false });
    expect(memory.writes()).toBe(0);
    expect(tallies.technologies).toMatchObject({ create: 3, existing: 0 });
    expect(tallies.skills).toMatchObject({ create: 2, existing: 0 });
    expect(tallies.educations).toMatchObject({ create: 1, existing: 0 });
    expect(tallies.profile).toMatchObject({ create: 2, existing: 0 });
    expect(tallies.projects).toMatchObject({ create: 2, existing: 0 });
    expect(tallies.articles).toMatchObject({ create: 2, existing: 0 });
  });

  it("import réel : mêmes comptes que la simulation, relations reliées, images vides", async () => {
    const memory = memoryStore();
    const dryRun = await runImport(plan(), memoryStore().store, { apply: false });
    const tallies = await runImport(plan(), memory.store, { apply: true });
    expect(tallies).toEqual(dryRun);

    const [alpha, beta] = memory.state.projects;
    expect(alpha.technologyIds).toHaveLength(2);
    expect(alpha.collaborators).toEqual(["exemple-collab"]);
    expect(alpha.links).toHaveLength(3);
    expect(alpha.isPublished).toBe(true);
    expect(beta.isPublished).toBe(false);
    expect(memory.state.educations[0].skillIds).toHaveLength(2);
    // Image vide acceptée partout : aucune icône, image, photo ni couverture.
    expect(memory.state.technologies.every((row) => row.iconPath === "")).toBe(true);
    expect(memory.state.projects.every((row) => row.imagePath === null)).toBe(true);
    expect(memory.state.profile.photoPath).toBeNull();
    expect(memory.state.articles.map((row) => [row.slug, row.status, row.coverImagePath])).toEqual([
      ["article-public", "PUBLISHED", null],
      ["article-a-venir", "DRAFT", null],
    ]);
    // E-mail personnel jamais écrit.
    expect(memory.state.profile.email).toBe("");
  });

  it("double passage : le second ne crée rien et la base reste identique au premier", async () => {
    const memory = memoryStore();
    await runImport(plan(), memory.store, { apply: true });
    const afterFirst = structuredClone(memory.state);
    const writesAfterFirst = memory.writes();

    const second = await runImport(plan(), memory.store, { apply: true });
    expect(memory.writes()).toBe(writesAfterFirst);
    expect(memory.state).toEqual(afterFirst);
    for (const tally of Object.values(second)) expect(tally.create).toBe(0);
    expect(second.technologies.existing).toBe(3);
    expect(second.projects.existing).toBe(2);
    expect(second.articles.existing).toBe(2);
    expect(second.profile.existing).toBe(2);
  });

  it("ne modifie jamais un contenu déjà saisi, ni l'administrateur", async () => {
    const memory = memoryStore();
    memory.state.profile.firstName = "Déjà";
    memory.state.profile.resumeUrl = "https://deja.exemple.invalid/cv.pdf";
    const admin = structuredClone(memory.state.admin);
    const tallies = await runImport(plan(), memory.store, { apply: true });
    expect(tallies.profile).toMatchObject({ create: 0, existing: 2 });
    expect(memory.state.profile.firstName).toBe("Déjà");
    expect(memory.state.profile.resumeUrl).toBe("https://deja.exemple.invalid/cv.pdf");
    expect(memory.state.admin).toEqual(admin);
  });

  it("le store Prisma ne touche ni à l'administrateur, ni au stockage, ni à GitHub", () => {
    const source = readFileSync(join(import.meta.dirname, "store.ts"), "utf8");
    const code = source.replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\b(admin|session|authToken|loginAttempt)\b/i);
    expect(code).not.toMatch(/@\/lib\/(storage|github|auth)/);
    expect(code).not.toMatch(/resolveNewCollaborators|fetch\(/);
  });
});
