// Formulaires des projets : schémas partagés par le client (avant envoi) et
// par les actions serveur (avant tout accès à la base, à GitHub ou au
// stockage). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec les
// formulaires). Le type réel, la taille et le contenu de l'image sont
// contrôlés par le serveur (`lib/storage/rules.ts`) ; ici, seule la présence
// d'un fichier est vérifiée.
//
// Le statut de publication ne fait partie d'aucun schéma de formulaire : il ne
// change que par la page de confirmation (`publicationSchema`).

import { z } from "zod";

import { isValidSlug, slugify, SLUG_MAX_LENGTH, SLUG_PATTERN } from "@/lib/slug";

import type { FieldErrors } from "./auth";
import { EDUCATION_LIMITS, formatMonthValue, parseMonth } from "./education";

export { formatMonthValue };

export const PROJECT_LIMITS = {
  title: 200,
  description: 5000,
  slug: SLUG_MAX_LENGTH,
  linkLabel: 80,
  linkUrl: 500,
  /** Liens d'un projet. */
  links: 10,
  /** Garde-fou : technologies cochées dans un seul envoi. */
  technologies: 200,
  /** Collaborateurs d'un projet (noms distincts). */
  collaborators: 30,
  /** Longueur maximale de la zone de texte des collaborateurs. */
  collaboratorsText: 3000,
  minYear: EDUCATION_LIMITS.minYear,
  maxYear: EDUCATION_LIMITS.maxYear,
} as const;

/** Nombre de lignes de liens vides proposées sans JavaScript (aucun bouton « Ajouter un lien »). */
export const EMPTY_LINK_ROWS_WITHOUT_JS = 3;

export const PROJECT_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  titleRequired: "Saisissez le titre du projet.",
  titleTooLong: `Le titre ne doit pas dépasser ${PROJECT_LIMITS.title} caractères.`,
  descriptionRequired: "Saisissez une description.",
  descriptionTooLong: `La description ne doit pas dépasser ${PROJECT_LIMITS.description} caractères.`,
  slugInvalid: `Le slug ne peut contenir que des lettres minuscules sans accent, des chiffres et des tirets simples entre deux mots (par exemple mon-projet), ${SLUG_MAX_LENGTH} caractères au plus.`,
  slugUngenerable:
    "Impossible de générer un slug à partir de ce titre (aucune lettre sans accent ni chiffre). Saisissez un slug.",
  dateInvalid: `Saisissez une date valide au format AAAA-MM (par exemple 2024-06), entre ${PROJECT_LIMITS.minYear} et ${PROJECT_LIMITS.maxYear}, ou laissez le champ vide.`,
  linksInvalid: "La liste des liens n'est pas valide. Rechargez la page.",
  linksTooMany: `Un projet ne peut pas avoir plus de ${PROJECT_LIMITS.links} liens.`,
  technologiesInvalid: "La sélection des technologies n'est pas valide. Rechargez la page.",
  technologiesMissing:
    "Une des technologies cochées n'existe plus (supprimée entre-temps). Vérifiez la sélection.",
  collaboratorsTooLong: `La liste des collaborateurs est trop longue (${PROJECT_LIMITS.collaboratorsText} caractères au plus).`,
  collaboratorsTooMany: `Un projet ne peut pas avoir plus de ${PROJECT_LIMITS.collaborators} collaborateurs.`,
  imageInvalid: "Le fichier choisi n'est pas valide. Choisissez une image (PNG, JPG ou WebP).",
  idInvalid: "Ce projet n'existe pas.",
  notFound: "Ce projet n'existe plus : il a peut-être été supprimé entre-temps.",
  moveInvalid: "Déplacement impossible. Rechargez la page.",
  publicationInvalid: "Changement de statut impossible. Rechargez la page de confirmation.",
  collaboratorInvalid: "Ce collaborateur n'existe plus : rechargez la page.",
} as const;

/**
 * Slug d'un projet publié modifié sans la confirmation : l'adresse publique
 * changerait (décision de Taoufik, E54 point 5).
 */
export function publishedSlugChangeMessage(currentSlug: string, nextSlug: string): string {
  return `Ce projet est publié : changer son slug changera son adresse publique, de /projets/${currentSlug} à /projets/${nextSlug}. Cochez « Je confirme le changement d’adresse publique » pour enregistrer.`;
}

/**
 * Règle pure : la modification du slug d'un projet publié exige une
 * confirmation explicite. Un projet non publié, ou un slug inchangé, n'en
 * demande pas.
 */
