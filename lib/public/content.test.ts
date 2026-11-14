import { describe, expect, it } from "vitest";

import {
  DEFAULT_IMAGE_SRC,
  fanCards,
  formatDay,
  formatGrade,
  formatMonth,
  imageOrDefault,
  publicArticles,
  publicProjects,
  ringTextOf,
  siteNameOf,
  toPublicArticle,
  toPublicEducation,
  toPublicProfile,
  toPublicProject,
  type ArticleRow,
  type ProjectRow,
  type UrlResolver,
} from "./content";

const url: UrlResolver = (bucket, path) => `https://exemple.supabase.co/${bucket}/${path}`;

function article(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    slug: "un-article",
    status: "PUBLISHED",
    publishedAt: new Date("2026-03-26T10:00:00Z"),
    lastPublishedAt: null,
    publishedVersion: {
      title: "Titre publié",
      description: "Description",
      category: "Catégorie",
      author: "Auteur",
      coverImagePath: "couverture.png",
      content: "# Contenu",
    },
    ...overrides,
  };
}

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    slug: "projet",
    title: "Projet",
    description: "Description",
    imagePath: "image.png",
    isPublished: true,
    date: null,
    links: [],
    technologies: [],
    collaborators: [],
    ...overrides,
  };
}

describe("imageOrDefault", () => {
  it("calcule l'URL publique depuis le chemin du bucket", () => {
    expect(imageOrDefault("projects", "a.png", url)).toEqual({ src: "https://exemple.supabase.co/projects/a.png", isDefault: false });
  });

  it("renvoie l'image par défaut unique si le chemin manque ou est vide", () => {
    for (const path of [null, undefined, "", "   "]) {
      expect(imageOrDefault("articles", path, url)).toEqual({ src: DEFAULT_IMAGE_SRC, isDefault: true });
    }
    expect(DEFAULT_IMAGE_SRC).toBe("/defaults/image.svg");
  });
});

describe("articles", () => {
  it("garde un article publié, dans sa version publiée", () => {
    const result = toPublicArticle(article(), url);
    expect(result?.title).toBe("Titre publié");
    expect(result?.content).toBe("# Contenu");
    expect(result?.cover.src).toBe("https://exemple.supabase.co/articles/couverture.png");
  });

  it("exclut un brouillon, même s'il a déjà une version et un slug", () => {
    expect(toPublicArticle(article({ status: "DRAFT" }), url)).toBeNull();
  });

  it("exclut un article sans version publiée, sans slug ou sans date de publication", () => {
    expect(toPublicArticle(article({ publishedVersion: null }), url)).toBeNull();
    expect(toPublicArticle(article({ slug: null }), url)).toBeNull();
    expect(toPublicArticle(article({ publishedAt: null }), url)).toBeNull();
  });

  it("couverture manquante : image par défaut", () => {
    const row = article({ publishedVersion: { ...article().publishedVersion!, coverImagePath: null } });
    expect(toPublicArticle(row, url)?.cover).toEqual({ src: DEFAULT_IMAGE_SRC, isDefault: true });
  });

  it("« mis à jour le » seulement après une republication", () => {
    expect(toPublicArticle(article(), url)?.updatedAt).toBeNull();
    const republished = new Date("2026-04-02T08:00:00Z");
    expect(toPublicArticle(article({ lastPublishedAt: republished }), url)?.updatedAt).toEqual(republished);
  });

  it("liste : brouillons exclus, du plus récent au plus ancien, sans le contenu", () => {
    const rows = [
      article({ slug: "ancien", publishedAt: new Date("2026-01-01T00:00:00Z") }),
      article({ slug: "brouillon", status: "DRAFT" }),
      article({ slug: "recent", publishedAt: new Date("2026-05-01T00:00:00Z") }),
    ];
    const list = publicArticles(rows, url);
    expect(list.map((item) => item.slug)).toEqual(["recent", "ancien"]);
    expect(list[0]).not.toHaveProperty("content");
  });
});

