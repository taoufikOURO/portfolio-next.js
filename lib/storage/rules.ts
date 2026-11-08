import "server-only";

import { randomUUID } from "node:crypto";

import { fileTypeFromBuffer } from "file-type";

import { DEV_BUCKET_PREFIX, isDevBucketName } from "../env-schema";

/**
 * Règles des fichiers envoyés vers Supabase Storage (cahier §3.8, étape 10).
 *
 * Tout est vérifié ici, côté serveur, AVANT toute écriture :
 * - taille (5 Mo pour PNG, JPG, WebP et PDF, 1 Mo pour SVG) ;
 * - type réel, lu dans le contenu (`file-type`), jamais déduit de l'extension
 *   ni du type MIME annoncé par le navigateur ;
 * - SVG : refusé s'il contient un script, un attribut `on*`, un
 *   `<foreignObject>` ou une référence externe ;
 * - bucket : en développement, écriture refusée hors des buckets `dev-*`.
 *
 * Le contrôle du navigateur (`components/admin/file-rules.ts`) n'est qu'un
 * confort ; ses valeurs sont comparées à celles-ci par un test.
 *
 * Imports relatifs sans alias `@/` : ce module est aussi chargé par
 * `scripts/setup-storage.ts`, exécuté directement par Node (E24, E33).
 */

const MB = 1024 * 1024;

// ---------------------------------------------------------------------------
// Formats et usages
// ---------------------------------------------------------------------------

export type FileFormat = "png" | "jpg" | "webp" | "svg" | "pdf";

export type FormatRule = {
  /** Extension du fichier enregistré (`<uuid>.<extension>`). */
  extension: string;
  /** Type MIME enregistré avec le fichier (en-tête `Content-Type` servi). */
  contentType: string;
  maxBytes: number;
  /** Libellé affiché dans les messages. */
  label: string;
};

export const FORMAT_RULES: Readonly<Record<FileFormat, FormatRule>> = {
  png: { extension: "png", contentType: "image/png", maxBytes: 5 * MB, label: "PNG" },
  jpg: { extension: "jpg", contentType: "image/jpeg", maxBytes: 5 * MB, label: "JPG" },
  webp: { extension: "webp", contentType: "image/webp", maxBytes: 5 * MB, label: "WebP" },
  svg: { extension: "svg", contentType: "image/svg+xml", maxBytes: 1 * MB, label: "SVG" },
  pdf: { extension: "pdf", contentType: "application/pdf", maxBytes: 5 * MB, label: "PDF" },
};

/** Usage d'un fichier : détermine les formats acceptés. */
export type FileKind = "image" | "icon" | "resume";

export const KIND_FORMATS: Readonly<Record<FileKind, readonly FileFormat[]>> = {
  /** Couverture d'article, image de projet, photos du profil. */
  image: ["png", "jpg", "webp"],
  /** Icône d'une technologie (étape 11 : PNG, WebP ou SVG). */
  icon: ["png", "webp", "svg"],
  /** CV du profil. */
  resume: ["pdf"],
};

/** Buckets de l'application, désignés par leur rôle (noms réels dans `.env`). */
export type BucketKey = "articles" | "projects" | "profile" | "stack";

export const BUCKET_KEYS: readonly BucketKey[] = ["articles", "projects", "profile", "stack"];

/** Variable de `.env` qui porte le nom de chaque bucket. */
export const BUCKET_ENV_VARIABLES = {
  articles: "SUPABASE_STORAGE_BUCKET_ARTICLES",
  projects: "SUPABASE_STORAGE_BUCKET_PROJECTS",
  profile: "SUPABASE_STORAGE_BUCKET_PROFILE",
  stack: "SUPABASE_STORAGE_BUCKET_STACK",
} as const satisfies Record<BucketKey, string>;

/** Usages acceptés par chaque bucket. */
export const BUCKET_KINDS: Readonly<Record<BucketKey, readonly FileKind[]>> = {
  articles: ["image"],
  projects: ["image"],
  profile: ["image", "resume"],
  stack: ["icon"],
};

export function formatsOf(kind: FileKind): readonly FileFormat[] {
  return KIND_FORMATS[kind];
}

/** Plus grande taille acceptée pour un usage (premier filtre, avant lecture). */
export function maxBytesOf(kind: FileKind): number {
  return Math.max(...formatsOf(kind).map((format) => FORMAT_RULES[format].maxBytes));
}

/** Formats acceptés par un bucket (réglage `allowedMimeTypes` du bucket). */
export function bucketContentTypes(bucket: BucketKey): string[] {
  const formats = new Set(BUCKET_KINDS[bucket].flatMap((kind) => formatsOf(kind)));
  return [...formats].map((format) => FORMAT_RULES[format].contentType);
}

