import "server-only";

import { db } from "@/lib/db";
import { displayStatusOf, type ArticleDisplayStatus } from "@/lib/articles/rules";
import { workingVersionOf } from "@/lib/articles/shared";
import { getProfile, type Profile } from "@/lib/profile";
import { profileDetailsSchema, type ProfileDetailsField } from "@/lib/validation/profile";

// Données du tableau de bord (étape 15, E58). Lectures seules, uniquement sur
// la base : aucun appel réseau. Les compteurs sont de simples requêtes de
// comptage (aucune ligne chargée) ; la liste des articles à reprendre est
// limitée à `PENDING_ARTICLES_LIMIT` lignes.

/** Nombre maximal d'articles listés (brouillons et modifications en attente). */
export const PENDING_ARTICLES_LIMIT = 10;

export type DashboardCounts = {
  /** Articles en ligne (ceux qui ont des modifications en attente comprises). */
  articlesPublished: number;
  /** Articles jamais publiés. */
  articlesDraft: number;
  /** Articles en ligne avec un brouillon de modifications non publié. */
  articlesPending: number;
  projectsPublished: number;
  projectsUnpublished: number;
  educations: number;
  skills: number;
  technologies: number;
};

export type PendingArticle = {
  id: string;
  /** Titre de la version de travail si elle existe, sinon de la version publiée. */
  title: string;
  status: Exclude<ArticleDisplayStatus, "published">;
  updatedAt: Date;
};

/** Champs obligatoires du profil, dans l'ordre d'affichage. */
const REQUIRED_PROFILE_FIELDS = ["firstName", "lastName", "email", "jobTitle"] as const satisfies readonly ProfileDetailsField[];

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export type ProfileCompleteness = { complete: true } | { complete: false; missing: RequiredProfileField[] };

export type Dashboard = {
  counts: DashboardCounts;
  /** Au plus `PENDING_ARTICLES_LIMIT` articles, les plus récemment modifiés d'abord. */
  pendingArticles: PendingArticle[];
  /** Nombre total d'articles à reprendre (brouillons et modifications en attente), liste tronquée ou non. */
  pendingArticlesTotal: number;
  profile: ProfileCompleteness;
  /** Aucun contenu : ni article, ni projet, ni formation, ni compétence, ni technologie. */
  empty: boolean;
};

const requiredProfileSchema = profileDetailsSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  jobTitle: true,
});

/**
 * Profil complet : prénom, nom, e-mail de contact et titre professionnel sont
 * valides selon les règles du formulaire du profil (`profileDetailsSchema`).
 * Un champ vide, fait d'espaces ou (pour l'e-mail) invalide est « manquant ».
 */
export function profileCompleteness(profile: Pick<Profile, RequiredProfileField>): ProfileCompleteness {
  const result = requiredProfileSchema.safeParse(profile);
  if (result.success) return { complete: true };
  const invalid = new Set(result.error.issues.map((issue) => issue.path[0]));
  return { complete: false, missing: REQUIRED_PROFILE_FIELDS.filter((field) => invalid.has(field)) };
}

/** Base sans contenu : tous les compteurs de contenu à zéro. */
export function isDashboardEmpty(counts: DashboardCounts): boolean {
  return (
    counts.articlesPublished === 0 &&
    counts.articlesDraft === 0 &&
    counts.projectsPublished === 0 &&
    counts.projectsUnpublished === 0 &&
    counts.educations === 0 &&
    counts.skills === 0 &&
    counts.technologies === 0
  );
}

/** Articles à reprendre : jamais publiés, ou publiés avec une version de travail non publiée (`pending`). */
const PENDING_WHERE = { OR: [{ status: "DRAFT" as const }, { draftVersionId: { not: null } }] };

/** Statut et titre d'un article de la liste, d'après la même règle que la liste des articles. */
function toPendingArticle(article: {
  id: string;
  status: "DRAFT" | "PUBLISHED";
  draftVersionId: string | null;
  updatedAt: Date;
  draftVersion: { title: string } | null;
  publishedVersion: { title: string } | null;
}): PendingArticle | null {
  const status = displayStatusOf(article);
  if (status === "published") return null;
  return {
    id: article.id,
    title: workingVersionOf(article)?.title || "Sans titre",
    status,
    updatedAt: article.updatedAt,
  };
}

export async function getDashboard(): Promise<Dashboard> {
  const [
    articlesPublished,
    articlesDraft,
    articlesPending,
    projectsPublished,
    projectsUnpublished,
    educations,
    skills,
    technologies,
    pendingRows,
    profile,
  ] = await Promise.all([
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { status: "DRAFT" } }),
    db.article.count({ where: { status: "PUBLISHED", draftVersionId: { not: null } } }),
    db.project.count({ where: { isPublished: true } }),
    db.project.count({ where: { isPublished: false } }),
    db.education.count(),
    db.skill.count(),
    db.technology.count(),
    db.article.findMany({
      where: PENDING_WHERE,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: PENDING_ARTICLES_LIMIT,
      select: {
        id: true,
        status: true,
        draftVersionId: true,
        updatedAt: true,
        draftVersion: { select: { title: true } },
        publishedVersion: { select: { title: true } },
      },
    }),
    getProfile(),
  ]);

  const counts: DashboardCounts = {
    articlesPublished,
    articlesDraft,
    articlesPending,
    projectsPublished,
    projectsUnpublished,
    educations,
    skills,
    technologies,
  };

  return {
    counts,
    pendingArticles: pendingRows.flatMap((row) => toPendingArticle(row) ?? []),
    pendingArticlesTotal: articlesDraft + articlesPending,
    profile: profileCompleteness(profile),
    empty: isDashboardEmpty(counts),
  };
}