describe("projets", () => {
  it("exclut un projet non publié", () => {
    expect(toPublicProject(project({ isPublished: false }), url)).toBeNull();
  });

  it("garde l'ordre de la base et trie les liens par position", () => {
    const rows = [
      project({ slug: "b" }),
      project({ slug: "cache", isPublished: false }),
      project({
        slug: "a",
        links: [
          { label: "Second", url: "https://exemple.org/2", position: 1 },
          { label: "Premier", url: "https://exemple.org/1", position: 0 },
        ],
      }),
    ];
    const list = publicProjects(rows, url);
    expect(list.map((item) => item.slug)).toEqual(["b", "a"]);
    expect(list[1].links.map((link) => link.label)).toEqual(["Premier", "Second"]);
  });

  it("collaborateurs : nom (ou @identifiant) et lien de profil seulement", () => {
    const result = toPublicProject(
      project({
        collaborators: [
          { githubUsername: "alice", name: "Alice", profileUrl: "https://github.com/alice" },
          { githubUsername: "bob", name: null, profileUrl: null },
        ],
      }),
      url,
    );
    expect(result?.collaborators).toEqual([
      { name: "Alice", profileUrl: "https://github.com/alice" },
      { name: "@bob", profileUrl: null },
    ]);
  });

  it("image manquante : image par défaut", () => {
    expect(toPublicProject(project({ imagePath: null }), url)?.image.isDefault).toBe(true);
  });
});

describe("profil", () => {
  it("profil absent : champs vides, photo par défaut, pas de CV", () => {
    const profile = toPublicProfile(null, url);
    expect(profile.fullName).toBe("");
    expect(profile.photo).toEqual({ src: DEFAULT_IMAGE_SRC, isDefault: true });
    expect(profile.resumeHref).toBeNull();
    expect(siteNameOf(profile)).toBe("Portfolio");
  });

  it("CV : lien externe, sinon URL du PDF du bucket profil", () => {
    const base = {
      firstName: "Ada",
      lastName: "Exemple",
      email: "",
      jobTitle: "Titre",
      bio: "",
      about: "",
      githubUrl: null,
      linkedinUrl: null,
      photoPath: "photo.jpg",
      resumeUrl: null,
      resumePath: "cv.pdf",
    };
    expect(toPublicProfile(base, url).resumeHref).toBe("https://exemple.supabase.co/profile/cv.pdf");
    expect(toPublicProfile({ ...base, resumeUrl: "https://exemple.org/cv" }, url).resumeHref).toBe("https://exemple.org/cv");
    expect(toPublicProfile(base, url).fullName).toBe("Ada Exemple");
    expect(toPublicProfile(base, url).photo.src).toBe("https://exemple.supabase.co/profile/photo.jpg");
  });

  it("texte de l'anneau : composé du nom et du titre, répété ; vide sans profil", () => {
    const text = ringTextOf({ fullName: "Ada Exemple", jobTitle: "Titre" });
    expect(text.startsWith("Ada Exemple · Titre · Ada Exemple")).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(60);
    expect(ringTextOf({ fullName: "", jobTitle: "" })).toBe("");
  });
});

describe("éventail de l'accueil", () => {
  const profile = { fullName: "Ada Exemple", photo: { src: "photo", isDefault: false } };
  const projects = ["p1", "p2", "p3", "p4", "p5"].map((slug) => ({ slug, title: slug, image: { src: slug, isDefault: false } }));

  it("photo au centre, quatre projets au plus dans l'ordre de la base", () => {
    const cards = fanCards(profile, projects);
    expect(cards.map((card) => (card.kind === "project" ? card.slug : card.kind))).toEqual(["p1", "p2", "profile", "p3", "p4"]);
  });

  it("projets manquants : cartes à l'image par défaut", () => {
    const cards = fanCards(profile, projects.slice(0, 1));
    expect(cards.map((card) => card.kind)).toEqual(["project", "placeholder", "profile", "placeholder", "placeholder"]);
    expect(cards[1].image).toEqual({ src: DEFAULT_IMAGE_SRC, isDefault: true });
  });
});

describe("formations et dates", () => {
  it("moyenne en texte, absente : null", () => {
    const row = {
      title: "T",
      description: "D",
      startDate: new Date(Date.UTC(2025, 9, 1)),
      endDate: null,
      institution: "I",
      location: "L",
      honors: null,
      skills: [],
    };
    expect(toPublicEducation({ ...row, grade: { toString: () => "16.28" } }).grade).toBe("16.28");
    expect(toPublicEducation({ ...row, grade: null }).grade).toBeNull();
    expect(formatGrade("16.28")).toBe("16,28");
  });

  it("dates en français (jour à Paris, mois en UTC)", () => {
    expect(formatDay(new Date("2026-03-26T10:00:00Z"))).toBe("26 mars 2026");
    expect(formatMonth(new Date(Date.UTC(2025, 9, 1)))).toBe("octobre 2025");
  });
});
