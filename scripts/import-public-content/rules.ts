// Règles pures du script d'import des contenus de `data/` (phase 2, E65 et E68).
// Aucune lecture de fichier ni de base ici : testées par `rules.test.ts`.

const FRENCH_MONTHS: Readonly<Record<string, number>> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** « Octobre 2025 » → « 2025-10 » (valeur d'un champ mois) ; `null` si illisible. */
export function frenchMonthToValue(text: string | undefined): string | null {
  if (!text) return null;
  const match = /^([a-z]+)\s+(\d{4})$/.exec(plain(text));
  if (!match) return null;
  const month = FRENCH_MONTHS[match[1]];
  return month ? `${match[2]}-${String(month).padStart(2, "0")}` : null;
}

/** Le titre de l'article est affiché à part : un titre `# …` en première ligne du Markdown est retiré. */
export function stripLeadingTitle(markdown: string): string {
  return markdown.replace(/^﻿?#\s+[^\n]*(?:\r?\n)+/, "").trim();
}

/** Lien de profil : ajoute `https://` s'il manque (« linkedin.com/in/… »). */
export function withHttps(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type LegacyProject = {
  lien?: string;
  github?: { nom?: string; url?: string }[];
};

/** Liens d'un ancien projet, dans l'ordre : le site d'abord, puis les dépôts. */
export function legacyProjectLinks(project: LegacyProject): { labels: string[]; urls: string[] } {
  const labels: string[] = [];
  const urls: string[] = [];
  if (project.lien?.trim()) {
    labels.push("Voir le projet");
    urls.push(project.lien.trim());
  }
  for (const repository of project.github ?? []) {
    if (!repository.url?.trim()) continue;
    labels.push(repository.nom?.trim() || "Code source");
    urls.push(repository.url.trim());
  }
  return { labels, urls };
}

// ---------------------------------------------------------------------------
// Données personnelles non publiques (E68)
// ---------------------------------------------------------------------------

/**
 * Clés écartées, après normalisation (minuscules, sans accents ni séparateurs) :
 * e-mail personnel, téléphone, adresse postale, date de naissance. Leurs
 * valeurs ne sont jamais lues par l'import ni affichées.
 */
const PERSONAL_KEYS = new Set([
  "email",
  "mail",
  "courriel",
  "adressemail",
  "telephone",
  "tel",
  "phone",
  "phonenumber",
  "mobile",
  "portable",
  "adresse",
  "address",
  "adressepostale",
  "rue",
  "street",
  "codepostal",
  "postalcode",
  "zipcode",
  "datenaissance",
  "datedenaissance",
  "naissance",
  "birthdate",
  "birthday",
  "dateofbirth",
  "dob",
]);

function normalizedKey(key: string): string {
  return plain(key).replace(/[^a-z0-9]/g, "");
}

export function isPersonalKey(key: string): boolean {
  return PERSONAL_KEYS.has(normalizedKey(key));
}

/**
 * Chemins des champs personnels présents dans un fichier (« profile.json : email »,
 * « projets.json : [].telephone »), sans leurs valeurs, triés et sans doublon.
 */
export function personalFieldPaths(file: string, value: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, `${path}[]`);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key;
      if (isPersonalKey(key)) found.add(`${file} : ${childPath}`);
      else walk(child, childPath);
    }
  };
  walk(value, "");
  return [...found].sort();
}

/** Texte importé qui contient quelque chose qui ressemble à un e-mail ou à un numéro de téléphone. */
export function looksPersonal(text: string): boolean {
  return /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i.test(text) || /(?:\+\d{2,3}[\s.-]?)?(?:\d{2}[\s.-]){4}\d{2}\b/.test(text);
}

// ---------------------------------------------------------------------------
// Articles : publié ou brouillon (E68)
// ---------------------------------------------------------------------------

/**
 * Un ancien article est public s'il était affiché par l'ancien site : listé dans
 * `articles.json`, sans marque de brouillon, daté au plus tard aujourd'hui.
 * Les marques reconnues : `estPublie`/`publie`/`published` à `false`,
 * `brouillon`/`draft` à `true`. Sinon : brouillon.
 */
export function isLegacyArticlePublic(article: Record<string, unknown>, date: Date, today: Date): boolean {
  for (const key of ["estPublie", "publie", "published"]) {
    if (typeof article[key] === "boolean") return article[key] as boolean && date.getTime() <= today.getTime();
  }
  for (const key of ["brouillon", "draft"]) {
    if (article[key] === true) return false;
  }
  return date.getTime() <= today.getTime();
}

/** « 2025-03-14 » → minuit et demi-journée UTC (évite un changement de jour à l'affichage) ; `null` si illisible. */
export function legacyDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const date = new Date(`${value.trim()}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------
// Options de la commande
// ---------------------------------------------------------------------------

export type ImportOptions = { apply: boolean; confirmProduction: boolean };

/**
 * `--dry-run` (simulation, par défaut), `--apply` (écriture), `--confirm-production`.
 * Une option inconnue ou les deux modes ensemble sont refusés (une faute de
 * frappe ne doit jamais changer la cible).
 */
export function parseImportArgs(args: readonly string[]): { ok: true; options: ImportOptions } | { ok: false; message: string } {
  const known = new Set(["--dry-run", "--apply", "--confirm-production"]);
  const unknown = args.filter((arg) => arg !== "--" && !known.has(arg));
  if (unknown.length > 0) {
    return { ok: false, message: "option inconnue (options permises : --dry-run, --apply, --confirm-production)" };
  }
  const apply = args.includes("--apply");
  if (apply && args.includes("--dry-run")) return { ok: false, message: "--dry-run et --apply sont incompatibles" };
  return { ok: true, options: { apply, confirmProduction: args.includes("--confirm-production") } };
}

// ---------------------------------------------------------------------------
// Compteurs
// ---------------------------------------------------------------------------

/** Compteurs affichés par le script (jamais de contenu). */
export type Tally = { create: number; existing: number; skipped: Record<string, number> };

export function emptyTally(): Tally {
  return { create: 0, existing: 0, skipped: {} };
}

export function skip(tally: Tally, reason: string): void {
  tally.skipped[reason] = (tally.skipped[reason] ?? 0) + 1;
}

export function formatTally(label: string, tally: Tally, apply: boolean): string {
  const skipped = Object.entries(tally.skipped)
    .map(([reason, count]) => `${count} ignoré(s) : ${reason}`)
    .join(" ; ");
  const verb = apply ? "créé(s)" : "à créer";
  return `${label} : ${tally.create} ${verb}, ${tally.existing} déjà présent(s)${skipped ? ` ; ${skipped}` : ""}`;
}
