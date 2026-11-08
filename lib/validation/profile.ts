// Formulaires du profil : schémas partagés par le client (avant envoi) et par
// les actions serveur (avant tout accès à la base). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec les
// formulaires). Le type réel et la taille des fichiers sont contrôlés par le
// serveur (`lib/storage/rules.ts`) ; ici, seule la présence d'un fichier est
// vérifiée.

import { z } from "zod";

import type { ActionState } from "./auth";
import { cleanSkillName } from "./skill";

export const PROFILE_LIMITS = {
  name: 80,
  jobTitle: 120,
  email: 254,
  bio: 300,
  about: 5000,
  url: 300,
  resumeUrl: 500,
} as const;

export const PROFILE_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  firstNameRequired: "Saisissez le prénom.",
  lastNameRequired: "Saisissez le nom.",
  nameTooLong: `Ce champ ne doit pas dépasser ${PROFILE_LIMITS.name} caractères.`,
  emailRequired: "Saisissez l'adresse e-mail de contact.",
  emailInvalid: "Cette adresse e-mail n'est pas valide.",
  emailTooLong: `L'adresse e-mail ne doit pas dépasser ${PROFILE_LIMITS.email} caractères.`,
  jobTitleRequired: "Saisissez le titre professionnel.",
  jobTitleTooLong: `Le titre professionnel ne doit pas dépasser ${PROFILE_LIMITS.jobTitle} caractères.`,
  bioTooLong: `La bio ne doit pas dépasser ${PROFILE_LIMITS.bio} caractères.`,
  aboutTooLong: `Le texte « À propos » ne doit pas dépasser ${PROFILE_LIMITS.about} caractères.`,
  urlTooLong: `Le lien ne doit pas dépasser ${PROFILE_LIMITS.url} caractères.`,
  githubInvalid: "Saisissez une adresse GitHub valide, par exemple https://github.com/votre-nom.",
  linkedinInvalid: "Saisissez une adresse LinkedIn valide, par exemple https://www.linkedin.com/in/votre-nom.",
  urlNotHttps: "Le lien doit commencer par https://.",
  resumeUrlTooLong: `Le lien du CV ne doit pas dépasser ${PROFILE_LIMITS.resumeUrl} caractères.`,
  resumeUrlInvalid: "Saisissez un lien valide vers votre CV, par exemple https://exemple.fr/cv.pdf.",
  resumeBoth:
    "Renseignez un lien OU un PDF, pas les deux. Videz le champ du lien pour envoyer un PDF, ou ne choisissez pas de fichier pour garder le lien.",
  resumeRemoveWithOther:
    "Pour supprimer le PDF actuel, ne renseignez ni lien ni nouveau fichier.",
  fileRequired: "Choisissez un fichier (PNG, JPG ou WebP).",
  fileInvalid: "Le fichier choisi n'est pas valide.",
  resumeFileInvalid: "Le fichier choisi n'est pas valide. Choisissez un PDF.",
  slotInvalid: "Cette image n'existe pas dans le profil. Rechargez la page.",
} as const;

// ---------------------------------------------------------------------------
// Nettoyage du texte
// ---------------------------------------------------------------------------

/** Caractères de contrôle, sauf tabulation et retour à la ligne. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Texte sur plusieurs lignes : fins de ligne normalisées, caractères de contrôle retirés, extrémités rognées. */
export function cleanMultilineText(value: string): string {
  return value.normalize("NFC").replace(/\r\n?/g, "\n").replace(CONTROL_CHARACTERS, "").trim();
}

function codePointLength(value: string): number {
  return [...value].length;
}

// ---------------------------------------------------------------------------
// Adresses
// ---------------------------------------------------------------------------

/** Commence par un schéma (`https:`, `mailto:`, `javascript:`…). */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export type NormalizedUrl = { ok: true; url: string | null } | { ok: false; reason: "invalid" | "not-https" };

/**
 * Adresse saisie → adresse enregistrée.
 * - vide → `null` (champ non renseigné) ;
 * - `https://` ajouté s'il manque (`github.com/nom`, `//github.com/nom`) ;
 * - tout autre schéma est refusé (`http://` : « doit commencer par https:// » ;
 *   `javascript:`, `mailto:`… : adresse invalide) ;
 * - identifiants (`nom:mot@hôte`), port et espaces refusés.
 */
