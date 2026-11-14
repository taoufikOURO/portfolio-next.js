// Import des anciens contenus de `data/` dans la base locale (phase 2, E65).
//
// Lancement (par Taoufik, dans son terminal) :
//   pnpm content:import            simulation (par défaut) : comptes seulement, rien n'est écrit
//   pnpm content:import --apply    import réel dans la base locale et les buckets `dev-*`
//
// - Lit `data/*.json`, les fichiers Markdown locaux de `data/articles/` et les
//   images locales de `public/images/` ; aucune lecture réseau.
// - Écrit uniquement par les modules existants de `lib/` (mêmes validations et
//   mêmes règles que l'admin) : `lib/technologies`, `lib/skills`,
//   `lib/educations`, `lib/profile`, `lib/projects`, `lib/articles/*`,
//   `lib/storage/upload` (images : 1 Mo au plus, type réel vérifié).
// - Idempotent : rien n'est créé si l'élément existe déjà (technologie et
//   compétence par nom normalisé, formation par intitulé et établissement,
//   projet et article par slug, profil s'il a déjà un nom, photo et CV s'ils
//   sont déjà renseignés).
// - Refusé hors de `APP_ENV=development` : jamais de base Supabase.
// - La console n'affiche que des comptes : aucun titre, nom, texte ni valeur.
//
// Exécuté par Node 24 hors de Next.js (E24, E33) : hook de résolution (alias
// `@/` compris, E65) ; `--conditions=react-server` neutralise `server-only`.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { createArticle, saveDraft } from "@/lib/articles/autosave";
import { publishArticle } from "@/lib/articles/publish";
import { getArticle } from "@/lib/articles/read";
import { versionToken } from "@/lib/articles/rules";
import { isArticleSlugTaken } from "@/lib/articles/shared";
import { db } from "@/lib/db";
import { createEducation } from "@/lib/educations";
import { env } from "@/lib/env";
import { getProfile, saveProfileDetails, saveProfilePhotoPath, saveProfileResume } from "@/lib/profile";
import { createProject, setProjectPublication } from "@/lib/projects";
import { createSkill } from "@/lib/skills";
import { slugify } from "@/lib/slug";
import { removeFile } from "@/lib/storage/remove";
import { MAX_FILE_BYTES, type BucketKey, type FileKind } from "@/lib/storage/rules";
import { uploadFile } from "@/lib/storage/upload";
import { createTechnology } from "@/lib/technologies";
import { educationSchema } from "@/lib/validation/education";
import { normalizeProfileUrl, profileDetailsSchema } from "@/lib/validation/profile";
import { createProjectSchema } from "@/lib/validation/project";
import { cleanSkillName, normalizeSkillName } from "@/lib/validation/skill";
import { cleanTechnologyName, normalizeTechnologyName } from "@/lib/validation/technology";

import {
  emptyTally,
  formatTally,
  frenchMonthToValue,
  legacyProjectLinks,
  localPublicPath,
  skip,
  stripLeadingTitle,
  withHttps,
  type LegacyProject,
  type Tally,
} from "./import-public-content/rules";

const PREFIX = "[content:import]";
const ROOT = join(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");

/** Erreur de ce script : son message ne contient jamais de contenu. */
class ImportError extends Error {}

type LegacyTechnology = { name: string; icon?: string };
type LegacyEducation = {
  intitule: string;
  description: string;
  debut: string;
  fin?: string;
  etablissement: string;
  lieu: string;
  mention?: string;
  moyenne?: string;
  competences?: string[];
};
type LegacyProfile = {
  nom: string;
  prenom: string;
  email: string;
  titreProfessionnel: string;
  bio: string;
  aPropos: string;
  liens?: { github?: string; linkedin?: string };
  photo?: string;
  cv?: string;
};
type LegacyFullProject = LegacyProject & {
  slug?: string;
  titre: string;
  description: string;
  estPublie: boolean;
  image?: string;
  stack?: LegacyTechnology[];
};
type LegacyArticle = {
  titre: string;
  description: string;
  auteur: string;
  date: string;
  slug: string;
  mdFile: string;
  categorie: string;
};

async function readJson<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(join(ROOT, "data", name), "utf8")) as T;
}