export function needsSlugChangeConfirmation(input: {
  isPublished: boolean;
  currentSlug: string;
  nextSlug: string;
  confirmed: boolean;
}): boolean {
  return input.isPublished && input.currentSlug !== input.nextSlug && !input.confirmed;
}

export function duplicateSlugMessage(slug: string): string {
  return `Le slug « ${slug} » est déjà utilisé par un autre projet. Choisissez-en un autre.`;
}

export function projectMovedMessage(title: string, position: number, total: number): string {
  return `« ${title} » est maintenant en position ${position} sur ${total}.`;
}

export type ProjectMoveDirection = "up" | "down";

export function projectAtEdgeMessage(title: string, direction: ProjectMoveDirection): string {
  return direction === "up"
    ? `« ${title} » est déjà en première position.`
    : `« ${title} » est déjà en dernière position.`;
}

// ---------------------------------------------------------------------------
// Noms d'utilisateur GitHub
// ---------------------------------------------------------------------------

export const GITHUB_USERNAME_MAX_LENGTH = 39;

/**
 * Règles de GitHub : lettres, chiffres et tirets ; ni tiret en début ou en
 * fin, ni deux tirets de suite ; 39 caractères au plus. Ici en minuscules
 * (forme enregistrée, `normalizeGitHubUsername`).
 */
const GITHUB_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*$/;

/** Nom d'utilisateur conforme, déjà en minuscules. Seul un nom conforme est envoyé à GitHub. */
export function isValidGitHubUsername(value: string): boolean {
  return value.length <= GITHUB_USERNAME_MAX_LENGTH && GITHUB_USERNAME_PATTERN.test(value);
}

/**
 * Forme enregistrée d'un nom saisi : espaces retirés aux extrémités, en
 * minuscules (GitHub ne distingue pas la casse : « Octocat » et « octocat »
 * sont le même compte). La conformité est vérifiée ensuite.
 */
export function normalizeGitHubUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function invalidUsernameReason(value: string): string {
  if (value.length > GITHUB_USERNAME_MAX_LENGTH) return `${GITHUB_USERNAME_MAX_LENGTH} caractères au plus`;
  if (/[^a-z0-9-]/.test(value)) return "lettres sans accent, chiffres et tirets seulement";
  if (value.startsWith("-")) return "pas de tiret au début";
  if (value.endsWith("-")) return "pas de tiret à la fin";
  if (value.includes("--")) return "pas deux tirets de suite";
  return "nom non conforme";
}

export type CollaboratorsParse =
  | { ok: true; usernames: string[] }
  | { ok: false; message: string };

/**
 * Zone de texte des collaborateurs : un nom par ligne, lignes vides ignorées,
 * doublons de la saisie ignorés (casse comprise). Refus si un nom n'est pas
 * conforme (tous les noms fautifs sont cités, avec leur ligne) ou s'il reste
 * plus de 30 noms distincts.
 */
export function parseCollaborators(text: string): CollaboratorsParse {
  const usernames: string[] = [];
  const invalid: string[] = [];
  for (const [index, line] of text.split(/\r\n|\r|\n/).entries()) {
    const username = normalizeGitHubUsername(line);
    if (username === "") continue;
    if (!isValidGitHubUsername(username)) {
      // Extrait borné : un nom très long n'est pas recopié en entier dans le message.
      const shown = username.length > 45 ? `${[...username].slice(0, 40).join("")}…` : username;
      invalid.push(`« ${shown} » (ligne ${index + 1} : ${invalidUsernameReason(username)})`);
      continue;
    }
    if (!usernames.includes(username)) usernames.push(username);
  }
  if (invalid.length > 0) {
    const intro =
      invalid.length === 1 ? "Ce nom d'utilisateur GitHub n'est pas valide" : "Ces noms d'utilisateur GitHub ne sont pas valides";
    return { ok: false, message: `${intro} : ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "…" : ""}.` };
  }
  if (usernames.length > PROJECT_LIMITS.collaborators) {
    return { ok: false, message: PROJECT_MESSAGES.collaboratorsTooMany };
  }
  return { ok: true, usernames };
}

// ---------------------------------------------------------------------------
// Liens
// ---------------------------------------------------------------------------

export type LinkRefusal =
  | "http"
  | "scheme"
  | "invalid"
  | "credentials"
  | "tooLong";

/**
 * Adresse d'un lien : `https://` obligatoire. `http://` est refusé (jamais
 * réécrit), comme tout autre schéma ou une adresse sans `https://`. L'adresse
 * est enregistrée telle que saisie (espaces aux extrémités retirés).
 */
