// Formulaire des formations : schéma partagé par le client (avant envoi) et
// par les actions serveur (avant tout accès à la base). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec le
// formulaire).

import { z } from "zod";

import type { FieldErrors } from "./auth";
import { optionalSkillNameField, SKILL_NAME_MAX_LENGTH } from "./skill";

export const EDUCATION_LIMITS = {
  title: 200,
  institution: 200,
  location: 200,
  honors: 100,
  description: 5000,
  /** Garde-fou : nombre de compétences cochées dans un seul envoi. */
  skills: 200,
  minYear: 1900,
  maxYear: 2100,
} as const;

export const EDUCATION_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  titleRequired: "Saisissez l'intitulé de la formation.",
  titleTooLong: `L'intitulé ne doit pas dépasser ${EDUCATION_LIMITS.title} caractères.`,
  institutionRequired: "Saisissez l'établissement.",
  institutionTooLong: `L'établissement ne doit pas dépasser ${EDUCATION_LIMITS.institution} caractères.`,
  locationRequired: "Saisissez le lieu.",
  locationTooLong: `Le lieu ne doit pas dépasser ${EDUCATION_LIMITS.location} caractères.`,
  descriptionRequired: "Saisissez une description.",
  descriptionTooLong: `La description ne doit pas dépasser ${EDUCATION_LIMITS.description} caractères.`,
  honorsTooLong: `La mention ne doit pas dépasser ${EDUCATION_LIMITS.honors} caractères.`,
  startRequired: "Saisissez la date de début (mois et année).",
  startInvalid: `Saisissez une date de début valide au format AAAA-MM (par exemple 2021-09), entre ${EDUCATION_LIMITS.minYear} et ${EDUCATION_LIMITS.maxYear}.`,
  endInvalid: `Saisissez une date de fin valide au format AAAA-MM (par exemple 2024-06), entre ${EDUCATION_LIMITS.minYear} et ${EDUCATION_LIMITS.maxYear}, ou laissez le champ vide.`,
  endBeforeStart: "La date de fin ne peut pas être antérieure à la date de début.",
  gradeInvalid:
    "Saisissez une moyenne entre 0 et 20, avec au plus deux décimales (par exemple 14,5), ou laissez le champ vide.",
  skillsInvalid: "La sélection des compétences n'est pas valide. Rechargez la page.",
  skillsMissing:
    "Une des compétences cochées n'existe plus (supprimée entre-temps). Vérifiez la sélection.",
  idInvalid: "Cette formation n'existe pas.",
  notFound: "Cette formation n'existe plus : elle a peut-être été supprimée entre-temps.",
  moveInvalid: "Déplacement impossible. Rechargez la page.",
} as const;

// ---------------------------------------------------------------------------
// Mois (`<input type="month">`) : « AAAA-MM », stocké au 1er du mois en UTC
// ---------------------------------------------------------------------------

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** « 2024-09 » → 1er septembre 2024 à 00:00 UTC ; `null` si la valeur n'est pas un mois valide. */
export function parseMonth(value: string): Date | null {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < EDUCATION_LIMITS.minYear || year > EDUCATION_LIMITS.maxYear) return null;
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Date stockée → « AAAA-MM » (valeur du champ `type="month"`), lue en UTC. */
export function formatMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Moyenne sur 20 (`Decimal(4,2)`)
// ---------------------------------------------------------------------------

const GRADE_PATTERN = /^\d{1,2}(?:[.,]\d{1,2})?$/;

/**
 * « 14,5 », « 14.50 », « 20 » → chaîne décimale normalisée (« 14.5 », « 20 »),
 * transmise telle quelle à Prisma (pas de nombre à virgule flottante) ;
 * `null` si la valeur n'est pas une moyenne valide (0 à 20, deux décimales au plus).
 */
export function parseGrade(value: string): string | null {
  const compact = value.replace(/\s/g, "");
  if (!GRADE_PATTERN.test(compact)) return null;
  const [integer, fraction = ""] = compact.replace(",", ".").split(".");
  const whole = Number(integer);
  const decimals = fraction.replace(/0+$/, "");
  if (whole > 20 || (whole === 20 && decimals !== "")) return null;
  return decimals ? `${whole}.${decimals}` : String(whole);
}

/** Moyenne stockée (« 14.5 ») → affichage et valeur du champ (« 14,5 »). */
export function formatGrade(grade: string): string {
  return grade.replace(".", ",");
}

// ---------------------------------------------------------------------------
// Schéma
// ---------------------------------------------------------------------------

/** Texte obligatoire : rogné aux extrémités, non vide, longueur maximale. */
function requiredText(max: number, requiredMessage: string, tooLongMessage: string) {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .max(max, tooLongMessage);
}

/** Texte facultatif : champ absent ou vide → `null`. */
function optionalText(max: number, tooLongMessage: string) {
  return z
    .string({ error: tooLongMessage })
    .nullish()
    .transform((value) => value?.trim() ?? "")
    .pipe(z.string().max(max, tooLongMessage))
    .transform((value) => (value === "" ? null : value));
}

const startDateField = z
  .string({ error: EDUCATION_MESSAGES.startRequired })
  .trim()
  .min(1, EDUCATION_MESSAGES.startRequired)
  .transform((value, context) => {
    const date = parseMonth(value);
    if (!date) {
      context.addIssue({ code: "custom", message: EDUCATION_MESSAGES.startInvalid });
      return z.NEVER;
    }
    return date;
  });