/** Image locale prête à l'envoi, ou la raison de son refus (sans nom de fichier). */
async function localFile(value: string | undefined): Promise<{ ok: true; path: string } | { ok: false; reason: string } | null> {
  const relative = localPublicPath(value);
  if (relative === null) return value?.trim() ? { ok: false, reason: "image distante ou chemin invalide" } : null;
  const path = join(ROOT, "public", relative);
  try {
    const info = await stat(path);
    if (info.size > MAX_FILE_BYTES) return { ok: false, reason: "image de plus de 1 Mo (à envoyer depuis l'admin)" };
    return { ok: true, path };
  } catch {
    return { ok: false, reason: "image introuvable" };
  }
}

/** Envoie un fichier local ; `null` en simulation. Lève une erreur (sans contenu) si l'envoi est refusé. */
async function upload(bucket: BucketKey, kind: FileKind, path: string): Promise<string | null> {
  if (!APPLY) return null;
  const result = await uploadFile({ bucket, kind, file: new Uint8Array(await readFile(path)) });
  if (!result.ok) throw new ImportError(`envoi d'un fichier refusé (bucket ${bucket})`);
  return result.path;
}

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------

async function importTechnologies(technologies: LegacyTechnology[], tally: Tally): Promise<void> {
  const seen = new Set<string>();
  for (const technology of technologies) {
    const name = cleanTechnologyName(technology.name ?? "");
    const normalizedName = normalizeTechnologyName(name);
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    if (await db.technology.findUnique({ where: { normalizedName }, select: { id: true } })) {
      tally.existing += 1;
      continue;
    }
    const icon = await localFile(technology.icon);
    if (!icon || !icon.ok) {
      skip(tally, icon ? icon.reason : "icône absente");
      continue;
    }
    tally.create += 1;
    const iconPath = await upload("stack", "icon", icon.path);
    if (iconPath === null) continue;
    const result = await createTechnology(name, iconPath);
    if (result.status !== "saved") {
      await removeFile("stack", iconPath);
      tally.create -= 1;
      tally.existing += 1;
    }
  }
}

/** Compétences déjà comptées (une compétence partagée par deux formations compte une fois). */
const countedSkills = new Map<string, string | null>();

async function skillIdsFor(names: string[], tally: Tally): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = cleanSkillName(raw);
    const normalizedName = normalizeSkillName(name);
    if (!normalizedName) continue;
    if (countedSkills.has(normalizedName)) {
      const known = countedSkills.get(normalizedName);
      if (known) ids.push(known);
      continue;
    }
    const existing = await db.skill.findUnique({ where: { normalizedName }, select: { id: true } });
    if (existing) {
      tally.existing += 1;
      ids.push(existing.id);
      countedSkills.set(normalizedName, existing.id);
      continue;
    }
    tally.create += 1;
    countedSkills.set(normalizedName, null);
    if (!APPLY) continue;
    const result = await createSkill(name);
    if (result.status === "saved") {
      ids.push(result.skill.id);
      countedSkills.set(normalizedName, result.skill.id);
    }
  }
  return [...new Set(ids)];
}

async function importEducations(educations: LegacyEducation[], tally: Tally, skills: Tally): Promise<void> {
  for (const education of educations) {
    const existing = await db.education.findFirst({
      where: { title: education.intitule.trim(), institution: education.etablissement.trim() },
      select: { id: true },
    });
    if (existing) {
      tally.existing += 1;
      continue;
    }
    const startDate = frenchMonthToValue(education.debut);
    const skillIds = await skillIdsFor(education.competences ?? [], skills);
    const parsed = educationSchema.safeParse({
      title: education.intitule,
      institution: education.etablissement,
      location: education.lieu,
      startDate: startDate ?? "",
      endDate: frenchMonthToValue(education.fin) ?? "",
      honors: education.mention ?? "",
      grade: education.moyenne ?? "",
      description: education.description,
      // En simulation, les compétences ne sont pas créées : leurs identifiants n'existent pas encore.
      skillIds: APPLY ? skillIds : [],
      newSkill: "",
    });
    if (!parsed.success) {
      skip(tally, "champ refusé par la validation");
      continue;
    }
    tally.create += 1;
    if (!APPLY) continue;
    const result = await createEducation(parsed.data);
    if (result.status !== "saved") {
      tally.create -= 1;
      skip(tally, "refusée par la base");
    }
  }
}

