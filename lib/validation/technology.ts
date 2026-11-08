// Formulaires de la stack technique : schémas partagés par le client (avant
// envoi) et par les actions serveur (avant tout accès à la base). Messages en
// français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec les
// formulaires). Le type réel, la taille et le contenu de l'icône sont
// contrôlés par le serveur (`lib/storage/rules.ts`) ; ici, seule la présence
// d'un fichier est vérifiée.

import { z } from "zod";

import type { ActionState } from "./auth";
import { cleanSkillName, normalizeSkillName } from "./skill";

/** Longueur maximale du nom affiché (points de code). */
export const TECHNOLOGY_NAME_MAX_LENGTH = 80;

/**
 * Même nettoyage et même clé d'unicité que les compétences (E48) : casse,
 * accents, espaces superflus et caractères invisibles ne comptent pas.
 */
export const cleanTechnologyName = cleanSkillName;
export const normalizeTechnologyName = normalizeSkillName;

export const TECHNOLOGY_MESSAGES = {
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  nameRequired: "Saisissez le nom de la technologie.",
  nameTooLong: `Le nom ne doit pas dépasser ${TECHNOLOGY_NAME_MAX_LENGTH} caractères.`,
  nameNoLetter: "Le nom doit contenir au moins une lettre ou un chiffre.",
  iconRequired: "Choisissez une icône (PNG, WebP ou SVG).",
  iconInvalid: "Le fichier choisi n'est pas valide. Choisissez une icône (PNG, WebP ou SVG).",
  idInvalid: "Cette technologie n'existe pas.",
  notFound: "Cette technologie n'existe plus : elle a peut-être été supprimée entre-temps.",
  moveInvalid: "Déplacement impossible. Rechargez la page.",
} as const;

export function duplicateTechnologyMessage(existingName: string): string {
  return `La technologie « ${existingName} » existe déjà. Les majuscules, les accents et les espaces ne comptent pas.`;
}

/** Suppression refusée : la technologie est utilisée par des projets absents de la confirmation (ou sans confirmation). */
export function technologyInUseMessage(count: number): string {
  const projects = count === 1 ? "1 projet" : `${count} projets`;
  return `Cette technologie est utilisée par ${projects}. Confirmez sa suppression pour la détacher de ${count === 1 ? "ce projet" : "ces projets"}.`;
}

export function technologyMovedMessage(name: string, position: number, total: number): string {
  return `« ${name} » est maintenant en position ${position} sur ${total}.`;
}

export type TechnologyMoveDirection = "up" | "down";

export function technologyAtEdgeMessage(name: string, direction: TechnologyMoveDirection): string {
  return direction === "up"
    ? `« ${name} » est déjà en première position.`
    : `« ${name} » est déjà en dernière position.`;
}

function codePointLength(value: string): number {
  return [...value].length;
}

const technologyNameField = z
  .string({ error: TECHNOLOGY_MESSAGES.nameRequired })
  .transform(cleanTechnologyName)
  .pipe(
    z
      .string()
      .min(1, TECHNOLOGY_MESSAGES.nameRequired)
      .refine((value) => codePointLength(value) <= TECHNOLOGY_NAME_MAX_LENGTH, TECHNOLOGY_MESSAGES.nameTooLong)
      .refine((value) => /[\p{L}\p{N}]/u.test(normalizeTechnologyName(value)), TECHNOLOGY_MESSAGES.nameNoLetter),
  );

/** Un champ fichier laissé vide arrive comme un `File` de taille 0 (ou n'arrive pas). */
function isChosenFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

const requiredIconField = z.custom<File>(isChosenFile, { error: TECHNOLOGY_MESSAGES.iconRequired });

/** Icône facultative (modification) : aucun fichier choisi → `null`. */
const optionalIconField = z.unknown().transform((value, context): File | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof File) return value.size > 0 ? value : null;
  context.addIssue({ code: "custom", message: TECHNOLOGY_MESSAGES.iconInvalid });
  return z.NEVER;
});

/** Identifiant d'une technologie (UUID) : vérifié avant toute requête. */
export const technologyIdField = z.uuid({ error: TECHNOLOGY_MESSAGES.idInvalid });

export const createTechnologySchema = z.object({ name: technologyNameField, icon: requiredIconField });

export const updateTechnologySchema = z.object({
  id: technologyIdField,
  name: technologyNameField,
  icon: optionalIconField,
});

export const moveTechnologySchema = z.object({
  id: technologyIdField,
  direction: z.enum(["up", "down"], { error: TECHNOLOGY_MESSAGES.moveInvalid }),
});

/**
 * Suppression : `confirmed` vaut vrai quand l'utilisateur a confirmé ;
 * `confirmedProjectIds` liste les projets affichés dans la confirmation (la
 * suppression est refusée si la technologie est rattachée à un autre).
 */
export const deleteTechnologySchema = z.object({
  id: technologyIdField,
  confirmed: z.boolean(),
  confirmedProjectIds: z.array(z.uuid({ error: TECHNOLOGY_MESSAGES.idInvalid })).max(500),
});

export type CreateTechnologyInput = z.infer<typeof createTechnologySchema>;
export type UpdateTechnologyInput = z.infer<typeof updateTechnologySchema>;
export type DeleteTechnologyInput = z.infer<typeof deleteTechnologySchema>;

export type TechnologyField = "name" | "icon";

/** État d'un formulaire de technologie ; `values` : saisie à réafficher (un fichier ne peut pas l'être). */
export type TechnologyFormState = ActionState<TechnologyField>;

/** Valeurs du formulaire de suppression (`confirmed=1`, une valeur `projectIds` par projet). */
export function deleteTechnologyInputFromFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    confirmed: formData.get("confirmed") === "1",
    confirmedProjectIds: formData.getAll("projectIds"),
  };
}

/** Lecture du formulaire de création / modification, partagée par le client et l'action. */
export function technologyInputFromFormData(formData: FormData) {
  return {
    id: formData.get("id"),
    name: formData.get("name"),
    icon: formData.get("icon"),
  };
}
