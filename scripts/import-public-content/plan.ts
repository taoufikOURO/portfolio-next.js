// Plan d'import (phase 2, E65 et E68) : transforme les anciens fichiers de
// `data/` en éléments prêts à écrire, validés par les schémas de l'admin.
//
// Module pur : aucune lecture de fichier, de base ni de réseau (le Markdown des
// articles est lu par le script et passé ici). Testé par `plan.test.ts`.
//
// - Images : jamais importées. Les champs image restent vides en base (le site
//   affiche l'image par défaut, E63) ; aucun chemin local n'est conservé.
// - Données personnelles non publiques (e-mail personnel, téléphone, adresse,
//   date de naissance) : jamais lues ; leurs noms de champs sont listés.

import type { z } from "zod";

import { slugify } from "@/lib/slug";
import { articleDraftSchema, publishBlockers, hasErrors, slugProblem, type ArticleContent } from "@/lib/validation/article";
import { educationSchema, type EducationInput } from "@/lib/validation/education";
import { normalizeProfileUrl, profileDetailsSchema } from "@/lib/validation/profile";
import { createProjectSchema, type ProjectInput } from "@/lib/validation/project";
import { cleanSkillName, normalizeSkillName, skillSchema } from "@/lib/validation/skill";
import { cleanTechnologyName, createTechnologySchema, normalizeTechnologyName } from "@/lib/validation/technology";

import {
  frenchMonthToValue,
  isLegacyArticlePublic,
  legacyDay,
  legacyProjectLinks,
  looksPersonal,
  personalFieldPaths,
  stripLeadingTitle,
  withHttps,
  type LegacyProject,
} from "./rules";

// ---------------------------------------------------------------------------
// Anciens formats (`data/*.json`)
// ---------------------------------------------------------------------------

type LegacyTechnology = { name?: string; icon?: string };
type LegacyEducation = {
  intitule?: string;
  description?: string;
  debut?: string;
  fin?: string;
  etablissement?: string;
  lieu?: string;
  mention?: string;
  moyenne?: string;
  competences?: string[];
};
type LegacyProfile = {
  nom?: string;
  prenom?: string;
  titreProfessionnel?: string;
  bio?: string;
  aPropos?: string;
  liens?: { github?: string; linkedin?: string };
  photo?: string;
  transparentPhoto?: string;
  cv?: string;
};
type LegacyFullProject = LegacyProject & {
  slug?: string;
  titre?: string;
  description?: string;
  estPublie?: boolean;
  date?: string;
  image?: string;
  stack?: LegacyTechnology[];
  collaborateurs?: string[];
};
type LegacyArticle = {
  titre?: string;
  description?: string;
  auteur?: string;
  date?: string;
  slug?: string;
  mdFile?: string;
  categorie?: string;
  image?: string;
};

/** Fichiers JSON de `data/` (déjà parsés) et Markdown des articles, lu par le script. */
export type LegacySources = {
  /** Tous les fichiers JSON lus, par nom (pour la recherche des champs personnels). */
  files: Readonly<Record<string, unknown>>;
  /** Contenu des fichiers Markdown, par valeur de `mdFile` ; absent : introuvable ou refusé. */
  markdown: ReadonlyMap<string, string>;
};

/** Fichiers lus par l'import ; les autres (`faq.json`, `services.json`…) n'ont pas de modèle en base. */
export const IMPORTED_FILES = ["stack.json", "projets.json", "formations.json", "profile.json", "articles.json"] as const;

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type SectionKey = "technologies" | "skills" | "educations" | "profile" | "projects" | "articles";

export const SECTION_KEYS: readonly SectionKey[] = ["technologies", "skills", "educations", "profile", "projects", "articles"];

export type PlannedTechnology = { name: string; normalizedName: string };
export type PlannedSkill = { name: string; normalizedName: string };
export type PlannedEducation = { input: EducationInput; skillKeys: string[] };
export type ProfileIdentity = Omit<z.infer<typeof profileDetailsSchema>, "email">;
export type PlannedProfile = { identity: ProfileIdentity | null; resumeUrl: string | null };
export type PlannedProject = { input: ProjectInput; technologyKeys: string[]; isPublished: boolean };
export type PlannedArticle = {
  slug: string;
  content: ArticleContent;
  status: "PUBLISHED" | "DRAFT";
  /** Date d'origine (« publié le », date de création) ; `null` : inconnue. */
  date: Date | null;
};

