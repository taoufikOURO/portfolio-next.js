import { describe, expect, it, vi } from "vitest";

// Le module importe le client Prisma et le stockage : remplacés par des doublures (aucune base, aucun réseau).
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/storage/client", () => ({ getStorageContext: () => ({ config: {} }), publicUrlFor: () => "" }));

import { DEFAULT_IMAGE_SRC, type ArticleRow, type ProjectRow } from "./content";
import { createPublicReader, type PublicDb } from "./queries";

const url = (bucket: string, path: string) => `https://exemple.supabase.co/${bucket}/${path}`;

const published: ArticleRow = {
  slug: "publie",
  status: "PUBLISHED",
  publishedAt: new Date("2026-02-01T00:00:00Z"),
  lastPublishedAt: null,
  publishedVersion: { title: "Publié", description: "", category: "", author: "", coverImagePath: null, content: "texte" },
};
const draft: ArticleRow = { ...published, slug: "brouillon", status: "DRAFT" };

const project: ProjectRow = {
  slug: "visible",
  title: "Visible",
  description: "",
  imagePath: null,
  isPublished: true,
  date: null,
  links: [],
  technologies: [{ name: "Outil", iconPath: "outil.svg" }],
  collaborators: [],
};

/** Doublure : renvoie toujours les mêmes lignes et garde les arguments reçus. */
function fakeDb(rows: { articles?: ArticleRow[]; projects?: ProjectRow[] }) {
  const calls: Record<string, unknown[]> = {};
  const record =
    <T,>(name: string, value: T) =>
    async (args: unknown) => {
      (calls[name] ??= []).push(args);
      return value;
    };
  const client = {
    profile: { findUnique: record("profile.findUnique", null) },
    article: {
      findMany: record("article.findMany", rows.articles ?? []),
      findFirst: record("article.findFirst", rows.articles?.[0] ?? null),
    },
    project: {
      findMany: record("project.findMany", rows.projects ?? []),
      findFirst: record("project.findFirst", rows.projects?.[0] ?? null),
    },
    education: { findMany: record("education.findMany", []) },
    skill: { findMany: record("skill.findMany", []) },
    technology: { findMany: record("technology.findMany", []) },
  } as unknown as PublicDb;
  return { client, calls };
}

describe("lecture publique des articles", () => {
  it("demande seulement les articles publiés, les plus récents d'abord, sans le contenu ni le brouillon", async () => {
    const { client, calls } = fakeDb({ articles: [published] });
    await createPublicReader(client, url).articles();
    const args = calls["article.findMany"][0] as {
      where: object;
      orderBy: object;
      select: { publishedVersion: { select: object }; draftVersion?: unknown };
    };
    expect(args.where).toEqual({ status: "PUBLISHED", slug: { not: null }, publishedVersionId: { not: null } });
    expect(args.orderBy).toEqual([{ publishedAt: "desc" }, { id: "asc" }]);
    expect(args.select.draftVersion).toBeUndefined();
    expect(args.select.publishedVersion.select).not.toHaveProperty("content");
  });

  it("exclut un brouillon même si la base le renvoyait", async () => {
    const { client } = fakeDb({ articles: [draft, published] });
    const list = await createPublicReader(client, url).articles();
    expect(list.map((item) => item.slug)).toEqual(["publie"]);
  });

  it("détail : un brouillon répond null (page 404), même par URL directe", async () => {
    const { client, calls } = fakeDb({ articles: [draft] });
    expect(await createPublicReader(client, url).article("brouillon")).toBeNull();
    expect((calls["article.findFirst"][0] as { where: object }).where).toEqual({
      slug: "brouillon",
      status: "PUBLISHED",
      publishedVersionId: { not: null },
    });
  });

  it("détail : couverture manquante, image par défaut", async () => {
    const { client } = fakeDb({ articles: [published] });
    const result = await createPublicReader(client, url).article("publie");
    expect(result?.cover.src).toBe(DEFAULT_IMAGE_SRC);
    expect(result?.content).toBe("texte");
  });
});

describe("lecture publique des projets", () => {
  it("demande les projets publiés dans l'ordre de la base", async () => {
    const { client, calls } = fakeDb({ projects: [project, { ...project, slug: "cache", isPublished: false }] });
    const list = await createPublicReader(client, url).projects();
    const args = calls["project.findMany"][0] as { where: object; orderBy: object };
    expect(args.where).toEqual({ isPublished: true });
    expect(args.orderBy).toEqual([{ position: "asc" }, { id: "asc" }]);
    expect(list.map((item) => item.slug)).toEqual(["visible"]);
    expect(list[0].image.isDefault).toBe(true);
    expect(list[0].technologies[0].icon.src).toBe("https://exemple.supabase.co/stack/outil.svg");
  });

  it("détail d'un projet non publié : null", async () => {
    const { client } = fakeDb({ projects: [{ ...project, isPublished: false }] });
    expect(await createPublicReader(client, url).project("visible")).toBeNull();
  });
});

describe("profil", () => {
  it("profil absent : profil vide, photo par défaut", async () => {
    const { client } = fakeDb({});
    const profile = await createPublicReader(client, url).profile();
    expect(profile.fullName).toBe("");
    expect(profile.photo.src).toBe(DEFAULT_IMAGE_SRC);
  });
});