/** Plus grande taille acceptée par un bucket (réglage `fileSizeLimit`). */
export function bucketMaxBytes(bucket: BucketKey): number {
  return Math.max(...BUCKET_KINDS[bucket].map((kind) => maxBytesOf(kind)));
}

// ---------------------------------------------------------------------------
// Messages (français)
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  return `${bytes / MB} Mo`;
}

function listFormats(kind: FileKind): string {
  const labels = formatsOf(kind).map((format) => FORMAT_RULES[format].label);
  return labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} ou ${labels[labels.length - 1]}`;
}

export const FILE_MESSAGES = {
  empty: "Le fichier est vide.",
  wrongType: (kind: FileKind) =>
    `Ce fichier n’est pas un ${listFormats(kind)} valide. Son contenu réel est vérifié, pas seulement son extension.`,
  tooLarge: (format: FileFormat) =>
    `Le fichier dépasse la taille maximale de ${formatSize(FORMAT_RULES[format].maxBytes)} pour un ${FORMAT_RULES[format].label}.`,
  tooLargeForKind: (kind: FileKind) =>
    `Le fichier dépasse la taille maximale de ${formatSize(maxBytesOf(kind))}.`,
  kindNotAllowed: "Ce type de fichier n’est pas prévu à cet endroit.",
  svgInvalid: "Ce SVG est mal formé ou n’a pas d’élément <svg> racine : il est refusé.",
  svgDoctype:
    "Ce SVG contient une déclaration DOCTYPE ou ENTITY (risque de référence externe) : il est refusé.",
  svgScript: "Ce SVG contient un script (<script> ou lien javascript:) : il est refusé.",
  svgEventHandler: (attribute: string) =>
    `Ce SVG contient un gestionnaire d’événement (attribut « ${attribute} ») : il est refusé.`,
  svgForeignObject: "Ce SVG contient un élément <foreignObject> : il est refusé.",
  svgExternalReference:
    "Ce SVG contient une référence externe (lien, image, feuille de style ou police chargée depuis un autre fichier) : il est refusé. Seules les références internes (#identifiant) sont acceptées.",
} as const;

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

/** Éléments refusés en plus de `<script>` et `<foreignObject>` : ils chargent ou intègrent un autre document. */
const EMBEDDING_ELEMENTS = new Set(["iframe", "embed", "object", "frame", "frameset", "link"]);

/** Attributs qui portent une référence : seule une référence interne `#id` est acceptée. */
const REFERENCE_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "data"]);

