import "server-only";

import { db } from "@/lib/db";
import { displayStatusOf, type ArticleDisplayStatus } from "@/lib/articles/rules";
import { workingVersionOf } from "@/lib/articles/shared";
import { getProfile, type Profile } from "@/lib/profile";
import { ADMIN_TIME_ZONE } from "@/lib/validation/article";
import { profileDetailsSchema, type ProfileDetailsField } from "@/lib/validation/profile";

// Données du tableau de bord (étape 15, E58). Lectures seules, uniquement sur
// la base : aucun appel réseau. Les compteurs sont de simples requêtes de
// comptage (aucune ligne chargée) ; la liste des articles à reprendre est
// limitée à `PENDING_ARTICLES_LIMIT` lignes. Étape 18 (E60) : publications par
// mois (d'après `publishedAt`) et projets récents, pour le graphique et le bloc
// « Projets récents » ; aucune donnée inventée.

/** Nombre maximal d'articles listés (brouillons et modifications en attente). */
export const PENDING_ARTICLES_LIMIT = 10;

/** Nombre de mois du graphique des publications, mois en cours compris. */
export const PUBLICATION_MONTHS = 6;

/** Nombre de projets du bloc « Projets récents ». */
export const RECENT_PROJECTS_LIMIT = 3;

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

/** Un mois du graphique : clé `AAAA-MM` (fuseau de l'admin) et nombre d'articles publiés pour la première fois ce mois-là. */
export type MonthCount = { month: string; count: number };

export type RecentProject = {
  id: string;
  title: string;
  isPublished: boolean;
  /** Chemin de l'image dans le bucket (URL calculée à l'affichage), ou `null`. */
  imagePath: string | null;
  /** Noms des technologies, dans l'ordre de la stack. */
  technologies: string[];
};

export type Dashboard = {
  counts: DashboardCounts;
  /** Au plus `PENDING_ARTICLES_LIMIT` articles, les plus récemment modifiés d'abord. */
  pendingArticles: PendingArticle[];
  /** Nombre total d'articles à reprendre (brouillons et modifications en attente), liste tronquée ou non. */
  pendingArticlesTotal: number;
  profile: ProfileCompleteness;
  /** `PUBLICATION_MONTHS` mois, du plus ancien au mois en cours. */
  publishedByMonth: MonthCount[];
  /** Au plus `RECENT_PROJECTS_LIMIT` projets, les plus récemment modifiés d'abord. */
  recentProjects: RecentProject[];
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

const MONTH_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: ADMIN_TIME_ZONE });

/** Mois `AAAA-MM` d'une date, dans le fuseau de l'admin (Europe/Paris). */
export function monthKey(date: Date): string {
  const parts = MONTH_KEY_FORMAT.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

/** Les `months` mois qui finissent par celui de `now`, du plus ancien au plus récent (`AAAA-MM`). */
export function lastMonths(now: Date, months: number = PUBLICATION_MONTHS): string[] {
  const [year, month] = monthKey(now).split("-").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const offset = month - 1 - (months - 1 - index);
    const y = year + Math.floor(offset / 12);
    const m = ((offset % 12) + 12) % 12;
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  });
}

/** Nombre de dates par mois sur les derniers mois ; les dates hors de la période sont ignorées. */
export function countPerMonth(dates: Date[], now: Date, months: number = PUBLICATION_MONTHS): MonthCount[] {
  const counts = new Map(lastMonths(now, months).map((key) => [key, 0]));
  for (const date of dates) {
    const key = monthKey(date);
    const current = counts.get(key);
    if (current !== undefined) counts.set(key, current + 1);
  }
  return [...counts].map(([month, count]) => ({ month, count }));
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

export async function getDashboard(now: Date = new Date()): Promise<Dashboard> {
  // Borne basse large (un jour avant le premier mois) : le tri fin se fait par mois, dans le fuseau de l'admin.
  const since = new Date(now.getTime() - (PUBLICATION_MONTHS * 31 + 1) * 24 * 60 * 60 * 1000);
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
    publishedRows,
    projectRows,
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
    db.article.findMany({ where: { publishedAt: { gte: since } }, select: { publishedAt: true } }),
    db.project.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: RECENT_PROJECTS_LIMIT,
      select: {
        id: true,
        title: true,
        isPublished: true,
        imagePath: true,
        technologies: { select: { name: true }, orderBy: [{ position: "asc" }, { id: "asc" }] },
      },
    }),
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
    publishedByMonth: countPerMonth(
      publishedRows.flatMap((row) => (row.publishedAt ? [row.publishedAt] : [])),
      now,
    ),
    recentProjects: projectRows.map((project) => ({
      id: project.id,
      title: project.title,
      isPublished: project.isPublished,
      imagePath: project.imagePath,
      technologies: project.technologies.map((technology) => technology.name),
    })),
    empty: isDashboardEmpty(counts),
  };
}