export function checkLinkUrl(value: string): { ok: true; url: string } | { ok: false; reason: LinkRefusal } {
  const url = value.trim();
  if (url.length > PROJECT_LIMITS.linkUrl) return { ok: false, reason: "tooLong" };
  if (/^http:/i.test(url)) return { ok: false, reason: "http" };
  if (!/^https:\/\//i.test(url)) return { ok: false, reason: "scheme" };
  if (/\s/.test(url)) return { ok: false, reason: "invalid" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.includes(".") || parsed.hostname.endsWith(".")) {
    return { ok: false, reason: "invalid" };
  }
  if (parsed.username || parsed.password) return { ok: false, reason: "credentials" };
  return { ok: true, url };
}

const LINK_URL_MESSAGES: Record<LinkRefusal, string> = {
  http: "l’adresse doit commencer par https:// (http:// n’est pas accepté)",
  scheme: "l’adresse doit commencer par https://",
  invalid: "l’adresse n’est pas valide",
  credentials: "l’adresse ne doit pas contenir d’identifiant ni de mot de passe",
  tooLong: `l’adresse ne doit pas dépasser ${PROJECT_LIMITS.linkUrl} caractères`,
};

export function linkErrorMessage(row: number, problem: string): string {
  return `Lien ${row} : ${problem}.`;
}

/** Rang (à partir de 1) de la ligne visée par un message d'erreur des liens, ou `null`. */
export function linkErrorRow(message: string | undefined): number | null {
  const match = message ? /^Lien (\d+) :/.exec(message) : null;
  return match ? Number(match[1]) : null;
}

export type ProjectLinkInput = { label: string; url: string };

function cleanLabel(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function codePointLength(value: string): number {
  return [...value].length;
}

const linksField = z
  .object({
    labels: z.array(z.string(), { error: PROJECT_MESSAGES.linksInvalid }),
    urls: z.array(z.string(), { error: PROJECT_MESSAGES.linksInvalid }),
  })
  .transform(({ labels, urls }, context): ProjectLinkInput[] => {
    if (labels.length !== urls.length || labels.length > PROJECT_LIMITS.links * 4) {
      context.addIssue({ code: "custom", message: PROJECT_MESSAGES.linksInvalid });
      return z.NEVER;
    }
    const links: ProjectLinkInput[] = [];
    for (const [index, rawLabel] of labels.entries()) {
      const label = cleanLabel(rawLabel);
      const rawUrl = urls[index].trim();
      // Ligne entièrement vide : ignorée (lignes libres du formulaire sans JavaScript).
      if (label === "" && rawUrl === "") continue;
      const row = index + 1;
      if (label === "") {
        context.addIssue({ code: "custom", message: linkErrorMessage(row, "saisissez un libellé (par exemple « Démo »)") });
        return z.NEVER;
      }
      if (codePointLength(label) > PROJECT_LIMITS.linkLabel) {
        context.addIssue({
          code: "custom",
          message: linkErrorMessage(row, `le libellé ne doit pas dépasser ${PROJECT_LIMITS.linkLabel} caractères`),
        });
        return z.NEVER;
      }
      if (rawUrl === "") {
        context.addIssue({ code: "custom", message: linkErrorMessage(row, "saisissez l’adresse, en https://") });
        return z.NEVER;
      }
      const checked = checkLinkUrl(rawUrl);
      if (!checked.ok) {
        context.addIssue({ code: "custom", message: linkErrorMessage(row, LINK_URL_MESSAGES[checked.reason]) });
        return z.NEVER;
      }
      links.push({ label, url: checked.url });
    }
    if (links.length > PROJECT_LIMITS.links) {
      context.addIssue({ code: "custom", message: PROJECT_MESSAGES.linksTooMany });
      return z.NEVER;
    }
    return links;
  });

// ---------------------------------------------------------------------------
// Schéma du formulaire (création et modification)
// ---------------------------------------------------------------------------

function requiredText(max: number, requiredMessage: string, tooLongMessage: string) {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .refine((value) => codePointLength(value) <= max, tooLongMessage);
}

/** Slug saisi : vide → `null` (généré depuis le titre). Un slug non conforme est refusé, pas réécrit. */
const slugField = z
  .string({ error: PROJECT_MESSAGES.slugInvalid })
  .nullish()
  .transform((value, context) => {
    const trimmed = value?.trim() ?? "";
    if (trimmed === "") return null;
    if (!isValidSlug(trimmed)) {
      context.addIssue({ code: "custom", message: PROJECT_MESSAGES.slugInvalid });
      return z.NEVER;
    }
    return trimmed;
  });

const dateField = z
  .string({ error: PROJECT_MESSAGES.dateInvalid })
  .nullish()
  .transform((value, context) => {
    const trimmed = value?.trim() ?? "";
    if (trimmed === "") return null;
    const date = parseMonth(trimmed);
    if (!date) {
      context.addIssue({ code: "custom", message: PROJECT_MESSAGES.dateInvalid });
      return z.NEVER;
    }
    return date;
  });

const technologyIdsField = z
  .array(z.uuid({ error: PROJECT_MESSAGES.technologiesInvalid }), { error: PROJECT_MESSAGES.technologiesInvalid })
  .max(PROJECT_LIMITS.technologies, PROJECT_MESSAGES.technologiesInvalid)
  .transform((ids) => [...new Set(ids)]);

const collaboratorsField = z
  .string({ error: PROJECT_MESSAGES.collaboratorsTooLong })
  .nullish()
  .transform((value, context) => {
    const text = value ?? "";
    if (text.length > PROJECT_LIMITS.collaboratorsText) {
      context.addIssue({ code: "custom", message: PROJECT_MESSAGES.collaboratorsTooLong });
      return z.NEVER;
    }
    const parsed = parseCollaborators(text);
    if (!parsed.ok) {
      context.addIssue({ code: "custom", message: parsed.message });
      return z.NEVER;
    }
    return parsed.usernames;
  });

/** Image facultative : aucun fichier choisi → `null`. */
const optionalImageField = z.unknown().transform((value, context): File | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof File) return value.size > 0 ? value : null;
  context.addIssue({ code: "custom", message: PROJECT_MESSAGES.imageInvalid });
  return z.NEVER;
});

