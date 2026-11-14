import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import {
  countPerMonth,
  getDashboard,
  isDashboardEmpty,
  lastMonths,
  monthKey,
  PENDING_ARTICLES_LIMIT,
  profileCompleteness,
  PUBLICATION_MONTHS,
  RECENT_PROJECTS_LIMIT,
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

    expect(spies.education).not.toHaveBeenCalled();
    expect(spies.skill).not.toHaveBeenCalled();
    expect(spies.technology).not.toHaveBeenCalled();
    // Lignes chargées (étape 18) : seulement pour les listes et le graphique, jamais pour les compteurs.
    // Projets : le bloc « Projets récents », une seule fois, limité.
    expect(spies.project).toHaveBeenCalledTimes(1);
    expect(spies.project.mock.calls[0][0]).toMatchObject({ take: RECENT_PROJECTS_LIMIT });
    // Articles : la liste des articles à reprendre (limitée) et les dates de publication du graphique (seul champ lu, période bornée).
    expect(spies.article).toHaveBeenCalledTimes(2);
    const articleCalls = spies.article.mock.calls.map(([args]) => args as Record<string, unknown>);
    expect(articleCalls.filter((args) => args.take === PENDING_ARTICLES_LIMIT)).toHaveLength(1);
    const publications = articleCalls.find((args) => args.take === undefined);
    expect(publications?.select).toEqual({ publishedAt: true });
    expect(publications?.where).toMatchObject({ publishedAt: { gte: expect.any(Date) } });
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

describe("publications par mois (étape 18)", () => {
  const NOW = new Date("2026-11-13T12:00:00.000Z");

  it("monthKey : mois dans le fuseau de l'admin (Europe/Paris), pas en UTC", () => {
    expect(monthKey(new Date("2026-10-31T22:30:00.000Z"))).toBe("2026-10"); // 23 h 30 à Paris
    expect(monthKey(new Date("2026-10-31T23:30:00.000Z"))).toBe("2026-11"); // 0 h 30 le 1er novembre à Paris
  });

  it("lastMonths : six mois, du plus ancien au mois en cours, à cheval sur deux années", () => {
    expect(lastMonths(NOW)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(lastMonths(new Date("2027-02-10T12:00:00.000Z"))).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(lastMonths(NOW, 1)).toEqual(["2026-11"]);
  });

  it("countPerMonth : compte par mois, zéro pour un mois sans publication, ignore les dates hors période", () => {
    const dates = [
      new Date("2026-06-02T10:00:00.000Z"),
      new Date("2026-06-20T10:00:00.000Z"),
      new Date("2026-09-09T10:00:00.000Z"),
      new Date("2026-11-12T10:00:00.000Z"),
      new Date("2026-05-31T10:00:00.000Z"), // avant la période
      new Date("2026-12-01T10:00:00.000Z"), // après la période
    ];
    expect(countPerMonth(dates, NOW)).toEqual([
      { month: "2026-06", count: 2 },
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 0 },
      { month: "2026-09", count: 1 },
      { month: "2026-10", count: 0 },
      { month: "2026-11", count: 1 },
    ]);
  });

  it("getDashboard : publications d'après publishedAt seulement (brouillons exclus), six mois", async () => {
    addArticle({ published: "Juin", updatedAt: "2026-06-15T10:00:00.000Z" });
    addArticle({ published: "Novembre", draft: "Révision", updatedAt: "2026-11-02T10:00:00.000Z" });
    addArticle({ published: "Trop ancien", updatedAt: "2026-04-15T10:00:00.000Z" });
    addArticle({ draft: "Jamais publié", updatedAt: "2026-11-10T10:00:00.000Z" });

    const { publishedByMonth } = await getDashboard(NOW);

    expect(publishedByMonth).toHaveLength(PUBLICATION_MONTHS);
    expect(publishedByMonth.map((entry) => entry.count)).toEqual([1, 0, 0, 0, 0, 1]);
  });

  it("getDashboard : base vide, six mois à zéro", async () => {
    const { publishedByMonth } = await getDashboard(NOW);

    expect(publishedByMonth.map((entry) => entry.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("projets récents (étape 18)", () => {
  function addRecentProject(title: string, updatedAt: string, technologyIds: string[] = [], imagePath: string | null = null) {
    const id = fakeId();
    fakeDb.projects.push({
      id,
      title,
      position: fakeDb.projects.length,
      isPublished: true,
      imagePath,
      updatedAt: new Date(updatedAt),
    });
    for (const technologyId of technologyIds) fakeDb.projectTechnologies.push({ projectId: id, technologyId });
    return id;
  }

  it("les plus récemment modifiés d'abord, limités à RECENT_PROJECTS_LIMIT", async () => {
    addRecentProject("Ancien", "2026-01-01T00:00:00.000Z");
    addRecentProject("Récent", "2026-11-10T00:00:00.000Z");
    addRecentProject("Milieu", "2026-06-01T00:00:00.000Z");
    addRecentProject("Plus récent", "2026-11-12T00:00:00.000Z");

    const { recentProjects } = await getDashboard();

    expect(recentProjects).toHaveLength(RECENT_PROJECTS_LIMIT);
    expect(recentProjects.map((project) => project.title)).toEqual(["Plus récent", "Récent", "Milieu"]);
  });

  it("noms des technologies dans l'ordre de la stack, chemin de l'image transmis tel quel", async () => {
    addTechnology("TypeScript");
    addTechnology("PostgreSQL");
    const [typescript, postgres] = fakeDb.technologies.map((technology) => technology.id);
    addRecentProject("Projet", "2026-11-10T00:00:00.000Z", [postgres, typescript], "projets/image.webp");

    const [project] = (await getDashboard()).recentProjects;

    expect(project.technologies).toEqual(["TypeScript", "PostgreSQL"]);
    expect(project.imagePath).toBe("projets/image.webp");
    expect(project.isPublished).toBe(true);
  });

  it("aucun projet : liste vide", async () => {
    expect((await getDashboard()).recentProjects).toEqual([]);
  });
});