/** `url(...)` dont la cible n'est pas une référence interne `#id`. */
const EXTERNAL_URL = /url\((?!\s*['"]?\s*#)/i;

/**
 * Nom local, en minuscules, sans préfixe d'espace de noms (`svg:script` → `script`).
 * Les caractères de contrôle et espaces sont retirés : `java\tscript:` est
 * interprété comme `javascript:` par les navigateurs.
 */
function localName(name: string): string {
  const lower = name.toLowerCase();
  const colon = lower.lastIndexOf(":");
  return colon === -1 ? lower : lower.slice(colon + 1);
}

function compact(value: string): string {
  return value.replace(/[\u0000- ]+/g, "").toLowerCase();
}

/** Décode les entités numériques et les plus courantes, pour inspecter la valeur réelle. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function safeCodePoint(code: number): string {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

function isInternalReference(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

/** Vérifie une valeur de texte (attribut ou contenu de `<style>`). */
function checkValue(rawValue: string): string | null {
  const value = decodeEntities(rawValue);
  if (compact(value).includes("javascript:")) return FILE_MESSAGES.svgScript;
  if (EXTERNAL_URL.test(value) || /@import/i.test(value)) return FILE_MESSAGES.svgExternalReference;
  return null;
}

type Attribute = { name: string; value: string };

/**
 * Lit les attributs d'une balise ouvrante à partir de `start`.
 * Renvoie la position juste après `>`, ou -1 si la balise n'est pas fermée.
 */
function readAttributes(
  text: string,
  start: number,
): { end: number; attributes: Attribute[] } | null {
  const attributes: Attribute[] = [];
  let i = start;
  const length = text.length;
  while (i < length) {
    const char = text[i];
    if (char === ">") return { end: i + 1, attributes };
    if (/\s|\//.test(char)) {
      i += 1;
      continue;
    }
    // Nom de l'attribut.
    const nameStart = i;
    while (i < length && !/[\s=>/]/.test(text[i])) i += 1;
    const name = text.slice(nameStart, i);
    while (i < length && /\s/.test(text[i])) i += 1;
    let value = "";
    if (text[i] === "=") {
      i += 1;
      while (i < length && /\s/.test(text[i])) i += 1;
      const quote = text[i];
      if (quote === '"' || quote === "'") {
        const close = text.indexOf(quote, i + 1);
        if (close === -1) return null;
        value = text.slice(i + 1, close);
        i = close + 1;
      } else {
        const valueStart = i;
        while (i < length && !/[\s>]/.test(text[i])) i += 1;
        value = text.slice(valueStart, i);
      }
    }
    attributes.push({ name, value });
  }
  return null;
}

/**
 * Renvoie un message d'erreur si le SVG est dangereux ou mal formé, sinon `null`.
 *
 * Analyse prudente plutôt qu'exhaustive : tout ce qui n'est pas compris
 * (DOCTYPE, instruction de traitement autre que `<?xml … ?>`, balise non
 * fermée) est refusé.
 */
export function checkSvg(text: string): string | null {
  const source = text.startsWith("﻿") ? text.slice(1) : text;
  if (source.includes("\u0000")) return FILE_MESSAGES.svgInvalid;

  let i = 0;
  let rootSeen = false;
  let insideStyle = false;
  const length = source.length;

  while (i < length) {
    const open = source.indexOf("<", i);
    if (open === -1) {
      if (insideStyle) {
        const problem = checkValue(source.slice(i));
        if (problem) return problem;
      }
      break;
    }

    // Texte entre deux balises : seul le contenu de <style> est inspecté.
    if (insideStyle) {
      const problem = checkValue(source.slice(i, open));
      if (problem) return problem;
    }

    if (source.startsWith("<!--", open)) {
      const close = source.indexOf("-->", open + 4);
      if (close === -1) return FILE_MESSAGES.svgInvalid;
      i = close + 3;
      continue;
    }
    if (source.startsWith("<![CDATA[", open)) {
      const close = source.indexOf("]]>", open + 9);
      if (close === -1) return FILE_MESSAGES.svgInvalid;
      if (insideStyle) {
        const problem = checkValue(source.slice(open + 9, close));
        if (problem) return problem;
      }
      i = close + 3;
      continue;
    }
    if (source.startsWith("<!", open)) return FILE_MESSAGES.svgDoctype;
    if (source.startsWith("<?", open)) {
      const close = source.indexOf("?>", open + 2);
      if (close === -1) return FILE_MESSAGES.svgInvalid;
      const target = /^<\?([^\s?]*)/.exec(source.slice(open))?.[1] ?? "";
      // Seule la déclaration XML est admise ; `<?xml-stylesheet …?>` charge une feuille externe.
      if (target.toLowerCase() !== "xml") return FILE_MESSAGES.svgExternalReference;
      if (rootSeen) return FILE_MESSAGES.svgInvalid;
      i = close + 2;
      continue;
    }

    const closing = source[open + 1] === "/";
    const nameMatch = /^[A-Za-z_][\w.:-]*/.exec(source.slice(open + (closing ? 2 : 1)));
    if (!nameMatch) return FILE_MESSAGES.svgInvalid;
    const name = localName(nameMatch[0]);
    const afterName = open + (closing ? 2 : 1) + nameMatch[0].length;

    if (closing) {
      const close = source.indexOf(">", afterName);
      if (close === -1) return FILE_MESSAGES.svgInvalid;
      if (name === "style") insideStyle = false;
      i = close + 1;
      continue;
    }

    if (!rootSeen) {
      if (name !== "svg") return FILE_MESSAGES.svgInvalid;
      rootSeen = true;
    }
    if (name === "script") return FILE_MESSAGES.svgScript;
    if (name === "foreignobject") return FILE_MESSAGES.svgForeignObject;
    if (EMBEDDING_ELEMENTS.has(name)) return FILE_MESSAGES.svgExternalReference;

    const tag = readAttributes(source, afterName);
    if (!tag) return FILE_MESSAGES.svgInvalid;

    for (const attribute of tag.attributes) {
      const attributeName = localName(attribute.name);
      if (attributeName.startsWith("on")) return FILE_MESSAGES.svgEventHandler(attribute.name);
      // `<set attributeName="href" to="https://…">` : référence posée par animation.
      if (attributeName === "attributename" && REFERENCE_ATTRIBUTES.has(localName(attribute.value.trim()))) {
        return FILE_MESSAGES.svgExternalReference;
      }
      if (REFERENCE_ATTRIBUTES.has(attributeName)) {
        const value = decodeEntities(attribute.value);
        if (compact(value).includes("javascript:")) return FILE_MESSAGES.svgScript;
        if (!isInternalReference(value)) return FILE_MESSAGES.svgExternalReference;
      }
      const problem = checkValue(attribute.value);
      if (problem) return problem;
    }

    const selfClosing = source[tag.end - 2] === "/";
    if (name === "style" && !selfClosing) insideStyle = true;
    i = tag.end;
  }

  return rootSeen ? null : FILE_MESSAGES.svgInvalid;
}

/** Décode un SVG en UTF-8 strict ; `null` si ce n'est pas du texte UTF-8 valide. */
function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Ressemble à du XML/SVG (premier caractère utile : `<`). */
function looksLikeMarkup(text: string): boolean {
  return /^﻿?\s*</.test(text);
}

// ---------------------------------------------------------------------------
// Inspection d'un fichier
// ---------------------------------------------------------------------------

export type InspectedFile =
  | { ok: true; format: FileFormat; extension: string; contentType: string }
  | { ok: false; error: string };

const DETECTED_FORMATS: Readonly<Record<string, FileFormat>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Détermine le format réel d'un fichier à partir de son contenu et applique
 * les règles de son usage. Le nom et le type MIME annoncés sont ignorés.
 */
export async function inspectFile(bytes: Uint8Array, kind: FileKind): Promise<InspectedFile> {
  if (bytes.byteLength === 0) return { ok: false, error: FILE_MESSAGES.empty };
  if (bytes.byteLength > maxBytesOf(kind)) {
    return { ok: false, error: FILE_MESSAGES.tooLargeForKind(kind) };
  }

  const allowed = formatsOf(kind);
  const detected = await fileTypeFromBuffer(bytes);
  let format: FileFormat | undefined = detected ? DETECTED_FORMATS[detected.mime] : undefined;

  // `file-type` ne reconnaît pas le SVG (format texte) : il est analysé à part.
  if (format === undefined && allowed.includes("svg") && (!detected || detected.mime.includes("xml"))) {
    const text = decodeUtf8(bytes);
    if (text !== null && looksLikeMarkup(text)) {
      if (bytes.byteLength > FORMAT_RULES.svg.maxBytes) {
        return { ok: false, error: FILE_MESSAGES.tooLarge("svg") };
      }
      const problem = checkSvg(text);
      if (problem) return { ok: false, error: problem };
      format = "svg";
    }
  }

  if (format === undefined || !allowed.includes(format)) {
    return { ok: false, error: FILE_MESSAGES.wrongType(kind) };
  }

  const rule = FORMAT_RULES[format];
  if (bytes.byteLength > rule.maxBytes) return { ok: false, error: FILE_MESSAGES.tooLarge(format) };

  return { ok: true, format, extension: rule.extension, contentType: rule.contentType };
}

// ---------------------------------------------------------------------------
// Chemins et buckets
// ---------------------------------------------------------------------------

const EXTENSIONS = Object.values(FORMAT_RULES).map((rule) => rule.extension);

/** Chemin généré : `<uuid>.<extension>`, jamais le nom d'origine. */
export function generateObjectPath(extension: string, uuid: () => string = randomUUID): string {
  if (!EXTENSIONS.includes(extension)) throw new Error("Extension de fichier non prévue.");
  return `${uuid()}.${extension}`;
}

const OBJECT_PATH = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:${EXTENSIONS.join("|")})$`,
);

/** Vrai pour un chemin produit par `generateObjectPath` (pas de dossier, pas de `..`). */
export function isObjectPath(path: string): boolean {
  return OBJECT_PATH.test(path);
}

export type AppEnvName = "development" | "production";

/** Écriture interdite : bucket hors `dev-*` en développement. */
export class StorageGuardError extends Error {
  constructor(bucket: string) {
    super(
      `Écriture refusée dans le bucket « ${bucket} » : en développement (APP_ENV=development), seuls les buckets « ${DEV_BUCKET_PREFIX}* » sont autorisés.`,
    );
    this.name = "StorageGuardError";
  }
}

/** Lève une `StorageGuardError` si l'écriture (envoi, suppression, création) est interdite. */
export function assertWritableBucket(appEnv: AppEnvName, bucket: string): void {
  if (appEnv !== "production" && !isDevBucketName(bucket)) throw new StorageGuardError(bucket);
}

/** URL publique d'un fichier, calculée à l'affichage à partir de son chemin (E11). */
export function buildPublicUrl(supabaseUrl: string, bucket: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;
}
