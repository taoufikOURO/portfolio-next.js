import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { PROFILE_ID } from "@/lib/profile";
import { getStorageContext, publicUrlFor } from "@/lib/storage/client";

import {
  publicArticles,
  publicProjects,
  toPublicArticle,
  toPublicEducation,
  toPublicProfile,
  toPublicProject,
  imageOrDefault,
  type ArticleRow,
  type EducationRow,
  type ProfileRow,
  type ProjectRow,
  type UrlResolver,
} from "./content";

// Lectures du site public (phase 2). Le public ne lit que la base : aucune
// lecture de `data/` ni de fichier local. Chaque requête filtre déjà ce qui
// n'est pas public (`status: "PUBLISHED"`, `isPublished: true`) ; les règles
// de `content.ts` le revérifient sur chaque ligne reçue.

const ORDER = [{ position: "asc" as const }, { id: "asc" as const }];

const VERSION_FIELDS = { title: true, description: true, category: true, author: true, coverImagePath: true } as const;

const ARTICLE_FIELDS = { slug: true, status: true, publishedAt: true, lastPublishedAt: true } as const;

const PROJECT_FIELDS = {
  slug: true,
  title: true,
  description: true,
  imagePath: true,
  isPublished: true,
  date: true,
  links: { select: { label: true, url: true, position: true }, orderBy: ORDER },
  technologies: { select: { name: true, iconPath: true }, orderBy: ORDER },
  collaborators: { select: { githubUsername: true, name: true, profileUrl: true }, orderBy: [{ githubUsername: "asc" as const }] },
} as const;

type FindMany<Row> = (args: never) => Promise<Row[]>;
type FindOne<Row> = (args: never) => Promise<Row | null>;

/** Sous-ensemble du client Prisma lu par le site public (remplaçable en test). */
export type PublicDb = {
  profile: { findUnique: FindOne<ProfileRow> };
  article: { findMany: FindMany<ArticleRow>; findFirst: FindOne<ArticleRow> };
  project: { findMany: FindMany<ProjectRow>; findFirst: FindOne<ProjectRow> };
  education: { findMany: FindMany<EducationRow> };
  skill: { findMany: FindMany<{ name: string; educations: { title: string }[] }> };
  technology: { findMany: FindMany<{ name: string; iconPath: string }> };
};

// Les arguments sont construits ici et passés tels quels au client Prisma ;
// en test, les doublures reçoivent les mêmes objets (filtres vérifiés).
function asArgs(args: unknown): never {
  return args as never;
}

export function createPublicReader(client: PublicDb, url: UrlResolver) {
  return {
    async profile() {
      const row = await client.profile.findUnique(asArgs({
        where: { id: PROFILE_ID },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          bio: true,
          about: true,
          githubUrl: true,
          linkedinUrl: true,
          photoPath: true,
          resumeUrl: true,
          resumePath: true,
        },
      }));
      return toPublicProfile(row, url);
    },

    async articles() {
      const rows = await client.article.findMany(asArgs({
        where: { status: "PUBLISHED", slug: { not: null }, publishedVersionId: { not: null } },
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        select: { ...ARTICLE_FIELDS, publishedVersion: { select: VERSION_FIELDS } },
      }));
      return publicArticles(rows, url);
    },

    /** Article publié de ce slug, ou `null` (jamais publié, brouillon, inconnu). */
    async article(slug: string) {
      const row = await client.article.findFirst(asArgs({
        where: { slug, status: "PUBLISHED", publishedVersionId: { not: null } },
        select: { ...ARTICLE_FIELDS, publishedVersion: { select: { ...VERSION_FIELDS, content: true } } },
      }));
      return row ? toPublicArticle(row, url) : null;
    },

    async projects() {
      const rows = await client.project.findMany(asArgs({
        where: { isPublished: true },
        orderBy: ORDER,
        select: PROJECT_FIELDS,
      }));
      return publicProjects(rows, url);
    },

    /** Projet publié de ce slug, ou `null`. */
    async project(slug: string) {
      const row = await client.project.findFirst(asArgs({ where: { slug, isPublished: true }, select: PROJECT_FIELDS }));
      return row ? toPublicProject(row, url) : null;
    },

    async educations() {
      const rows = await client.education.findMany(asArgs({
        orderBy: ORDER,
        select: {
          title: true,
          description: true,
          startDate: true,
          endDate: true,
          institution: true,
          location: true,
          honors: true,
          grade: true,
          skills: { select: { name: true }, orderBy: [{ name: "asc" }] },
        },
      }));
      return rows.map(toPublicEducation);
    },

    async skills() {
      const rows = await client.skill.findMany(asArgs({
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { name: true, educations: { select: { title: true }, orderBy: ORDER } },
      }));
      return rows.map((row) => ({ name: row.name, educations: row.educations.map((education) => education.title) }));
    },

    async technologies() {
      const rows = await client.technology.findMany(asArgs({ orderBy: ORDER, select: { name: true, iconPath: true } }));
      return rows.map((row) => ({ name: row.name, icon: imageOrDefault("stack", row.iconPath, url) }));
    },
  };
}

export type PublicReader = ReturnType<typeof createPublicReader>;

let reader: PublicReader | undefined;

function publicReader(): PublicReader {
  reader ??= createPublicReader(db as unknown as PublicDb, (bucket, path) =>
    publicUrlFor(getStorageContext().config, bucket, path),
  );
  return reader;
}

// Une lecture par requête de rendu (layout, page et métadonnées partagent le résultat).
export const getPublicProfile = cache(() => publicReader().profile());
export const getPublicArticles = cache(() => publicReader().articles());
export const getPublicArticle = cache((slug: string) => publicReader().article(slug));
export const getPublicProjects = cache(() => publicReader().projects());
export const getPublicProject = cache((slug: string) => publicReader().project(slug));
export const getPublicEducations = cache(() => publicReader().educations());
export const getPublicSkills = cache(() => publicReader().skills());
export const getPublicTechnologies = cache(() => publicReader().technologies());
