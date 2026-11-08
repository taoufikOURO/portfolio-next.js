// Formulaires des compétences : schémas partagés par le client (avant envoi)
// et par les actions serveur (avant tout accès à la base). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec les
// formulaires).

import { z } from "zod";

/** Longueur maximale du nom affiché (points de code). */
export const SKILL_NAME_MAX_LENGTH = 80;

export const SKILL_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  nameRequired: "Saisissez le nom de la compétence.",
  nameTooLong: `Le nom ne doit pas dépasser ${SKILL_NAME_MAX_LENGTH} caractères.`,
  nameNoLetter: "Le nom doit contenir au moins une lettre ou un chiffre.",
  idInvalid: "Cette compétence n'existe pas.",
  notFound: "Cette compétence n'existe plus : elle a peut-être été supprimée entre-temps.",
  deleted: "La compétence a été supprimée.",
} as const;

export function duplicateSkillMessage(existingName: string): string {
  return `La compétence « ${existingName} » existe déjà. Les majuscules, les accents et les espaces ne comptent pas.`;
}

export function skillCreatedMessage(name: string): string {
  return `La compétence « ${name} » a été ajoutée.`;
}

export function skillRenamedMessage(name: string): string {
  return `La compétence a été renommée en « ${name} ».`;
}

export function skillDetachedMessage(count: number): string {
  if (count === 0) return SKILL_MESSAGES.deleted;
  const formations = count === 1 ? "1 formation" : `${count} formations`;
  return `La compétence a été supprimée et détachée de ${formations}.`;
}

/**
 * Suppression refusée : la compétence est rattachée à des formations qui ne
 * figuraient pas dans la confirmation (ou il n'y a pas eu de confirmation).
 */
export function skillInUseMessage(count: number): string {
  const formations = count === 1 ? "1 formation" : `${count} formations`;
  return `Cette compétence est utilisée par ${formations}. Confirmez sa suppression pour la détacher de ${count === 1 ? "cette formation" : "ces formations"}.`;
}

/**
 * Caractères de contrôle et de mise en forme invisibles (U+200B espace sans
 * chasse, U+00AD trait d'union conditionnel…) : retirés, sinon « React »
 * suivi d'un espace sans chasse échapperait à la règle d'unicité.
 */
const INVISIBLE_CHARACTERS = /[\p{Cc}\p{Cf}]/gu;

/**
 * Nom affiché : casse et accents conservés, caractères invisibles retirés,
 * espaces (y compris insécables, tabulations, retours à la ligne) rognés aux
 * extrémités et réduits à un seul entre les mots.
 */
export function cleanSkillName(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\s/g, " ")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Clé d'unicité (`skills.normalized_name`) : nom nettoyé, en minuscules, sans
 * accents (signes diacritiques retirés après décomposition) ni espaces
 * superflus. « Développement Web », « developpement  web » et « DÉVELOPPEMENT
 * WEB » donnent la même clé. La décomposition de compatibilité (NFKD) ramène
 * aussi les variantes typographiques (lettres pleine chasse, ligatures « ﬁ »).
 */
export function normalizeSkillName(value: string): string {
  return cleanSkillName(value)
    .normalize("NFKD")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function codePointLength(value: string): number {
  return [...value].length;
}

const skillNameField = z
  .string({ error: SKILL_MESSAGES.nameRequired })
  .transform(cleanSkillName)
  .pipe(
    z
      .string()
      .min(1, SKILL_MESSAGES.nameRequired)
      .refine((value) => codePointLength(value) <= SKILL_NAME_MAX_LENGTH, SKILL_MESSAGES.nameTooLong)
      .refine((value) => /[\p{L}\p{N}]/u.test(normalizeSkillName(value)), SKILL_MESSAGES.nameNoLetter),
  );

/**
 * Nom facultatif (« Nouvelle compétence » du formulaire d'une formation) :
 * champ absent ou vide (après nettoyage) → `null` ; sinon, mêmes règles
 * qu'un nom de compétence.
 */
export const optionalSkillNameField = z
  .string({ error: SKILL_MESSAGES.nameRequired })
  .nullish()
  .transform((value, context) => {
    const name = cleanSkillName(value ?? "");
    if (name === "") return null;
    if (codePointLength(name) > SKILL_NAME_MAX_LENGTH) {
      context.addIssue({ code: "custom", message: SKILL_MESSAGES.nameTooLong });
      return z.NEVER;
    }
    if (!/[\p{L}\p{N}]/u.test(normalizeSkillName(name))) {
      context.addIssue({ code: "custom", message: SKILL_MESSAGES.nameNoLetter });
      return z.NEVER;
    }
    return name;
  });

/** Doublon saisi dans « Nouvelle compétence » : rien n'est créé, la compétence existante est à cocher. */
export function duplicateNewSkillMessage(existingName: string): string {
  return `La compétence « ${existingName} » existe déjà : cochez-la dans la liste ci-dessus.`;
}

export function skillCreatedAndCheckedMessage(name: string): string {
  return `La compétence « ${name} » a été créée et cochée.`;
}

/** Identifiant d'une compétence (UUID) : vérifié avant toute requête. */
export const skillIdField = z.uuid({ error: SKILL_MESSAGES.idInvalid });

export const skillSchema = z.object({ name: skillNameField });

export const renameSkillSchema = z.object({ id: skillIdField, name: skillNameField });

/**
 * Suppression : `confirmed` vaut vrai quand l'utilisateur a confirmé ;
 * `confirmedEducationIds` liste les formations affichées dans la confirmation
 * (la suppression est refusée si la compétence est rattachée à une autre).
 */
export const deleteSkillSchema = z.object({
  id: skillIdField,
  confirmed: z.boolean(),
  confirmedEducationIds: z.array(z.uuid({ error: SKILL_MESSAGES.idInvalid })).max(500),
});

export type SkillInput = z.infer<typeof skillSchema>;
export type DeleteSkillInput = z.infer<typeof deleteSkillSchema>;

/** Valeurs du formulaire de suppression (`confirmed=1`, une valeur `educationIds` par formation). */
export function deleteSkillInputFromFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    confirmed: formData.get("confirmed") === "1",
    confirmedEducationIds: formData.getAll("educationIds"),
  };
}
