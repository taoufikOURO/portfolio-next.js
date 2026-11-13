import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import {
  getDashboard,
  isDashboardEmpty,
  PENDING_ARTICLES_LIMIT,
  profileCompleteness,
  type DashboardCounts,
} from "./dashboard";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));

beforeEach(() => resetFakes());
afterEach(() => vi.restoreAllMocks());

const COMPLETE_PROFILE = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", jobTitle: "Développeuse" };

function setProfile(fields: Partial<typeof COMPLETE_PROFILE> = {}) {
  fakeDb.profiles.push({
    id: 1,
    ...COMPLETE_PROFILE,
    bio: "",
    about: "",
    githubUrl: null,
    linkedinUrl: null,
    photoPath: null,
    cutoutPhotoPath: null,
    resumeUrl: null,
    resumePath: null,
    ...fields,
  });
}

function version(articleId: string, title: string) {
  const id = fakeId();
  const now = new Date("2026-11-01T00:00:00.000Z");
  fakeDb.articleVersions.push({
    id,
    articleId,
    title,
    slug: `slug-${id.slice(-4)}`,
    description: "",
    category: "",
    author: "",
    content: "",
    coverImagePath: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

type ArticleSeed = {
  /** Titre de la version publiée (absent : jamais publié). */
  published?: string;
  /** Titre du brouillon (absent : aucune modification en attente). */
  draft?: string;
  updatedAt?: string;
  id?: string;
};

function addArticle({ published, draft, updatedAt = "2026-11-01T10:00:00.000Z", id = fakeId() }: ArticleSeed) {
  const publishedVersionId = published === undefined ? null : version(id, published);
  const draftVersionId = draft === undefined ? null : version(id, draft);
  const date = new Date(updatedAt);
  fakeDb.articles.push({
    id,
    slug: published === undefined ? null : `a-${id.slice(-4)}`,
    status: published === undefined ? "DRAFT" : "PUBLISHED",
    publishedVersionId,
    draftVersionId,
    publishedAt: published === undefined ? null : date,
    lastPublishedAt: null,
    createdAt: date,
    updatedAt: date,
  });
  return id;
}

function addProject(isPublished: boolean) {
  fakeDb.projects.push({ id: fakeId(), title: "Projet", position: fakeDb.projects.length, isPublished });
}

function addEducation() {
  fakeDb.educations.push({
    id: fakeId(),
    title: "Licence",
    description: "",
    institution: "Université",
    location: "Paris",
    startDate: new Date("2020-09-01T00:00:00.000Z"),
    endDate: null,
    honors: null,
    grade: null,
    position: fakeDb.educations.length,
  });
}

function addSkill(name: string) {
  fakeDb.skills.push({ id: fakeId(), name, normalizedName: name.toLowerCase() });
}

function addTechnology(name: string) {
  fakeDb.technologies.push({
    id: fakeId(),
    name,
    normalizedName: name.toLowerCase(),
    iconPath: `${fakeId()}.png`,
    position: fakeDb.technologies.length,
  });
}

const ZERO_COUNTS: DashboardCounts = {
  articlesPublished: 0,
  articlesDraft: 0,
  articlesPending: 0,
  projectsPublished: 0,
  projectsUnpublished: 0,
  educations: 0,
  skills: 0,
  technologies: 0,
};

describe("profileCompleteness", () => {
  it("complet quand les quatre champs obligatoires sont valides", () => {
    expect(profileCompleteness(COMPLETE_PROFILE)).toEqual({ complete: true });
  });

  it.each(["firstName", "lastName", "email", "jobTitle"] as const)("incomplet quand %s est vide", (field) => {
    expect(profileCompleteness({ ...COMPLETE_PROFILE, [field]: "" })).toEqual({ complete: false, missing: [field] });
  });

  it("un champ fait d'espaces est manquant", () => {
    expect(profileCompleteness({ ...COMPLETE_PROFILE, firstName: "   " })).toEqual({
      complete: false,
      missing: ["firstName"],
    });
  });

  it("une adresse e-mail invalide est manquante", () => {
    expect(profileCompleteness({ ...COMPLETE_PROFILE, email: "pas-une-adresse" })).toEqual({
      complete: false,
      missing: ["email"],
    });
  });

  it("nomme tous les champs manquants, dans l'ordre d'affichage", () => {
    expect(profileCompleteness({ firstName: "", lastName: "", email: "", jobTitle: "" })).toEqual({
      complete: false,
      missing: ["firstName", "lastName", "email", "jobTitle"],
    });
  });
});

describe("isDashboardEmpty", () => {
  it("vrai quand tous les compteurs sont à zéro", () => {
    expect(isDashboardEmpty(ZERO_COUNTS)).toBe(true);
  });

  it.each([
    "articlesPublished",
    "articlesDraft",
    "projectsPublished",
    "projectsUnpublished",
    "educations",
    "skills",
    "technologies",
  ] as const)("faux dès que %s n'est pas nul", (key) => {
    expect(isDashboardEmpty({ ...ZERO_COUNTS, [key]: 1 })).toBe(false);
  });
});

describe("getDashboard : compteurs", () => {
  it("compte articles, projets, formations, compétences et technologies", async () => {
    addArticle({ published: "En ligne 1" });
    addArticle({ published: "En ligne 2" });
    addArticle({ published: "En ligne 3", draft: "Modifié" });
    addArticle({ draft: "Brouillon 1" });
    addArticle({ draft: "Brouillon 2" });
    addProject(true);
    addProject(true);
    addProject(false);
    addProject(false);
    addProject(false);
    addEducation();
    addEducation();
    addSkill("TypeScript");
    addSkill("SQL");
    addSkill("Docker");
    addTechnology("Next.js");

    const { counts } = await getDashboard();

    expect(counts).toEqual({
      articlesPublished: 3,
      articlesDraft: 2,
      articlesPending: 1,
      projectsPublished: 2,
      projectsUnpublished: 3,
      educations: 2,
      skills: 3,
      technologies: 1,
    });
  });

  it("un article publié avec des modifications en attente compte comme publié et en attente, pas comme brouillon", async () => {
    addArticle({ published: "A", draft: "A modifié" });

    const { counts } = await getDashboard();

    expect(counts).toMatchObject({ articlesPublished: 1, articlesDraft: 0, articlesPending: 1 });
  });

  it("les compteurs sont des requêtes de comptage : aucune ligne n'est chargée pour eux", async () => {
    addArticle({ published: "A" });
    addProject(true);
    addEducation();
    addSkill("SQL");
    addTechnology("Next.js");
    const client = fakeDb.client;
    const spies = {
      project: vi.spyOn(client.project, "findMany"),
      education: vi.spyOn(client.education, "findMany"),
      skill: vi.spyOn(client.skill, "findMany"),
      technology: vi.spyOn(client.technology, "findMany"),
      article: vi.spyOn(client.article, "findMany"),
    };

    await getDashboard();

    expect(spies.project).not.toHaveBeenCalled();
    expect(spies.education).not.toHaveBeenCalled();
    expect(spies.skill).not.toHaveBeenCalled();
    expect(spies.technology).not.toHaveBeenCalled();
    // Seule la liste des articles à reprendre charge des lignes, et une seule fois.
    expect(spies.article).toHaveBeenCalledTimes(1);
  });
});

describe("getDashboard : brouillons et modifications en attente", () => {
  it("liste les brouillons et les articles publiés avec modifications en attente, pas les autres", async () => {
    addArticle({ published: "Publié sans modification" });
    const draft = addArticle({ draft: "Brouillon" });
    const pending = addArticle({ published: "Publié", draft: "Publié, modifié" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.id).sort()).toEqual([draft, pending].sort());
  });

  it("donne le statut : brouillon ou modifications en attente", async () => {
    const draft = addArticle({ draft: "Brouillon" });
    const pending = addArticle({ published: "Publié", draft: "Modifié" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.find((article) => article.id === draft)?.status).toBe("draft");
    expect(pendingArticles.find((article) => article.id === pending)?.status).toBe("pending");
  });

  it("affiche le titre de la version de travail, pas celui de la version publiée", async () => {
    addArticle({ published: "Titre en ligne", draft: "Titre du brouillon" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.title)).toEqual(["Titre du brouillon"]);
  });

  it("un titre vide devient « Sans titre »", async () => {
    addArticle({ draft: "" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.title)).toEqual(["Sans titre"]);
  });

  it("trie par date de modification décroissante", async () => {
    addArticle({ draft: "Ancien", updatedAt: "2026-11-01T08:00:00.000Z" });
    addArticle({ draft: "Récent", updatedAt: "2026-11-12T08:00:00.000Z" });
    addArticle({ published: "Milieu", draft: "Milieu modifié", updatedAt: "2026-11-06T08:00:00.000Z" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.title)).toEqual(["Récent", "Milieu modifié", "Ancien"]);
  });

  it("à date égale, l'ordre suit l'identifiant", async () => {
    const same = "2026-11-05T08:00:00.000Z";
    addArticle({ id: "00000000-0000-7000-8000-00000000000b", draft: "B", updatedAt: same });
    addArticle({ id: "00000000-0000-7000-8000-00000000000a", draft: "A", updatedAt: same });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.title)).toEqual(["A", "B"]);
  });

  it("se limite à 10 entrées, les plus récentes, et indique le total", async () => {
    expect(PENDING_ARTICLES_LIMIT).toBe(10);
    for (let day = 1; day <= 12; day += 1) {
      addArticle({ draft: `Brouillon ${day}`, updatedAt: `2026-10-${String(day).padStart(2, "0")}T08:00:00.000Z` });
    }
    addArticle({ published: "En ligne", draft: "Modifié", updatedAt: "2026-10-20T08:00:00.000Z" });

    const { pendingArticles, pendingArticlesTotal } = await getDashboard();

    expect(pendingArticles).toHaveLength(10);
    expect(pendingArticlesTotal).toBe(13);
    expect(pendingArticles[0]?.title).toBe("Modifié");
    expect(pendingArticles.at(-1)?.title).toBe("Brouillon 4");
    expect(pendingArticles.map((article) => article.title)).not.toContain("Brouillon 3");
  });

  it("le filtre est appliqué par la requête : des articles publiés plus récents ne prennent pas la place des brouillons", async () => {
    for (let day = 1; day <= 12; day += 1) {
      addArticle({ published: `En ligne ${day}`, updatedAt: `2026-11-${String(day).padStart(2, "0")}T08:00:00.000Z` });
    }
    addArticle({ draft: "Vieux brouillon", updatedAt: "2026-01-01T08:00:00.000Z" });

    const { pendingArticles } = await getDashboard();

    expect(pendingArticles.map((article) => article.title)).toEqual(["Vieux brouillon"]);
  });

  it("exactement 10 articles à reprendre : tous listés", async () => {
    for (let day = 1; day <= 10; day += 1) {
      addArticle({ draft: `Brouillon ${day}`, updatedAt: `2026-10-${String(day).padStart(2, "0")}T08:00:00.000Z` });
    }

    const { pendingArticles, pendingArticlesTotal } = await getDashboard();

    expect(pendingArticles).toHaveLength(10);
    expect(pendingArticlesTotal).toBe(10);
  });
});

describe("getDashboard : profil", () => {
  it("complet", async () => {
    setProfile();

    expect((await getDashboard()).profile).toEqual({ complete: true });
  });

  it("incomplet : nomme les champs manquants", async () => {
    setProfile({ lastName: "", jobTitle: "  " });

    expect((await getDashboard()).profile).toEqual({ complete: false, missing: ["lastName", "jobTitle"] });
  });

  it("profil absent de la base : incomplet, tous les champs manquants", async () => {
    expect((await getDashboard()).profile).toEqual({
      complete: false,
      missing: ["firstName", "lastName", "email", "jobTitle"],
    });
  });
});

describe("getDashboard : état vide et réseau", () => {
  it("base sans contenu : état vide, compteurs à zéro, aucune liste", async () => {
    const dashboard = await getDashboard();

    expect(dashboard.empty).toBe(true);
    expect(dashboard.counts).toEqual(ZERO_COUNTS);
    expect(dashboard.pendingArticles).toEqual([]);
    expect(dashboard.pendingArticlesTotal).toBe(0);
  });

  it("un seul contenu suffit pour sortir de l'état vide", async () => {
    addSkill("SQL");

    expect((await getDashboard()).empty).toBe(false);
  });

  it("n'émet aucune requête vers le réseau", async () => {
    const blocked = globalThis.fetch;
    const fetchSpy = vi.fn(async () => new Response("{}"));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      setProfile();
      addArticle({ published: "A", draft: "B" });
      addProject(true);

      await getDashboard();

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = blocked; // rétablit le `fetch` interdit de test/no-network.ts
    }
  });
});