/** Identifiant d'un projet (UUID) : vérifié avant toute requête. */
export const projectIdField = z.uuid({ error: PROJECT_MESSAGES.idInvalid });

const projectFields = z.object({
  title: requiredText(PROJECT_LIMITS.title, PROJECT_MESSAGES.titleRequired, PROJECT_MESSAGES.titleTooLong),
  slug: slugField,
  description: requiredText(
    PROJECT_LIMITS.description,
    PROJECT_MESSAGES.descriptionRequired,
    PROJECT_MESSAGES.descriptionTooLong,
  ),
  date: dateField,
  links: linksField,
  technologyIds: technologyIdsField,
  collaborators: collaboratorsField,
  image: optionalImageField,
  /** Case « Je confirme le changement d’adresse publique » (modification d'un projet publié). */
  confirmSlugChange: z.unknown().transform((value) => value === "1"),
});

/** Slug vide : généré depuis le titre ; refus si le titre n'en permet aucun. */
function withSlug<T extends { title: string; slug: string | null }>(
  value: T,
  context: z.RefinementCtx,
): Omit<T, "slug"> & { slug: string } {
  const slug = value.slug ?? slugify(value.title);
  if (slug === "") {
    context.addIssue({ code: "custom", message: PROJECT_MESSAGES.slugUngenerable, path: ["slug"] });
    return z.NEVER;
  }
  return { ...value, slug };
}

/**
 * Création. Aucun champ de statut : un projet est toujours créé non publié.
 * Les clés inconnues (dont `isPublished`) sont ignorées par Zod.
 */
export const createProjectSchema = projectFields.transform(withSlug);

/** Modification. Le statut n'en fait pas partie : il ne change que par `publicationSchema`. */
export const updateProjectSchema = projectFields.extend({ id: projectIdField }).transform(withSlug);

/** Données enregistrées en base (l'image est traitée à part, par `lib/storage/`). */
export type ProjectInput = Omit<z.infer<typeof createProjectSchema>, "image">;

/** Champs du formulaire, dans l'ordre d'affichage. */
export const PROJECT_FIELDS = [
  "title",
  "slug",
  "confirmSlugChange",
  "description",
  "date",
  "image",
  "links",
  "technologyIds",
  "collaborators",
] as const;

export type ProjectField = (typeof PROJECT_FIELDS)[number];

function textValue(formData: FormData, name: string): FormDataEntryValue | null {
  return formData.get(name);
}

function stringsOf(formData: FormData, name: string): unknown[] {
  return formData.getAll(name);
}

/**
 * Lecture du formulaire, identique côté client et côté serveur. Les liens
 * arrivent en deux listes parallèles (`linkLabel`, `linkUrl`), dans l'ordre
 * des lignes du formulaire. `isPublished` n'est jamais lu.
 */
export function projectInputFromFormData(formData: FormData) {
  return {
    id: textValue(formData, "id"),
    title: textValue(formData, "title"),
    slug: textValue(formData, "slug"),
    description: textValue(formData, "description"),
    date: textValue(formData, "date"),
    links: { labels: stringsOf(formData, "linkLabel"), urls: stringsOf(formData, "linkUrl") },
    technologyIds: stringsOf(formData, "technologyIds"),
    collaborators: textValue(formData, "collaborators"),
    image: formData.get("image"),
    confirmSlugChange: formData.get("confirmSlugChange"),
  };
}