export type ImportPlan = {
  technologies: PlannedTechnology[];
  skills: PlannedSkill[];
  educations: PlannedEducation[];
  profile: PlannedProfile;
  projects: PlannedProject[];
  articles: PlannedArticle[];
  /** Éléments écartés dès la lecture, par section et par raison (sans contenu). */
  rejected: Record<SectionKey, Record<string, number>>;
  /** Champs image renseignés dans `data/`, laissés vides en base. */
  imagesLeftEmpty: number;
  /** Champs personnels non importés (« fichier : chemin »), sans valeur. */
  personalFields: string[];
  /** Textes importés qui semblent contenir un e-mail ou un téléphone (« section : champ »), sans valeur. */
  personalTextWarnings: string[];
  /** Fichiers JSON de `data/` sans modèle en base, non importés. */
  ignoredFiles: string[];
};

const PROFILE_IDENTITY_SCHEMA = profileDetailsSchema.omit({ email: true });
const TECHNOLOGY_NAME_SCHEMA = createTechnologySchema.pick({ name: true });
const ARTICLE_CONTENT_SCHEMA = articleDraftSchema.omit({ id: true, version: true });

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter((item) => item !== null && typeof item === "object") as T[]) : [];
}

function asObject<T>(value: unknown): T {
  return (value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}) as T;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function hasImage(value: unknown): boolean {
  return text(value).trim() !== "";
}