const endDateField = z
  .string({ error: EDUCATION_MESSAGES.endInvalid })
  .nullish()
  .transform((value, context) => {
    const trimmed = value?.trim() ?? "";
    if (trimmed === "") return null;
    const date = parseMonth(trimmed);
    if (!date) {
      context.addIssue({ code: "custom", message: EDUCATION_MESSAGES.endInvalid });
      return z.NEVER;
    }
    return date;
  });

const gradeField = z
  .string({ error: EDUCATION_MESSAGES.gradeInvalid })
  .nullish()
  .transform((value, context) => {
    const trimmed = value?.trim() ?? "";
    if (trimmed === "") return null;
    const grade = parseGrade(trimmed);
    if (grade === null) {
      context.addIssue({ code: "custom", message: EDUCATION_MESSAGES.gradeInvalid });
      return z.NEVER;
    }
    return grade;
  });

const skillIdsField = z
  .array(z.uuid({ error: EDUCATION_MESSAGES.skillsInvalid }), { error: EDUCATION_MESSAGES.skillsInvalid })
  .max(EDUCATION_LIMITS.skills, EDUCATION_MESSAGES.skillsInvalid)
  .transform((ids) => [...new Set(ids)]);

export const educationSchema = z
  .object({
    title: requiredText(EDUCATION_LIMITS.title, EDUCATION_MESSAGES.titleRequired, EDUCATION_MESSAGES.titleTooLong),
    institution: requiredText(
      EDUCATION_LIMITS.institution,
      EDUCATION_MESSAGES.institutionRequired,
      EDUCATION_MESSAGES.institutionTooLong,
    ),
    location: requiredText(
      EDUCATION_LIMITS.location,
      EDUCATION_MESSAGES.locationRequired,
      EDUCATION_MESSAGES.locationTooLong,
    ),
    startDate: startDateField,
    endDate: endDateField,
    honors: optionalText(EDUCATION_LIMITS.honors, EDUCATION_MESSAGES.honorsTooLong),
    grade: gradeField,
    description: requiredText(
      EDUCATION_LIMITS.description,
      EDUCATION_MESSAGES.descriptionRequired,
      EDUCATION_MESSAGES.descriptionTooLong,
    ),
    skillIds: skillIdsField,
    // Compétence à créer à l'enregistrement (puis cochée) ; `null` si le champ est vide.
    newSkill: optionalSkillNameField,
  })
  .refine((value) => value.endDate === null || value.endDate >= value.startDate, {
    message: EDUCATION_MESSAGES.endBeforeStart,
    path: ["endDate"],
    // Contrôlé dès que les deux dates sont valides, même si un autre champ est
    // en erreur : toutes les erreurs s'affichent en une fois.
    when: (payload) =>
      !payload.issues.some((issue) => issue.path?.[0] === "startDate" || issue.path?.[0] === "endDate"),
  });

export type EducationInput = z.infer<typeof educationSchema>;

/** Champs du formulaire, dans l'ordre d'affichage. */
export const EDUCATION_FIELDS = [
  "title",
  "institution",
  "location",
  "startDate",
  "endDate",
  "honors",
  "grade",
  "description",
  "skillIds",
  "newSkill",
] as const;

export type EducationField = (typeof EDUCATION_FIELDS)[number];

/**
 * Lecture du formulaire, identique côté client et côté serveur : une valeur
 * par champ, et toutes les cases cochées pour `skillIds`.
 */
export function educationInputFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    institution: formData.get("institution"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    honors: formData.get("honors"),
    grade: formData.get("grade"),
    description: formData.get("description"),
    skillIds: formData.getAll("skillIds"),
    newSkill: formData.get("newSkill"),
  };
}

/** Saisies à réafficher après un refus (React vide le formulaire après l'action). */
export type EducationFormValues = {
  [K in Exclude<EducationField, "skillIds">]: string;
} & { skillIds: string[] };

export function educationValuesFromFormData(formData: FormData): EducationFormValues {
  const text = (name: string, max: number) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.slice(0, max) : "";
  };
  return {
    title: text("title", EDUCATION_LIMITS.title * 2),
    institution: text("institution", EDUCATION_LIMITS.institution * 2),
    location: text("location", EDUCATION_LIMITS.location * 2),
    startDate: text("startDate", 20),
    endDate: text("endDate", 20),
    honors: text("honors", EDUCATION_LIMITS.honors * 2),
    grade: text("grade", 20),
    newSkill: text("newSkill", SKILL_NAME_MAX_LENGTH * 4),
    description: text("description", EDUCATION_LIMITS.description * 2),
    skillIds: formData
      .getAll("skillIds")
      .filter((value): value is string => typeof value === "string")
      .slice(0, EDUCATION_LIMITS.skills),
  };
}

/** État renvoyé par les actions du formulaire (format commun du plan §3.1). */
export type EducationFormState = {
  ok: boolean;
  message: string;
  fieldErrors: FieldErrors<EducationField>;
  values?: EducationFormValues;
} | null;

// ---------------------------------------------------------------------------
// Ordre d'affichage et suppression
// ---------------------------------------------------------------------------

export const educationIdField = z.uuid({ error: EDUCATION_MESSAGES.idInvalid });

export const moveEducationSchema = z.object({
  id: educationIdField,
  direction: z.enum(["up", "down"], { error: EDUCATION_MESSAGES.moveInvalid }),
});

export type MoveDirection = z.infer<typeof moveEducationSchema>["direction"];

export const deleteEducationSchema = z.object({ id: educationIdField });

export function movedMessage(title: string, position: number, total: number): string {
  return `« ${title} » est maintenant en position ${position} sur ${total}.`;
}

export function alreadyAtEdgeMessage(title: string, direction: MoveDirection): string {
  return direction === "up"
    ? `« ${title} » est déjà en première position.`
    : `« ${title} » est déjà en dernière position.`;
}