export function normalizeProfileUrl(raw: string): NormalizedUrl {
  const value = raw.trim();
  if (value === "") return { ok: true, url: null };
  if (/\s/.test(value)) return { ok: false, reason: "invalid" };

  let candidate = value;
  if (/^https:\/\//i.test(candidate)) {
    // déjà en https
  } else if (/^http:\/\//i.test(candidate)) {
    return { ok: false, reason: "not-https" };
  } else if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (HAS_SCHEME.test(candidate) && !/^[^/?#]+:\d+(?:[/?#]|$)/.test(candidate)) {
    return { ok: false, reason: "invalid" };
  } else {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "invalid" };
  if (parsed.username !== "" || parsed.password !== "" || parsed.port !== "") return { ok: false, reason: "invalid" };
  // Un nom d'hôte public contient un point et ne se termine pas par un point.
  if (!parsed.hostname.includes(".") || parsed.hostname.endsWith(".")) return { ok: false, reason: "invalid" };
  return { ok: true, url: parsed.toString() };
}

function hostIs(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** Adresse d'un réseau : hôte attendu (domaine ou sous-domaine) et au moins un segment de chemin (le compte). */
function networkUrlField(domain: string, invalidMessage: string, maxLength: number = PROFILE_LIMITS.url) {
  return z
    .string({ error: invalidMessage })
    .transform((value, context): string | null => {
      if (codePointLength(value.trim()) > maxLength) {
        context.addIssue({ code: "custom", message: PROFILE_MESSAGES.urlTooLong });
        return z.NEVER;
      }
      const normalized = normalizeProfileUrl(value);
      if (!normalized.ok) {
        context.addIssue({
          code: "custom",
          message: normalized.reason === "not-https" ? PROFILE_MESSAGES.urlNotHttps : invalidMessage,
        });
        return z.NEVER;
      }
      if (normalized.url === null) return null;
      const parsed = new URL(normalized.url);
      const hasAccount = parsed.pathname.split("/").some((segment) => segment !== "");
      if (!hostIs(parsed.hostname, domain) || !hasAccount) {
        context.addIssue({ code: "custom", message: invalidMessage });
        return z.NEVER;
      }
      return normalized.url;
    });
}

/** Lien externe du CV : toute adresse https. */
const resumeUrlField = z
  .string({ error: PROFILE_MESSAGES.resumeUrlInvalid })
  .transform((value, context): string | null => {
    if (codePointLength(value.trim()) > PROFILE_LIMITS.resumeUrl) {
      context.addIssue({ code: "custom", message: PROFILE_MESSAGES.resumeUrlTooLong });
      return z.NEVER;
    }
    const normalized = normalizeProfileUrl(value);
    if (!normalized.ok) {
      context.addIssue({
        code: "custom",
        message: normalized.reason === "not-https" ? PROFILE_MESSAGES.urlNotHttps : PROFILE_MESSAGES.resumeUrlInvalid,
      });
      return z.NEVER;
    }
    return normalized.url;
  });

// ---------------------------------------------------------------------------
// Identité et liens
// ---------------------------------------------------------------------------

function singleLineField(required: string, tooLong: string, maxLength: number) {
  return z
    .string({ error: required })
    .transform(cleanSkillName)
    .pipe(
      z
        .string()
        .min(1, required)
        .refine((value) => codePointLength(value) <= maxLength, tooLong),
    );
}

const emailField = z
  .string({ error: PROFILE_MESSAGES.emailRequired })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, PROFILE_MESSAGES.emailRequired)
      .max(PROFILE_LIMITS.email, PROFILE_MESSAGES.emailTooLong)
      .pipe(z.email({ error: PROFILE_MESSAGES.emailInvalid })),
  );

function multilineField(tooLong: string, maxLength: number) {
  return z
    .string()
    .optional()
    .transform((value) => cleanMultilineText(value ?? ""))
    .pipe(z.string().refine((value) => codePointLength(value) <= maxLength, tooLong));
}

export const profileDetailsSchema = z.object({
  firstName: singleLineField(PROFILE_MESSAGES.firstNameRequired, PROFILE_MESSAGES.nameTooLong, PROFILE_LIMITS.name),
  lastName: singleLineField(PROFILE_MESSAGES.lastNameRequired, PROFILE_MESSAGES.nameTooLong, PROFILE_LIMITS.name),
  email: emailField,
  jobTitle: singleLineField(PROFILE_MESSAGES.jobTitleRequired, PROFILE_MESSAGES.jobTitleTooLong, PROFILE_LIMITS.jobTitle),
  bio: multilineField(PROFILE_MESSAGES.bioTooLong, PROFILE_LIMITS.bio),
  about: multilineField(PROFILE_MESSAGES.aboutTooLong, PROFILE_LIMITS.about),
  githubUrl: networkUrlField("github.com", PROFILE_MESSAGES.githubInvalid),
  linkedinUrl: networkUrlField("linkedin.com", PROFILE_MESSAGES.linkedinInvalid),
});