/** Saisie à réafficher après un refus (React vide le formulaire après l'action ; un fichier ne peut pas l'être). */
export type ProjectFormValues = {
  title: string;
  slug: string;
  description: string;
  date: string;
  collaborators: string;
  /** « 1 » si la case de confirmation du changement de slug était cochée. */
  confirmSlugChange: string;
  technologyIds: string[];
  links: ProjectLinkInput[];
};

export function projectValuesFromFormData(formData: FormData): ProjectFormValues {
  const text = (name: string, max: number) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.slice(0, max) : "";
  };
  const strings = (name: string, maxItems: number, maxLength: number) =>
    formData
      .getAll(name)
      .slice(0, maxItems)
      .map((value) => (typeof value === "string" ? value.slice(0, maxLength) : ""));
  const labels = strings("linkLabel", PROJECT_LIMITS.links * 2, PROJECT_LIMITS.linkLabel * 2);
  const urls = strings("linkUrl", PROJECT_LIMITS.links * 2, PROJECT_LIMITS.linkUrl * 2);
  const links = labels.map((label, index) => ({ label, url: urls[index] ?? "" }));
  // Seules les lignes vides de la fin sont retirées : les autres gardent leur rang,
  // auquel renvoient les messages d'erreur (« Lien 2 : … »).
  while (links.length > 0 && links[links.length - 1].label.trim() === "" && links[links.length - 1].url.trim() === "") {
    links.pop();
  }
  return {
    title: text("title", PROJECT_LIMITS.title * 2),
    slug: text("slug", PROJECT_LIMITS.slug * 2),
    description: text("description", PROJECT_LIMITS.description * 2),
    date: text("date", 20),
    collaborators: text("collaborators", PROJECT_LIMITS.collaboratorsText * 2),
    confirmSlugChange: formData.get("confirmSlugChange") === "1" ? "1" : "",
    technologyIds: formData
      .getAll("technologyIds")
      .filter((value): value is string => typeof value === "string")
      .slice(0, PROJECT_LIMITS.technologies),
    links,
  };
}

/** État renvoyé par les actions du formulaire (format commun du plan §3.1). */
export type ProjectFormState = {
  ok: boolean;
  message: string;
  fieldErrors: FieldErrors<ProjectField>;
  values?: ProjectFormValues;
} | null;

// ---------------------------------------------------------------------------
// Ordre, statut, suppression, collaborateurs
// ---------------------------------------------------------------------------

export const moveProjectSchema = z.object({
  id: projectIdField,
  direction: z.enum(["up", "down"], { error: PROJECT_MESSAGES.moveInvalid }),
});

/**
 * Changement de statut, envoyé uniquement par la page de confirmation :
 * `publish` est le statut demandé (« 1 » : publier, « 0 » : retirer de la
 * publication) et `confirmed` doit valoir « 1 ». Sans l'un ou l'autre, rien ne change.
 */
export const publicationSchema = z.object({
  id: projectIdField,
  publish: z.enum(["1", "0"], { error: PROJECT_MESSAGES.publicationInvalid }).transform((value) => value === "1"),
  confirmed: z.literal("1", { error: PROJECT_MESSAGES.publicationInvalid }),
});

export function publicationInputFromFormData(formData: FormData) {
  return { id: formData.get("id"), publish: formData.get("publish"), confirmed: formData.get("confirmed") };
}

export const deleteProjectSchema = z.object({ id: projectIdField });

/** « Relancer la récupération » d'un collaborateur, depuis la page d'un projet. */
export const resyncCollaboratorSchema = z.object({
  projectId: projectIdField,
  collaboratorId: z.uuid({ error: PROJECT_MESSAGES.collaboratorInvalid }),
});

/** Valeurs initiales du formulaire pour un projet enregistré. */
export function projectFormValues(project: {
  title: string;
  slug: string;
  description: string;
  date: Date | null;
  links: ProjectLinkInput[];
  technologies: { id: string }[];
  collaborators: { githubUsername: string }[];
}): ProjectFormValues {
  return {
    title: project.title,
    slug: project.slug,
    description: project.description,
    date: project.date ? formatMonthValue(project.date) : "",
    collaborators: project.collaborators.map((collaborator) => collaborator.githubUsername).join("\n"),
    confirmSlugChange: "",
    technologyIds: project.technologies.map((technology) => technology.id),
    links: project.links.map(({ label, url }) => ({ label, url })),
  };
}

export { SLUG_PATTERN };