async function importProfile(legacy: LegacyProfile, tally: Tally): Promise<void> {
  const current = await getProfile();

  if (current.firstName.trim() || current.lastName.trim()) {
    tally.existing += 1;
  } else {
    const parsed = profileDetailsSchema.safeParse({
      firstName: legacy.prenom,
      lastName: legacy.nom,
      email: legacy.email,
      jobTitle: legacy.titreProfessionnel,
      bio: legacy.bio,
      about: legacy.aPropos,
      githubUrl: withHttps(legacy.liens?.github),
      linkedinUrl: withHttps(legacy.liens?.linkedin),
    });
    if (!parsed.success) skip(tally, "identité refusée par la validation");
    else {
      tally.create += 1;
      if (APPLY) await saveProfileDetails(parsed.data);
    }
  }

  if (current.photoPath) tally.existing += 1;
  else {
    const photo = await localFile(legacy.photo);
    if (!photo || !photo.ok) skip(tally, photo ? `photo : ${photo.reason}` : "photo absente");
    else {
      tally.create += 1;
      const path = await upload("profile", "image", photo.path);
      if (path) await saveProfilePhotoPath("photo", path);
    }
  }

  if (current.resumeUrl || current.resumePath) tally.existing += 1;
  else {
    const resume = normalizeProfileUrl(legacy.cv ?? "");
    if (!resume.ok || !resume.url) skip(tally, "CV : lien absent ou refusé");
    else {
      tally.create += 1;
      if (APPLY) await saveProfileResume({ url: resume.url });
    }
  }
}

async function importProjects(projects: LegacyFullProject[], tally: Tally): Promise<void> {
  for (const project of projects) {
    const slug = slugify(project.slug?.trim() || project.titre);
    if (slug && (await db.project.findUnique({ where: { slug }, select: { id: true } }))) {
      tally.existing += 1;
      continue;
    }
    const technologyIds: string[] = [];
    for (const technology of project.stack ?? []) {
      const found = await db.technology.findUnique({
        where: { normalizedName: normalizeTechnologyName(cleanTechnologyName(technology.name ?? "")) },
        select: { id: true },
      });
      if (found) technologyIds.push(found.id);
    }
    const parsed = createProjectSchema.safeParse({
      title: project.titre,
      slug,
      description: project.description,
      date: "",
      links: legacyProjectLinks(project),
      technologyIds,
      collaborators: "",
      image: null,
      confirmSlugChange: "",
    });
    if (!parsed.success) {
      skip(tally, "champ refusé par la validation");
      continue;
    }
    const image = await localFile(project.image);
    if (image && !image.ok) skip(tally, `image non importée : ${image.reason}`);
    tally.create += 1;
    if (!APPLY) continue;
    const imagePath = image?.ok ? await upload("projects", "image", image.path) : null;
    const { image: _file, ...input } = parsed.data;
    void _file;
    const result = await createProject(input, { imagePath: imagePath ?? undefined, newCollaborators: [] });
    if (result.status !== "saved") {
      if (imagePath) await removeFile("projects", imagePath);
      tally.create -= 1;
      skip(tally, "refusé par la base");
      continue;
    }
    if (project.estPublie) await setProjectPublication(result.project.id, true);
  }
}