export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>;
export type ProfileDetailsField = keyof ProfileDetailsInput;

/** État du formulaire d'identité ; `values` : saisie à réafficher après un refus. */
export type ProfileDetailsFormState = ActionState<ProfileDetailsField>;

const DETAILS_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "bio",
  "about",
  "githubUrl",
  "linkedinUrl",
] as const satisfies readonly ProfileDetailsField[];

/** Lecture du formulaire d'identité, partagée par le client et l'action. */
export function profileDetailsFromFormData(formData: FormData) {
  return Object.fromEntries(DETAILS_FIELDS.map((name) => [name, formData.get(name) ?? undefined]));
}

/** Saisie à réafficher après un refus (React vide le formulaire après l'action). */
export function profileDetailsValues(formData: FormData): Partial<Record<ProfileDetailsField, string>> {
  const values: Partial<Record<ProfileDetailsField, string>> = {};
  for (const name of DETAILS_FIELDS) {
    const raw = formData.get(name);
    values[name] = typeof raw === "string" ? raw.slice(0, PROFILE_LIMITS.about + 500) : "";
  }
  return values;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Emplacements d'image du profil : photo et photo détourée (fond transparent). */
export const PHOTO_SLOTS = ["photo", "cutout"] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

/** Un champ fichier laissé vide arrive comme un `File` de taille 0 (ou n'arrive pas). */
function isChosenFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

export const photoSchema = z.object({
  slot: z.enum(PHOTO_SLOTS, { error: PROFILE_MESSAGES.slotInvalid }),
  file: z.custom<File>(isChosenFile, { error: PROFILE_MESSAGES.fileRequired }),
});

export type PhotoInput = z.infer<typeof photoSchema>;
export type PhotoField = "file";
export type PhotoFormState = ActionState<PhotoField>;

export function photoInputFromFormData(formData: FormData) {
  return { slot: formData.get("slot"), file: formData.get("file") };
}

// ---------------------------------------------------------------------------
// CV : un lien externe OU un PDF, jamais les deux
// ---------------------------------------------------------------------------

/** Fichier facultatif : aucun fichier choisi → `null`. */
const optionalFileField = z.unknown().transform((value, context): File | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof File) return value.size > 0 ? value : null;
  context.addIssue({ code: "custom", message: PROFILE_MESSAGES.resumeFileInvalid });
  return z.NEVER;
});

export const resumeSchema = z
  .object({
    resumeUrl: z.preprocess((value) => value ?? "", resumeUrlField),
    resumeFile: optionalFileField,
    removePdf: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.resumeUrl !== null && value.resumeFile !== null) {
      context.addIssue({ code: "custom", path: ["resumeFile"], message: PROFILE_MESSAGES.resumeBoth });
    } else if (value.removePdf && (value.resumeUrl !== null || value.resumeFile !== null)) {
      context.addIssue({ code: "custom", path: ["removePdf"], message: PROFILE_MESSAGES.resumeRemoveWithOther });
    }
  });

export type ResumeInput = z.infer<typeof resumeSchema>;
export type ResumeField = "resumeUrl" | "resumeFile" | "removePdf";
export type ResumeFormState = ActionState<ResumeField>;

export function resumeInputFromFormData(formData: FormData) {
  return {
    resumeUrl: formData.get("resumeUrl") ?? "",
    resumeFile: formData.get("resumeFile"),
    removePdf: formData.get("removePdf") === "1",
  };
}

/** CV actuellement enregistré (au plus un des deux). */
export type CurrentResume = { resumeUrl: string | null; resumePath: string | null };

/** Ce que l'enregistrement doit faire du CV. */
export type ResumeChange =
  | { kind: "keep" }
  | { kind: "link"; url: string }
  | { kind: "pdf"; file: File }
  | { kind: "clear" };

/**
 * Décision pure, à partir de la saisie validée (jamais lien ET fichier) :
 * - un fichier remplace tout (lien effacé, ancien PDF remplacé) ;
 * - un lien remplace tout (ancien PDF supprimé) ;
 * - « supprimer le PDF » vide le CV ;
 * - rien de renseigné : le champ du lien est prérempli avec le lien actuel, donc
 *   un champ vidé efface le lien ; un PDF enregistré est conservé.
 */
export function decideResumeChange(input: ResumeInput, current: CurrentResume): ResumeChange {
  if (input.resumeFile) return { kind: "pdf", file: input.resumeFile };
  if (input.resumeUrl) return { kind: "link", url: input.resumeUrl };
  if (input.removePdf) return { kind: "clear" };
  if (current.resumeUrl && !current.resumePath) return { kind: "clear" };
  return { kind: "keep" };
}
