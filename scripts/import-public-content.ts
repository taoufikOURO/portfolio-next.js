// Import des anciens contenus de `data/` dans la base (phase 2, E65 et E68).
//
// Lancement (par Taoufik, dans son terminal) :
//   pnpm content:import --dry-run   simulation (aussi sans option) : comptes seulement, rien n'est écrit
//   pnpm content:import --apply     import réel dans la base locale `portfolio`
// Production (étape 17 seulement, variables de production chargées) :
//   pnpm content:import --dry-run --confirm-production
//   pnpm content:import --apply --confirm-production
//
// - Lit `data/*.json` et les fichiers Markdown de `data/articles/` ; aucune
//   lecture réseau, aucune image lue ni envoyée, aucun bucket touché.
// - Profil, technologies, compétences, formations, projets (liens ordonnés,
//   technologies, collaborateurs), articles (publiés seulement s'ils l'étaient
//   déjà, à leur date d'origine ; sinon brouillons). Champs image laissés vides
//   (image par défaut du site). Données personnelles non publiques écartées.
// - Idempotent : relancer ne crée aucun doublon (clés : `run.ts`) et ne modifie
//   jamais un élément existant, ni l'administrateur, ses sessions ou ses jetons.
// - Refusé si `APP_ENV=production` ou si `DATABASE_URL` n'est pas locale, en
//   simulation comme en import réel, sauf avec `--confirm-production` (E68).
// - La console n'affiche que des comptes et des noms de champs : aucun titre,
//   nom, texte, valeur ni URL.
//
// Exécuté par Node 24 hors de Next.js (E24, E33) : hook de résolution (alias
// `@/` compris, E65) ; `--conditions=react-server` neutralise `server-only`.

import { readFile, readdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { productionTargetRefusal } from "@/lib/target-guard";

import { buildImportPlan, IMPORTED_FILES, type LegacySources } from "./import-public-content/plan";
import { formatTally, parseImportArgs } from "./import-public-content/rules";
import { articleStatusCounts, runImport } from "./import-public-content/run";
import { prismaImportStore } from "./import-public-content/store";

const PREFIX = "[content:import]";
const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "data");

function stop(message: string): never {
  console.error(`${PREFIX} Refusé : ${message}`);
  process.exit(1);
}

const parsedArgs = parseImportArgs(process.argv.slice(2));
if (!parsedArgs.ok) stop(parsedArgs.message);
const { apply, confirmProduction } = parsedArgs.options;

// Avant toute lecture de la base, en simulation comme en import réel.
const refusal = productionTargetRefusal({ appEnv: env.APP_ENV, databaseUrl: env.DATABASE_URL, confirmProduction });
if (refusal) stop(refusal);

/** Fichiers JSON de `data/` ; un fichier illisible est signalé par son nom seulement. */
async function readSources(): Promise<LegacySources> {
  const files: Record<string, unknown> = {};
  for (const name of (await readdir(DATA)).filter((file) => file.endsWith(".json")).sort()) {
    try {
      files[name] = JSON.parse(await readFile(join(DATA, name), "utf8"));
    } catch {
      stop(`fichier illisible : data/${name}`);
    }
  }
  for (const name of IMPORTED_FILES) if (!(name in files)) stop(`fichier absent : data/${name}`);

  // Markdown des articles : local et sous `data/` seulement (aucune lecture réseau).
  const markdown = new Map<string, string>();
  const articles = Array.isArray(files["articles.json"]) ? (files["articles.json"] as { mdFile?: unknown }[]) : [];
  for (const article of articles) {
    const mdFile = typeof article?.mdFile === "string" ? article.mdFile : "";
    if (!mdFile || /^[a-z]+:/i.test(mdFile)) continue;
    const path = resolve(ROOT, mdFile);
    if (!path.startsWith(DATA + sep)) continue;
    try {
      markdown.set(mdFile, await readFile(path, "utf8"));
    } catch {
      // Introuvable : compté par le plan.
    }
  }
  return { files, markdown };
}

console.log(
  `${PREFIX} Mode : ${apply ? "IMPORT RÉEL" : "simulation (--dry-run), rien n'est écrit"} ; cible : ${
    confirmProduction ? "production confirmée (--confirm-production)" : "base locale"
  }`,
);

try {
  const plan = buildImportPlan(await readSources(), new Date());
  const tallies = await runImport(plan, prismaImportStore, { apply });
  const statuses = articleStatusCounts(plan);

  console.log(`${PREFIX} ${formatTally("Technologies", tallies.technologies, apply)}`);
  console.log(`${PREFIX} ${formatTally("Compétences", tallies.skills, apply)}`);
  console.log(`${PREFIX} ${formatTally("Formations", tallies.educations, apply)}`);
  console.log(`${PREFIX} ${formatTally("Profil (identité, CV)", tallies.profile, apply)}`);
  console.log(`${PREFIX} ${formatTally("Projets", tallies.projects, apply)}`);
  console.log(`${PREFIX} ${formatTally("Articles", tallies.articles, apply)}`);
  console.log(`${PREFIX} Articles lus dans data/ : ${statuses.published} publié(s), ${statuses.draft} brouillon(s)`);
  console.log(`${PREFIX} Champs image laissés vides (image par défaut) : ${plan.imagesLeftEmpty}`);
  console.log(
    `${PREFIX} Champs personnels non importés : ${plan.personalFields.length}${
      plan.personalFields.length ? ` (${plan.personalFields.join(", ")})` : ""
    }`,
  );
  if (plan.personalTextWarnings.length) {
    console.log(`${PREFIX} À relire (texte qui semble contenir un e-mail ou un téléphone) : ${plan.personalTextWarnings.join(", ")}`);
  }
  if (plan.ignoredFiles.length) console.log(`${PREFIX} Fichiers sans modèle en base, non importés : ${plan.ignoredFiles.join(", ")}`);
  console.log(`${PREFIX} ${apply ? "Import terminé." : "Simulation terminée : aucune écriture."}`);
} catch (error) {
  // Jamais le message d'une erreur de la base (il peut citer des valeurs) : son code ou son nom seulement.
  const detail = (error as { code?: string }).code ?? (error instanceof Error ? error.name : "erreur inattendue");
  console.error(`${PREFIX} Arrêt : ${detail}. Les éléments déjà créés restent ; relancer le script ne les recrée pas.`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
