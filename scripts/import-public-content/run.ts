// Exécution du plan d'import (phase 2, E65 et E68), indépendante de la base :
// toutes les lectures et écritures passent par un `ImportStore` (Prisma dans
// `store.ts`, double en mémoire dans les tests).
//
// - Idempotent : chaque élément a une clé stable (technologie et compétence :
//   nom normalisé ; formation : intitulé et établissement ; projet et article :
//   slug ; profil : identité seulement si le nom est vide, CV seulement s'il
//   manque). Un élément déjà présent n'est jamais modifié.
// - Simulation (`apply: false`) : aucune écriture, seulement des lectures.
// - L'interface ne donne accès ni à l'administrateur, ni à ses sessions, ni à
//   ses jetons : l'import ne peut pas les modifier.

import type { EducationInput } from "@/lib/validation/education";
import type { ProjectInput } from "@/lib/validation/project";

import {
  SECTION_KEYS,
  type ImportPlan,
  type PlannedArticle,
  type ProfileIdentity,
  type SectionKey,
} from "./plan";
import { emptyTally, type Tally } from "./rules";

export interface ImportStore {
  findTechnologyId(normalizedName: string): Promise<string | null>;
  /** Crée la technologie sans icône (champ vide) ; renvoie son identifiant (celui de l'existante si créée entre-temps). */
  createTechnology(name: string): Promise<string>;
  findSkillId(normalizedName: string): Promise<string | null>;
  createSkill(name: string): Promise<string>;
  educationExists(title: string, institution: string): Promise<boolean>;
  /** `false` : refusée par la base (compétence disparue…). */
  createEducation(input: EducationInput): Promise<boolean>;
  profileState(): Promise<{ hasIdentity: boolean; hasResume: boolean }>;
  /** Identité, textes et liens ; l'e-mail et les photos ne sont jamais écrits. */
  saveProfileIdentity(identity: ProfileIdentity): Promise<void>;
  saveProfileResumeUrl(url: string): Promise<void>;
  projectExists(slug: string): Promise<boolean>;
  /** Projet sans image ; `false` : refusé par la base (slug pris entre-temps…). */
  createProject(input: ProjectInput, isPublished: boolean): Promise<boolean>;
  articleSlugTaken(slug: string): Promise<boolean>;
  /** Article et sa version, en une transaction ; `false` : slug pris entre-temps. */
  createArticle(article: PlannedArticle): Promise<boolean>;
}

export type ImportTallies = Record<SectionKey, Tally>;

/** Remplace les identifiants pas encore créés pendant une simulation. */
const PENDING = "pending";

export async function runImport(plan: ImportPlan, store: ImportStore, { apply }: { apply: boolean }): Promise<ImportTallies> {
  const tallies = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, { ...emptyTally(), skipped: { ...plan.rejected[key] } }]),
  ) as ImportTallies;
  const refuse = (section: SectionKey, reason: string) => {
    tallies[section].skipped[reason] = (tallies[section].skipped[reason] ?? 0) + 1;
  };

  // Technologies.
  const technologyIds = new Map<string, string>();
  for (const technology of plan.technologies) {
    const existing = await store.findTechnologyId(technology.normalizedName);
    if (existing) {
      tallies.technologies.existing += 1;
      technologyIds.set(technology.normalizedName, existing);
      continue;
    }
    tallies.technologies.create += 1;
    technologyIds.set(technology.normalizedName, apply ? await store.createTechnology(technology.name) : PENDING);
  }

  // Compétences.
  const skillIds = new Map<string, string>();
  for (const skill of plan.skills) {
    const existing = await store.findSkillId(skill.normalizedName);
    if (existing) {
      tallies.skills.existing += 1;
      skillIds.set(skill.normalizedName, existing);
      continue;
    }
    tallies.skills.create += 1;
    skillIds.set(skill.normalizedName, apply ? await store.createSkill(skill.name) : PENDING);
  }

  // Formations, avec leurs compétences.
  for (const education of plan.educations) {
    if (await store.educationExists(education.input.title, education.input.institution)) {
      tallies.educations.existing += 1;
      continue;
    }
    if (!apply) {
      tallies.educations.create += 1;
      continue;
    }
    const ids = education.skillKeys.map((key) => skillIds.get(key)).filter((id): id is string => !!id && id !== PENDING);
    if (await store.createEducation({ ...education.input, skillIds: [...new Set(ids)] })) tallies.educations.create += 1;
    else refuse("educations", "refusée par la base");
  }

  // Profil : identité, puis CV.
  const profile = await store.profileState();
  if (plan.profile.identity) {
    if (profile.hasIdentity) tallies.profile.existing += 1;
    else {
      tallies.profile.create += 1;
      if (apply) await store.saveProfileIdentity(plan.profile.identity);
    }
  }
  if (plan.profile.resumeUrl) {
    if (profile.hasResume) tallies.profile.existing += 1;
    else {
      tallies.profile.create += 1;
      if (apply) await store.saveProfileResumeUrl(plan.profile.resumeUrl);
    }
  }

  // Projets, avec liens, technologies et collaborateurs.
  for (const project of plan.projects) {
    if (await store.projectExists(project.input.slug)) {
      tallies.projects.existing += 1;
      continue;
    }
    if (!apply) {
      tallies.projects.create += 1;
      continue;
    }
    const ids = project.technologyKeys.map((key) => technologyIds.get(key)).filter((id): id is string => !!id && id !== PENDING);
    if (await store.createProject({ ...project.input, technologyIds: [...new Set(ids)] }, project.isPublished)) {
      tallies.projects.create += 1;
    } else refuse("projects", "refusé par la base");
  }

  // Articles.
  for (const article of plan.articles) {
    if (await store.articleSlugTaken(article.slug)) {
      tallies.articles.existing += 1;
      continue;
    }
    if (!apply || (await store.createArticle(article))) tallies.articles.create += 1;
    else tallies.articles.existing += 1;
  }

  return tallies;
}

/** Articles du plan par statut (comptes seulement). */
export function articleStatusCounts(plan: ImportPlan): { published: number; draft: number } {
  const published = plan.articles.filter((article) => article.status === "PUBLISHED").length;
  return { published, draft: plan.articles.length - published };
}
