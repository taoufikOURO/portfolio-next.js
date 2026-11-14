import type { BucketKey } from "@/lib/storage/rules";

// Règles de contenu du site public (phase 2), en fonctions pures : aucune
// lecture de base ni de fichier ici, tout est testable avec des doublures.
//
// - Articles : seuls les articles `PUBLISHED`, dans leur version publiée ; un
//   brouillon n'est jamais renvoyé (la page répond 404).
// - Projets : seuls les projets publiés (`isPublished`), dans l'ordre de la base.
// - Images : URL publique calculée depuis le chemin du bucket (E11) ; image
//   manquante → l'image neutre unique `public/defaults/image.svg` (E63).

/** Calcule l'URL publique d'un fichier à partir de son chemin dans un bucket. */
export type UrlResolver = (bucket: BucketKey, path: string) => string;

/** Image neutre unique : fond gris clair, motif carré rouge (aucune photo). */
export const DEFAULT_IMAGE_SRC = "/defaults/image.svg";

export type SiteImage = { src: string; isDefault: boolean };

export function imageOrDefault(bucket: BucketKey, path: string | null | undefined, url: UrlResolver): SiteImage {
  const trimmed = path?.trim();
  return trimmed ? { src: url(bucket, trimmed), isDefault: false } : { src: DEFAULT_IMAGE_SRC, isDefault: true };
}

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export type ProfileRow = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  bio: string;
  about: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  photoPath: string | null;
  resumeUrl: string | null;
  resumePath: string | null;
};

export type PublicProfile = {
  firstName: string;
  fullName: string;
  jobTitle: string;
  bio: string;
  about: string;
  email: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  photo: SiteImage;
  /** Lien externe du CV, ou URL publique du PDF ; `null` sans CV. */
  resumeHref: string | null;
};

export function toPublicProfile(row: ProfileRow | null, url: UrlResolver): PublicProfile {
  const firstName = row?.firstName.trim() ?? "";
  const lastName = row?.lastName.trim() ?? "";
  return {
    firstName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    jobTitle: row?.jobTitle.trim() ?? "",
    bio: row?.bio.trim() ?? "",
    about: row?.about.trim() ?? "",
    email: row?.email.trim() ?? "",
    githubUrl: row?.githubUrl ?? null,
    linkedinUrl: row?.linkedinUrl ?? null,
    photo: imageOrDefault("profile", row?.photoPath, url),
    resumeHref: row?.resumeUrl ?? (row?.resumePath ? url("profile", row.resumePath) : null),
  };
}

/** Nom du site : nom complet du profil, sinon « Portfolio ». */
export function siteNameOf(profile: Pick<PublicProfile, "fullName">): string {
  return profile.fullName || "Portfolio";
}

/**
 * Texte de l'anneau de l'accueil, composé du profil (nom et titre), répété
 * pour faire le tour. Chaîne vide si le profil n'a ni nom ni titre.
 */
export function ringTextOf(profile: Pick<PublicProfile, "fullName" | "jobTitle">, minLength = 60): string {
  const unit = [profile.fullName, profile.jobTitle].filter(Boolean).join(" · ");
  if (!unit) return "";
  const parts = [unit];
  while (parts.join(" · ").length + 3 < minLength) parts.push(unit);
  return `${parts.join(" · ")} · `;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export type ArticleVersionRow = {
  title: string;
  description: string;
  category: string;
  author: string;
  coverImagePath: string | null;
  content?: string;
};

export type ArticleRow = {
  slug: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  lastPublishedAt: Date | null;
  publishedVersion: ArticleVersionRow | null;
};

export type PublicArticleSummary = {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  cover: SiteImage;
  /** « Publié le » : date de la première publication. */
  publishedAt: Date;
  /** « Mis à jour le » : dernière republication, `null` si l'article n'a été publié qu'une fois. */
  updatedAt: Date | null;
};

export type PublicArticle = PublicArticleSummary & { content: string };

/**
 * Article visible par le public, ou `null` : jamais publié, statut autre que
 * `PUBLISHED`, sans version publiée, sans slug ou sans date de publication.
 * Seule la version publiée est lue ; le brouillon n'est jamais consulté.
 */
export function toPublicArticle(row: ArticleRow, url: UrlResolver): PublicArticle | null {
  const version = row.publishedVersion;
  if (row.status !== "PUBLISHED" || !version || !row.slug || !row.publishedAt) return null;
  const updatedAt =
    row.lastPublishedAt && row.lastPublishedAt.getTime() > row.publishedAt.getTime() ? row.lastPublishedAt : null;
  return {
    slug: row.slug,
    title: version.title,
    description: version.description,
    category: version.category,
    author: version.author,
    cover: imageOrDefault("articles", version.coverImagePath, url),
    publishedAt: row.publishedAt,
    updatedAt,
    content: version.content ?? "",
  };
}

/** Articles visibles, du plus récemment publié au plus ancien (ordre stable). */
export function publicArticles(rows: readonly ArticleRow[], url: UrlResolver): PublicArticleSummary[] {
  return rows
    .map((row) => toPublicArticle(row, url))
    .filter((article): article is PublicArticle => article !== null)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime() || a.slug.localeCompare(b.slug))
    .map(({ content, ...summary }) => {
      void content;
      return summary;
    });
}

