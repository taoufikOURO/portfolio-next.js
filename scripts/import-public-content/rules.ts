// Règles pures du script d'import des contenus de `data/` (phase 2, E65).
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

/** Chemin d'une image locale de `public/` (« /images/… ») ; `null` pour une URL distante ou vide. */
export function localPublicPath(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || /^[a-z]+:/i.test(trimmed) || !trimmed.startsWith("/")) return null;
  if (trimmed.split("/").includes("..")) return null;
  return trimmed.slice(1);
}

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
