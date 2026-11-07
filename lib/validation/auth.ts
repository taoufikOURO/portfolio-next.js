// Formulaires de l'authentification (connexion, mot de passe oublié,
// réinitialisation, validation d'adresse, page « Compte ») : schémas partagés
// par le client (avant envoi) et par les actions serveur (avant tout accès à
// la base). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec les
// formulaires). `password-policy.ts` et `mail/templates.ts` sont purs eux aussi.

import { z } from "zod";

import { isPasswordLongEnough, PASSWORD_TOO_SHORT_MESSAGE } from "../auth/password-policy";
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_HOURS } from "../mail/templates";

/** Longueur maximale d'une adresse e-mail (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Plafond de saisie du mot de passe à la connexion, pour ne pas hacher des
 * mégaoctets. La règle des 12 caractères (`password-policy.ts`) ne s'applique
 * qu'aux nouveaux mots de passe, pas à la connexion.
 */
export const LOGIN_PASSWORD_MAX_LENGTH = 1024;

export const LOGIN_MESSAGES = {
  emailRequired: "Saisissez votre adresse e-mail.",
  emailInvalid: "Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.",
  emailTooLong: `L'adresse e-mail ne doit pas dépasser ${EMAIL_MAX_LENGTH} caractères.`,
  passwordRequired: "Saisissez votre mot de passe.",
  passwordTooLong: `Le mot de passe ne doit pas dépasser ${LOGIN_PASSWORD_MAX_LENGTH} caractères.`,
  formInvalid: "Le formulaire contient des erreurs. Corrigez les champs indiqués.",
  /** Message neutre : identique que l'adresse existe ou non. */
  invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
  unexpected: "La connexion a échoué. Réessayez dans quelques instants.",
} as const;

/** Message de blocage : il ne dépend que du temps restant, jamais de l'existence du compte. */
export function lockedMessage(minutes: number): string {
  const unit = minutes > 1 ? "minutes" : "minute";
  return `Trop de tentatives de connexion. Réessayez dans ${minutes} ${unit}.`;
}

/**
 * Normalisation de l'adresse, identique à celle du seed (E34) : sans espaces
 * autour, en minuscules.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Adresse e-mail saisie : rognée, en minuscules, 254 caractères au plus. */
function emailField(requiredMessage: string = LOGIN_MESSAGES.emailRequired) {
  return z
    .string({ error: requiredMessage })
    .transform(normalizeEmail)
    .pipe(
      z
        .string()
        .min(1, requiredMessage)
        .max(EMAIL_MAX_LENGTH, LOGIN_MESSAGES.emailTooLong)
        .pipe(z.email({ error: LOGIN_MESSAGES.emailInvalid })),
    );
}