// ---------------------------------------------------------------------------
// Projets
// ---------------------------------------------------------------------------

export type ProjectRow = {
  slug: string;
  title: string;
  description: string;
  imagePath: string | null;
  isPublished: boolean;
  date: Date | null;
  links: { label: string; url: string; position: number }[];
  technologies: { name: string; iconPath: string }[];
  collaborators: { githubUsername: string; name: string | null; profileUrl: string | null }[];
};

export type PublicCollaborator = { name: string; profileUrl: string | null };

export type PublicProject = {
  slug: string;
  title: string;
  description: string;
  image: SiteImage;
  date: Date | null;
  links: { label: string; url: string }[];
  technologies: { name: string; icon: SiteImage }[];
  /** Nom et lien de profil seulement (ni avatar, ni état de synchronisation). */
  collaborators: PublicCollaborator[];
};

export function toPublicProject(row: ProjectRow, url: UrlResolver): PublicProject | null {
  if (!row.isPublished) return null;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    image: imageOrDefault("projects", row.imagePath, url),
    date: row.date,
    links: [...row.links].sort((a, b) => a.position - b.position).map(({ label, url: href }) => ({ label, url: href })),
    technologies: row.technologies.map((technology) => ({
      name: technology.name,
      icon: imageOrDefault("stack", technology.iconPath, url),
    })),
    collaborators: row.collaborators.map((collaborator) => ({
      name: collaborator.name?.trim() || `@${collaborator.githubUsername}`,
      profileUrl: collaborator.profileUrl,
    })),
  };
}

/** Projets publiés, dans l'ordre reçu (celui de la base : `position`). */
export function publicProjects(rows: readonly ProjectRow[], url: UrlResolver): PublicProject[] {
  return rows.map((row) => toPublicProject(row, url)).filter((project): project is PublicProject => project !== null);
}

// ---------------------------------------------------------------------------
// Éventail de l'accueil
// ---------------------------------------------------------------------------

/** Nombre de cartes de projet autour de la photo. */
export const FAN_PROJECT_SLOTS = 4;

export type FanCard =
  | { kind: "profile"; image: SiteImage; label: string }
  | { kind: "project"; image: SiteImage; label: string; slug: string }
  | { kind: "placeholder"; image: SiteImage };

/**
 * Cartes de l'éventail, de gauche à droite : la photo du profil au centre,
 * les projets dans l'ordre de la base (quatre au plus) de part et d'autre ;
 * les places restantes prennent l'image par défaut.
 */
export function fanCards(
  profile: Pick<PublicProfile, "photo" | "fullName">,
  projects: readonly Pick<PublicProject, "slug" | "title" | "image">[],
  slots = FAN_PROJECT_SLOTS,
): FanCard[] {
  const sideCards: FanCard[] = [];
  for (let index = 0; index < slots; index += 1) {
    const project = projects[index];
    sideCards.push(
      project
        ? { kind: "project", image: project.image, label: project.title, slug: project.slug }
        : { kind: "placeholder", image: { src: DEFAULT_IMAGE_SRC, isDefault: true } },
    );
  }
  const half = Math.ceil(slots / 2);
  const center: FanCard = { kind: "profile", image: profile.photo, label: profile.fullName };
  return [...sideCards.slice(0, half), center, ...sideCards.slice(half)];
}

// ---------------------------------------------------------------------------
// Formations, compétences, stack
// ---------------------------------------------------------------------------

export type EducationRow = {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  institution: string;
  location: string;
  honors: string | null;
  grade: { toString(): string } | null;
  skills: { name: string }[];
};

export type PublicEducation = Omit<EducationRow, "grade"> & { grade: string | null };

export function toPublicEducation(row: EducationRow): PublicEducation {
  return { ...row, grade: row.grade === null ? null : row.grade.toString() };
}

// ---------------------------------------------------------------------------
// Dates (affichage en français)
// ---------------------------------------------------------------------------

/** Fuseau des dates affichées (« publié le », « mis à jour le »), comme l'admin. */
export const SITE_TIME_ZONE = "Europe/Paris";

/** « 26 mars 2026 » */
export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: SITE_TIME_ZONE }).format(
    date,
  );
}

/** « octobre 2025 » : dates au mois, stockées au 1er du mois en UTC. */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** Moyenne sur 20 : « 16,28 ». */
export function formatGrade(grade: string): string {
  return grade.replace(".", ",");
}
