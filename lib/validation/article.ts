// Formulaires des articles : schémas partagés par le navigateur (autosave,
// contrôle avant publication) et par les actions serveur (avant tout accès à
// la base ou au stockage). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec
// l'éditeur). Le type réel, la taille et le contenu de l'image de couverture
// sont contrôlés par le serveur (`lib/storage/rules.ts`) ; ici, seule la
// présence d'un fichier est vérifiée.
//
// Une version de travail (brouillon) peut être incomplète : seuls les formats
// et les longueurs sont contrôlés à l'enregistrement. Les champs exigés pour
// publier (titre, slug, contenu, E55) sont contrôlés par `publishBlockers`.

import { z } from "zod";

import { isValidSlug, SLUG_MAX_LENGTH } from "@/lib/slug";

import type { FieldErrors } from "./auth";

/** Limites choisies par Claude (E56). `content` : bien en dessous de la limite de 1 Mo d'une Server Action. */
export const ARTICLE_LIMITS = {
  title: 200,
  slug: SLUG_MAX_LENGTH,
  description: 500,
  category: 60,
  author: 120,
  content: 100_000,
} as const;

/** Délai de l'autosave après la dernière frappe (millisecondes). */
export const AUTOSAVE_DELAY_MS = 1500;

/** Fuseau des heures et des dates affichées (« Enregistré à hh:mm », « Publié le »). */
export const ADMIN_TIME_ZONE = "Europe/Paris";

export const ARTICLE_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L’opération a échoué. Réessayez dans quelques instants.",
  titleRequired: "Saisissez le titre de l’article.",
  titleTooLong: `Le titre ne doit pas dépasser ${ARTICLE_LIMITS.title} caractères.`,
  slugInvalid: `Le slug ne peut contenir que des lettres minuscules sans accent, des chiffres et des tirets simples entre deux mots (par exemple mon-article), ${SLUG_MAX_LENGTH} caractères au plus.`,
  descriptionTooLong: `La description ne doit pas dépasser ${ARTICLE_LIMITS.description} caractères.`,
  categoryTooLong: `La catégorie ne doit pas dépasser ${ARTICLE_LIMITS.category} caractères.`,
  authorTooLong: `Le nom de l’auteur ne doit pas dépasser ${ARTICLE_LIMITS.author} caractères.`,
  contentTooLong: `Le contenu ne doit pas dépasser ${ARTICLE_LIMITS.content.toLocaleString("fr-FR")} caractères.`,
  fieldInvalid: "Ce champ n’est pas valide. Rechargez la page.",
  idInvalid: "Cet article n’existe pas.",
  notFound: "Cet article n’existe plus : il a peut-être été supprimé entre-temps.",
  versionInvalid: "La page n’est plus à jour. Rechargez-la avant de continuer.",
  conflict:
    "Cet article a été modifié ailleurs (dans un autre onglet ou une autre fenêtre) depuis l’ouverture de cette page. Rien n’a été enregistré, pour ne pas écraser ces modifications. Copiez votre texte si vous voulez le garder, puis rechargez la page pour reprendre la version enregistrée.",
  autosaveFailed:
    "L’enregistrement automatique a échoué. Vos modifications sont toujours dans l’éditeur : un nouvel essai aura lieu à la prochaine modification, ou utilisez « Enregistrer le brouillon ».",
  publishTitleEmpty: "Saisissez un titre : un article sans titre ne peut pas être publié.",
  publishSlugEmpty: "Saisissez un slug : un article sans slug ne peut pas être publié.",
  publishContentEmpty: "Rédigez le contenu : un article sans contenu ne peut pas être publié.",
  publishSlugToFix: "Corrigez le slug avant de publier.",
  publishIncomplete: "L’article ne peut pas être publié : corrigez les champs indiqués.",
  publicationInvalid: "Publication impossible. Rechargez la page de confirmation.",
  publicationConflict:
    "L’article a été modifié depuis l’affichage de cette page : rien n’a été publié. Rechargez la page pour vérifier la version à publier, puis confirmez de nouveau.",
  nothingToPublish: "Aucune modification à publier : la version en ligne est déjà à jour.",
  discardInvalid: "Abandon impossible. Rechargez la page.",
  discardConflict:
    "L’article a été modifié depuis l’affichage de cette page : rien n’a été abandonné. Rechargez la page, puis recommencez.",
  nothingToDiscard: "Aucune modification en attente : rien à abandonner.",
  coverRequired: "Choisissez une image (PNG, JPG ou WebP).",
  coverConflict:
    "L’article a été modifié ailleurs depuis l’ouverture de cette page : l’image n’a pas été enregistrée. Rechargez la page, puis choisissez-la de nouveau.",
} as const;