export const loginSchema = z.object({
  email: emailField(),
  // Jamais rogné : les espaces font partie du mot de passe.
  password: z
    .string({ error: LOGIN_MESSAGES.passwordRequired })
    .min(1, LOGIN_MESSAGES.passwordRequired)
    .max(LOGIN_PASSWORD_MAX_LENGTH, LOGIN_MESSAGES.passwordTooLong),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>;

/** Premier message d'erreur de chaque champ. */
export function loginFieldErrors(error: z.ZodError): LoginFieldErrors {
  const { fieldErrors } = z.flattenError(error) as {
    fieldErrors: Partial<Record<keyof LoginInput, string[]>>;
  };
  return {
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
  };
}

/**
 * État renvoyé par l'action de connexion (format commun du plan §3.1). En cas
 * de succès, l'action redirige : seul l'échec est renvoyé. L'adresse saisie
 * est renvoyée pour réafficher le champ ; le mot de passe, jamais.
 */
export type LoginFormState = {
  ok: false;
  message: string;
  fieldErrors: LoginFieldErrors;
  values: { email: string };
} | null;

// ---------------------------------------------------------------------------
// Étape 8 : liens par e-mail, mot de passe oublié, page « Compte »
// ---------------------------------------------------------------------------

/**
 * Jeton d'un lien (validation d'adresse, réinitialisation) : 32 octets
 * aléatoires en base64url, soit 43 caractères. Toute autre forme est refusée
 * avant d'interroger la base.
 */
export const AUTH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedAuthToken(value: unknown): value is string {
  return typeof value === "string" && AUTH_TOKEN_PATTERN.test(value);
}

export const ACCOUNT_MESSAGES = {
  formInvalid: LOGIN_MESSAGES.formInvalid,
  unexpected: "L'opération a échoué. Réessayez dans quelques instants.",
  mailFailed: "L'e-mail n'a pas pu être envoyé. Réessayez dans quelques instants.",

  // Liens
  tokenInvalid:
    "Ce lien n'est pas valide. Vérifiez qu'il a été copié en entier, ou demandez-en un nouveau.",
  tokenExpired: "Ce lien a expiré. Demandez-en un nouveau.",
  tokenUsed: "Ce lien a déjà été utilisé. Demandez-en un nouveau si nécessaire.",

  // Mot de passe oublié : message identique que l'adresse existe ou non.
  resetRequested: `Si cette adresse est celle du compte d'administration, un lien de réinitialisation vient d'y être envoyé. Il est valable ${PASSWORD_RESET_TTL_HOURS} heure.`,

  // Mots de passe
  currentPasswordRequired: "Saisissez votre mot de passe actuel.",
  currentPasswordWrong: "Le mot de passe actuel est incorrect.",
  newPasswordRequired: "Saisissez le nouveau mot de passe.",
  newPasswordTooShort: `Le mot de passe ${PASSWORD_TOO_SHORT_MESSAGE}`,
  newPasswordTooLong: `Le mot de passe ne doit pas dépasser ${LOGIN_PASSWORD_MAX_LENGTH} caractères.`,
  newPasswordSameAsCurrent: "Le nouveau mot de passe doit être différent du mot de passe actuel.",
  confirmationRequired: "Saisissez une seconde fois le nouveau mot de passe.",
  confirmationMismatch: "Les deux mots de passe saisis ne sont pas identiques.",
  passwordReset:
    "Votre mot de passe a été modifié et toutes les sessions ont été fermées. Connectez-vous avec le nouveau mot de passe.",
  passwordChanged:
    "Votre mot de passe a été modifié. Les autres sessions ont été fermées ; celle-ci reste ouverte.",

  // Adresse e-mail
  newEmailRequired: "Saisissez la nouvelle adresse e-mail.",
  newEmailSameAsCurrent: "Cette adresse est déjà celle du compte.",
  newEmailUnavailable: "Cette adresse ne peut pas être utilisée.",
  emailVerified: "Votre adresse e-mail est validée.",
  emailChanged: "La nouvelle adresse est désormais celle du compte. Elle est validée.",
  verificationSent: `Un nouveau lien de validation a été envoyé. Il est valable ${EMAIL_VERIFICATION_TTL_HOURS} heures.`,
  verificationCooldown:
    "Un lien vient d'être envoyé. Patientez une minute avant d'en demander un autre.",
  alreadyVerified: "Votre adresse e-mail est déjà validée.",

  // Sessions
  noOtherSession: "Aucune autre session n'est ouverte.",
} as const;

export function emailChangeRequestedMessage(email: string): string {
  return `Un lien de validation a été envoyé à ${email}. L'adresse du compte ne changera qu'après un clic sur ce lien (valable ${EMAIL_VERIFICATION_TTL_HOURS} heures). L'adresse actuelle a reçu une notification.`;
}

export function otherSessionsRevokedMessage(count: number): string {
  if (count === 0) return ACCOUNT_MESSAGES.noOtherSession;
  return count === 1 ? "1 autre session a été fermée." : `${count} autres sessions ont été fermées.`;
}

/** Blocage après trop de mots de passe incorrects (même compteur que la connexion, E47). */
export function passwordLockedMessage(minutes: number): string {
  const unit = minutes > 1 ? "minutes" : "minute";
  return `Trop de tentatives avec un mot de passe incorrect. Réessayez dans ${minutes} ${unit}.`;
}

/** Mot de passe actuel : comme à la connexion (jamais rogné, pas de règle de longueur). */
const currentPasswordField = z
  .string({ error: ACCOUNT_MESSAGES.currentPasswordRequired })
  .min(1, ACCOUNT_MESSAGES.currentPasswordRequired)
  .max(LOGIN_PASSWORD_MAX_LENGTH, LOGIN_MESSAGES.passwordTooLong);

/** Nouveau mot de passe : 12 caractères au moins (points de code), jamais rogné. */
const newPasswordField = z
  .string({ error: ACCOUNT_MESSAGES.newPasswordRequired })
  .min(1, ACCOUNT_MESSAGES.newPasswordRequired)
  .max(LOGIN_PASSWORD_MAX_LENGTH, ACCOUNT_MESSAGES.newPasswordTooLong)
  .refine(isPasswordLongEnough, ACCOUNT_MESSAGES.newPasswordTooShort);

const confirmationField = z
  .string({ error: ACCOUNT_MESSAGES.confirmationRequired })
  .min(1, ACCOUNT_MESSAGES.confirmationRequired);

const tokenField = z
  .string({ error: ACCOUNT_MESSAGES.tokenInvalid })
  .regex(AUTH_TOKEN_PATTERN, ACCOUNT_MESSAGES.tokenInvalid);

export const forgotPasswordSchema = z.object({ email: emailField() });

export const resetPasswordSchema = z
  .object({
    token: tokenField,
    newPassword: newPasswordField,
    confirmation: confirmationField,
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: ACCOUNT_MESSAGES.confirmationMismatch,
    path: ["confirmation"],
  });

export const verifyEmailSchema = z.object({ token: tokenField });

export const changePasswordSchema = z
  .object({
    currentPassword: currentPasswordField,
    newPassword: newPasswordField,
    confirmation: confirmationField,
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: ACCOUNT_MESSAGES.confirmationMismatch,
    path: ["confirmation"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: ACCOUNT_MESSAGES.newPasswordSameAsCurrent,
    path: ["newPassword"],
  });

/** Changer d'adresse exige aussi le mot de passe actuel (proposition appliquée, E47). */
export const changeEmailSchema = z.object({
  newEmail: emailField(ACCOUNT_MESSAGES.newEmailRequired),
  currentPassword: currentPasswordField,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/** Premier message d'erreur de chaque champ (tous schémas). */
export function firstFieldErrors<F extends string>(error: z.ZodError): FieldErrors<F> {
  const { fieldErrors } = z.flattenError(error) as {
    fieldErrors: Record<string, string[] | undefined>;
  };
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[field] = messages[0];
  }
  return result as FieldErrors<F>;
}

/**
 * État renvoyé par les actions de l'étape 8 (format commun du plan §3.1).
 * `values` : saisies à réafficher (jamais un mot de passe).
 */
export type ActionState<F extends string = string> = {
  ok: boolean;
  message: string;
  fieldErrors: FieldErrors<F>;
  values?: Partial<Record<F, string>>;
} | null;