/** Construit le plan. `today` : date du jour (un article daté du futur reste en brouillon). */
export function buildImportPlan(sources: LegacySources, today: Date): ImportPlan {
  const rejected = Object.fromEntries(SECTION_KEYS.map((key) => [key, {}])) as ImportPlan["rejected"];
  const reject = (section: SectionKey, reason: string) => {
    rejected[section][reason] = (rejected[section][reason] ?? 0) + 1;
  };
  const warnings = new Set<string>();
  const warnIfPersonal = (label: string, value: string) => {
    if (looksPersonal(value)) warnings.add(label);
  };
  let imagesLeftEmpty = 0;

  const stack = asArray<LegacyTechnology>(sources.files["stack.json"]);
  const legacyProjects = asArray<LegacyFullProject>(sources.files["projets.json"]);
  const legacyEducations = asArray<LegacyEducation>(sources.files["formations.json"]);
  const legacyProfile = asObject<LegacyProfile>(sources.files["profile.json"]);
  const legacyArticles = asArray<LegacyArticle & Record<string, unknown>>(sources.files["articles.json"]);

  // Technologies : `stack.json`, puis celles des projets ; une par nom normalisé.
  const technologies = new Map<string, PlannedTechnology>();
  for (const technology of [...stack, ...legacyProjects.flatMap((project) => asArray<LegacyTechnology>(project.stack))]) {
    if (hasImage(technology.icon)) imagesLeftEmpty += 1;
    const parsed = TECHNOLOGY_NAME_SCHEMA.safeParse({ name: cleanTechnologyName(text(technology.name)) });
    if (!parsed.success) {
      reject("technologies", "nom refusé par la validation");
      continue;
    }
    const normalizedName = normalizeTechnologyName(parsed.data.name);
    if (!technologies.has(normalizedName)) technologies.set(normalizedName, { name: parsed.data.name, normalizedName });
  }

  // Compétences : celles des formations ; une par nom normalisé.
  const skills = new Map<string, PlannedSkill>();
  const skillKeysOf = (names: unknown): string[] => {
    const keys: string[] = [];
    for (const raw of Array.isArray(names) ? names : []) {
      const parsed = skillSchema.safeParse({ name: cleanSkillName(text(raw)) });
      if (!parsed.success) {
        reject("skills", "nom refusé par la validation");
        continue;
      }
      const normalizedName = normalizeSkillName(parsed.data.name);
      if (!skills.has(normalizedName)) skills.set(normalizedName, { name: parsed.data.name, normalizedName });
      if (!keys.includes(normalizedName)) keys.push(normalizedName);
    }
    return keys;
  };

  const educations: PlannedEducation[] = [];
  for (const education of legacyEducations) {
    const parsed = educationSchema.safeParse({
      title: text(education.intitule),
      institution: text(education.etablissement),
      location: text(education.lieu),
      startDate: frenchMonthToValue(text(education.debut)) ?? "",
      endDate: frenchMonthToValue(text(education.fin)) ?? "",
      honors: text(education.mention),
      grade: text(education.moyenne),
      description: text(education.description),
      skillIds: [],
      newSkill: "",
    });
    if (!parsed.success) {
      reject("educations", "champ refusé par la validation");
      continue;
    }
    warnIfPersonal("formations : description", parsed.data.description);
    // Compétences retenues seulement pour une formation importée.
    educations.push({ input: parsed.data, skillKeys: skillKeysOf(education.competences) });
  }

  // Profil : identité sans e-mail ; photos jamais importées ; CV par lien seulement.
  if (hasImage(legacyProfile.photo)) imagesLeftEmpty += 1;
  if (hasImage(legacyProfile.transparentPhoto)) imagesLeftEmpty += 1;
  let identity: ProfileIdentity | null = null;
  if (text(legacyProfile.prenom).trim() || text(legacyProfile.nom).trim()) {
    const parsed = PROFILE_IDENTITY_SCHEMA.safeParse({
      firstName: text(legacyProfile.prenom),
      lastName: text(legacyProfile.nom),
      jobTitle: text(legacyProfile.titreProfessionnel),
      bio: text(legacyProfile.bio),
      about: text(legacyProfile.aPropos),
      githubUrl: withHttps(legacyProfile.liens?.github),
      linkedinUrl: withHttps(legacyProfile.liens?.linkedin),
    });
    if (parsed.success) {
      identity = parsed.data;
      warnIfPersonal("profil : bio", identity.bio);
      warnIfPersonal("profil : à propos", identity.about);
    } else reject("profile", "identité refusée par la validation");
  }
  let resumeUrl: string | null = null;
  if (text(legacyProfile.cv).trim()) {
    const resume = normalizeProfileUrl(text(legacyProfile.cv));
    if (resume.ok && resume.url) resumeUrl = resume.url;
    else reject("profile", "CV : lien refusé (un fichier se dépose depuis l'admin)");
  }

  // Projets : liens ordonnés, technologies, collaborateurs ; image jamais importée.
  const projects: PlannedProject[] = [];
  const projectSlugs = new Set<string>();
  for (const project of legacyProjects) {
    if (hasImage(project.image)) imagesLeftEmpty += 1;
    const parsed = createProjectSchema.safeParse({
      title: text(project.titre),
      slug: slugify(text(project.slug).trim() || text(project.titre)),
      description: text(project.description),
      date: text(project.date),
      links: legacyProjectLinks(project),
      technologyIds: [],
      collaborators: (Array.isArray(project.collaborateurs) ? project.collaborateurs : []).map(text).join("\n"),
      image: null,
      confirmSlugChange: "",
    });
    if (!parsed.success) {
      reject("projects", "champ refusé par la validation");
      continue;
    }
    const { image: _image, ...input } = parsed.data;
    void _image;
    if (projectSlugs.has(input.slug)) {
      reject("projects", "slug en double dans data/");
      continue;
    }
    projectSlugs.add(input.slug);
    warnIfPersonal("projets : description", input.description);
    const technologyKeys = [
      ...new Set(
        asArray<LegacyTechnology>(project.stack)
          .map((technology) => normalizeTechnologyName(cleanTechnologyName(text(technology.name))))
          .filter((key) => technologies.has(key)),
      ),
    ];
    projects.push({ input, technologyKeys, isPublished: project.estPublie === true });
  }

  // Articles : publiés seulement s'ils l'étaient déjà, à leur date d'origine.
  const articles: PlannedArticle[] = [];
  const articleSlugs = new Set<string>();
  for (const article of legacyArticles) {
    if (hasImage(article.image)) imagesLeftEmpty += 1;
    const slug = slugify(text(article.slug));
    if (!slug || slugProblem(slug)) {
      reject("articles", "slug vide ou invalide");
      continue;
    }
    if (articleSlugs.has(slug)) {
      reject("articles", "slug en double dans data/");
      continue;
    }
    const markdown = sources.markdown.get(text(article.mdFile));
    if (markdown === undefined) {
      reject("articles", "Markdown introuvable, distant ou hors de data/");
      continue;
    }
    const parsed = ARTICLE_CONTENT_SCHEMA.safeParse({
      title: text(article.titre),
      slug,
      description: text(article.description),
      category: text(article.categorie),
      author: text(article.auteur),
      content: stripLeadingTitle(markdown),
    });
    if (!parsed.success) {
      reject("articles", "champ refusé par la validation");
      continue;
    }
    articleSlugs.add(slug);
    const date = legacyDay(article.date);
    const isPublic = date !== null && isLegacyArticlePublic(article, date, today) && !hasErrors(publishBlockers(parsed.data));
    warnIfPersonal("articles : description", parsed.data.description);
    warnIfPersonal("articles : contenu", parsed.data.content);
    articles.push({ slug, content: parsed.data, status: isPublic ? "PUBLISHED" : "DRAFT", date });
  }

  const personalFields = Object.entries(sources.files).flatMap(([file, value]) => personalFieldPaths(file, value));
  const ignoredFiles = Object.keys(sources.files)
    .filter((file) => !(IMPORTED_FILES as readonly string[]).includes(file))
    .sort();

  return {
    technologies: [...technologies.values()],
    skills: [...skills.values()],
    educations,
    profile: { identity, resumeUrl },
    projects,
    articles,
    rejected,
    imagesLeftEmpty,
    personalFields: [...new Set(personalFields)].sort(),
    personalTextWarnings: [...warnings].sort(),
    ignoredFiles,
  };
}