export function duplicateSlugMessage(slug: string): string {
  return `Le slug « ${slug} » est déjà utilisé par un autre article (publié ou en brouillon). Choisissez-en un autre.`;
}

/** Slug refusé à l'enregistrement : les autres champs sont enregistrés, le slug précédent est conservé. */
export function slugKeptMessage(previousSlug: string): string {
  return previousSlug === ""
    ? "Le slug n’a pas été enregistré (le brouillon n’a toujours pas de slug)."
    : `Le slug n’a pas été enregistré : le brouillon garde « ${previousSlug} ».`;
}

// ---------------------------------------------------------------------------
// Heures et dates
// ---------------------------------------------------------------------------

const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: ADMIN_TIME_ZONE });
const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: ADMIN_TIME_ZONE });
const DAY_TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
});

/** « 14:05 » (heure de Paris). */
export function formatTime(date: Date): string {
  return TIME_FORMAT.format(date);
}

/** « 12 novembre 2026 ». */
export function formatDay(date: Date): string {
  return DAY_FORMAT.format(date);
}

/** « 12 novembre 2026 à 14:05 ». */
export function formatDayTime(date: Date): string {
  return DAY_TIME_FORMAT.format(date);
}

export function savedAtMessage(date: Date): string {
  return `Enregistré à ${formatTime(date)}`;
}

// ---------------------------------------------------------------------------
// Champs
// ---------------------------------------------------------------------------

/** Champs de la version de travail, dans l'ordre d'affichage de l'éditeur. */
export const ARTICLE_FIELDS = ["title", "slug", "description", "category", "author", "content"] as const;

export type ArticleField = (typeof ARTICLE_FIELDS)[number];

/** Champs exigés pour publier (E55). */
export type PublishField = "title" | "slug" | "content";

function codePointLength(value: string): number {
  return [...value].length;
}

/** Texte sur une ligne : espaces retirés aux extrémités ; vide permis dans un brouillon. */
function lineText(max: number, tooLong: string) {
  return z
    .string({ error: ARTICLE_MESSAGES.fieldInvalid })
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => codePointLength(value) <= max, tooLong);
}

/** Retours à la ligne du navigateur (`\r\n`) ramenés à `\n`. */
export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/**
 * Contenu Markdown : jamais rogné (les espaces de fin de ligne ont un sens en
 * Markdown), retours à la ligne normalisés.
 */
const contentField = z
  .string({ error: ARTICLE_MESSAGES.fieldInvalid })
  .nullish()
  .transform((value) => normalizeNewlines(value ?? ""))
  .refine((value) => codePointLength(value) <= ARTICLE_LIMITS.content, ARTICLE_MESSAGES.contentTooLong);

/**
 * Slug saisi : rogné, jamais réécrit. Vide permis dans un brouillon (refusé à
 * la publication). Sa conformité est vérifiée à part (`slugProblem`) : un slug
 * non conforme n'empêche pas d'enregistrer les autres champs.
 */
const slugText = z
  .string({ error: ARTICLE_MESSAGES.fieldInvalid })
  .nullish()
  .transform((value) => (value ?? "").trim());

/** Message d'erreur du slug saisi, ou `null` s'il est conforme (ou vide). */
export function slugProblem(slug: string): string | null {
  if (slug === "") return null;
  return isValidSlug(slug) ? null : ARTICLE_MESSAGES.slugInvalid;
}

export const articleIdField = z.uuid({ error: ARTICLE_MESSAGES.idInvalid });

/**
 * Date de dernière modification connue par la page (jeton de version) :
 * renvoyée à chaque enregistrement ; si elle ne correspond plus (autre onglet),
 * l'enregistrement est refusé.
 */
export const versionField = z.iso.datetime({ error: ARTICLE_MESSAGES.versionInvalid });

const draftFields = {
  title: lineText(ARTICLE_LIMITS.title, ARTICLE_MESSAGES.titleTooLong),
  slug: slugText,
  description: lineText(ARTICLE_LIMITS.description, ARTICLE_MESSAGES.descriptionTooLong),
  category: lineText(ARTICLE_LIMITS.category, ARTICLE_MESSAGES.categoryTooLong),
  author: lineText(ARTICLE_LIMITS.author, ARTICLE_MESSAGES.authorTooLong),
  content: contentField,
};

/** Enregistrement de la version de travail (autosave, ou bouton sans JavaScript). */
export const articleDraftSchema = z.object({ id: articleIdField, version: versionField, ...draftFields });

export type ArticleDraftInput = z.infer<typeof articleDraftSchema>;

/** Contenu d'une version (sans identifiant ni jeton). */
export type ArticleContent = Omit<ArticleDraftInput, "id" | "version">;