async function importArticles(articles: LegacyArticle[], tally: Tally): Promise<void> {
  for (const article of articles) {
    const slug = slugify(article.slug);
    if (!slug) {
      skip(tally, "slug vide");
      continue;
    }
    if (await isArticleSlugTaken(db, slug)) {
      tally.existing += 1;
      continue;
    }
    if (/^[a-z]+:/i.test(article.mdFile)) {
      skip(tally, "Markdown distant (aucune lecture réseau)");
      continue;
    }
    const mdPath = join(ROOT, article.mdFile);
    if (!mdPath.startsWith(join(ROOT, "data"))) {
      skip(tally, "Markdown hors de data/");
      continue;
    }
    let content: string;
    try {
      content = stripLeadingTitle(await readFile(mdPath, "utf8"));
    } catch {
      skip(tally, "Markdown introuvable");
      continue;
    }
    const publishedAt = new Date(`${article.date}T12:00:00Z`);
    if (!content || Number.isNaN(publishedAt.getTime())) {
      skip(tally, "contenu ou date illisible");
      continue;
    }
    tally.create += 1;
    if (!APPLY) continue;

    const created = await createArticle({ title: article.titre, author: article.auteur });
    const fresh = await getArticle(created.id);
    if (!fresh) throw new ImportError("article créé introuvable");
    const saved = await saveDraft(created.id, versionToken(fresh.updatedAt), {
      title: article.titre,
      slug,
      description: article.description,
      category: article.categorie,
      author: article.auteur,
      content,
    });
    if (saved.status !== "saved" && saved.status !== "unchanged") throw new ImportError("brouillon d'article non enregistré");
    // « Publié le » : la date d'origine de l'article.
    const published = await publishArticle(created.id, versionToken(saved.version), () => publishedAt);
    if (published.status !== "published") {
      tally.create -= 1;
      skip(tally, "publication refusée (reste en brouillon dans l'admin)");
    }
  }
}

// ---------------------------------------------------------------------------
// Lancement
// ---------------------------------------------------------------------------

if (env.APP_ENV !== "development") {
  console.error(`${PREFIX} Refusé : ce script n'écrit que dans la base locale (APP_ENV=development).`);
  process.exit(1);
}

console.log(`${PREFIX} Mode : ${APPLY ? "IMPORT RÉEL (base locale, buckets dev-*)" : "simulation, rien n'est écrit (ajoutez --apply pour importer)"}`);

const tallies = {
  technologies: emptyTally(),
  skills: emptyTally(),
  educations: emptyTally(),
  profile: emptyTally(),
  projects: emptyTally(),
  articles: emptyTally(),
};

try {
  const stack = await readJson<LegacyTechnology[]>("stack.json");
  const projects = await readJson<LegacyFullProject[]>("projets.json");
  await importTechnologies([...stack, ...projects.flatMap((project) => project.stack ?? [])], tallies.technologies);
  await importEducations(await readJson<LegacyEducation[]>("formations.json"), tallies.educations, tallies.skills);
  await importProfile(await readJson<LegacyProfile>("profile.json"), tallies.profile);
  await importProjects(projects, tallies.projects);
  await importArticles(await readJson<LegacyArticle[]>("articles.json"), tallies.articles);
} catch (error) {
  // Jamais le message d'une erreur de la base ou du stockage (il peut citer des valeurs) :
  // seulement les messages de ce script, sinon le nom ou le code de l'erreur.
  const detail =
    error instanceof ImportError
      ? error.message
      : ((error as { code?: string }).code ?? (error instanceof Error ? error.name : "erreur inattendue"));
  console.error(`${PREFIX} Arrêt : ${detail}. Les éléments déjà créés restent ; relancer le script ne les recrée pas.`);
  await db.$disconnect();
  process.exit(1);
}

console.log(`${PREFIX} ${formatTally("Technologies", tallies.technologies, APPLY)}`);
console.log(`${PREFIX} ${formatTally("Compétences (liens de formations)", tallies.skills, APPLY)}`);
console.log(`${PREFIX} ${formatTally("Formations", tallies.educations, APPLY)}`);
console.log(`${PREFIX} ${formatTally("Profil (identité, photo, CV)", tallies.profile, APPLY)}`);
console.log(`${PREFIX} ${formatTally("Projets", tallies.projects, APPLY)}`);
console.log(`${PREFIX} ${formatTally("Articles", tallies.articles, APPLY)}`);
if (!APPLY) console.log(`${PREFIX} Simulation terminée : aucune écriture.`);
await db.$disconnect();