export function articleDraftInputFromFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    version: formData.get("version"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    author: formData.get("author"),
    content: formData.get("content"),
  };
}

/** Saisie de l'éditeur (réaffichée après un refus sans JavaScript). */
export type ArticleDraftValues = Record<ArticleField, string>;

export const EMPTY_ARTICLE_VALUES: ArticleDraftValues = {
  title: "",
  slug: "",
  description: "",
  category: "",
  author: "",
  content: "",
};

export function articleValuesFromFormData(formData: FormData): ArticleDraftValues {
  const text = (name: ArticleField) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.slice(0, ARTICLE_LIMITS[name] * 2) : "";
  };
  return {
    title: text("title"),
    slug: text("slug"),
    description: text("description"),
    category: text("category"),
    author: text("author"),
    content: normalizeNewlines(text("content")),
  };
}

/** Valeurs de l'éditeur pour une version enregistrée. */
export function articleValuesOf(version: ArticleDraftValues): ArticleDraftValues {
  return {
    title: version.title,
    slug: version.slug,
    description: version.description,
    category: version.category,
    author: version.author,
    content: version.content,
  };
}

/**
 * Champs qui empêchent la publication (E55 a) : titre, slug ou contenu vide.
 * Mêmes messages dans le navigateur (avant d'ouvrir la confirmation) et sur le
 * serveur (dans la transaction de publication, puis sur la page de l'éditeur).
 */
export function publishBlockers(version: { title: string; slug: string; content: string }): FieldErrors<PublishField> {
  const errors: FieldErrors<PublishField> = {};
  if (version.title.trim() === "") errors.title = ARTICLE_MESSAGES.publishTitleEmpty;
  if (version.slug.trim() === "") errors.slug = ARTICLE_MESSAGES.publishSlugEmpty;
  if (version.content.trim() === "") errors.content = ARTICLE_MESSAGES.publishContentEmpty;
  return errors;
}

export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.values(errors).some(Boolean);
}

/** État renvoyé par l'enregistrement de la version de travail. */
export type ArticleDraftState = {
  ok: boolean;
  status: "saved" | "unchanged" | "conflict" | "invalid" | "not-found" | "error";
  message: string;
  fieldErrors: FieldErrors<ArticleField>;
  values?: ArticleDraftValues;
  /** Nouveau jeton de version (date de dernière modification, ISO), après un enregistrement. */
  version?: string;
  /** Heure de l'enregistrement (ISO). */
  savedAt?: string;
  /** La version de travail est un brouillon (article jamais publié, ou modifications en attente). */
  isDraft?: boolean;
} | null;

// ---------------------------------------------------------------------------
// Création, couverture, publication, abandon, suppression
// ---------------------------------------------------------------------------

/** Création : seul le titre est demandé ; l'article est créé en brouillon et l'éditeur s'ouvre. */
export const createArticleSchema = z.object({
  title: z
    .string({ error: ARTICLE_MESSAGES.titleRequired })
    .trim()
    .min(1, ARTICLE_MESSAGES.titleRequired)
    .refine((value) => codePointLength(value) <= ARTICLE_LIMITS.title, ARTICLE_MESSAGES.titleTooLong),
});

export type CreateArticleField = "title";
export type CreateArticleState = {
  ok: boolean;
  message: string;
  fieldErrors: FieldErrors<CreateArticleField>;
  values?: { title: string };
} | null;

function isChosenFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

/** Image de couverture, envoyée seule dans son formulaire (E55 b). */
export const coverSchema = z.object({
  id: articleIdField,
  version: versionField,
  file: z.custom<File>(isChosenFile, { error: ARTICLE_MESSAGES.coverRequired }),
});

export function coverInputFromFormData(formData: FormData) {
  return { id: formData.get("id"), version: formData.get("version"), file: formData.get("file") };
}

export type CoverState = {
  ok: boolean;
  /** `warning` : enregistrée, mais l'ancienne image n'a pas pu être supprimée du stockage. */
  tone?: "success" | "warning" | "error";
  message: string;
  fieldErrors: FieldErrors<"file">;
  version?: string;
  coverUrl?: string;
  conflict?: boolean;
} | null;

/** Publication et abandon : envoyés seulement par une confirmation (`confirmed=1`), avec le jeton affiché. */
export const confirmedVersionSchema = z.object({
  id: articleIdField,
  version: versionField,
  confirmed: z.literal("1", { error: ARTICLE_MESSAGES.publicationInvalid }),
});

export function confirmedVersionInputFromFormData(formData: FormData) {
  return { id: formData.get("id"), version: formData.get("version"), confirmed: formData.get("confirmed") };
}

export const deleteArticleSchema = z.object({ id: articleIdField });
