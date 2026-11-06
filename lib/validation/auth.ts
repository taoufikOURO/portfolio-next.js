// Formulaire de connexion : schéma partagé par le client (avant envoi) et par
// l'action serveur (avant tout accès à la base). Messages en français.
//
// Module pur : aucun import serveur (il est livré au navigateur avec le formulaire).

import { z } from "zod";

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

export const loginSchema = z.object({
  email: z
    .string({ error: LOGIN_MESSAGES.emailRequired })
    .transform(normalizeEmail)
    .pipe(
      z
        .string()
        .min(1, LOGIN_MESSAGES.emailRequired)
        .max(EMAIL_MAX_LENGTH, LOGIN_MESSAGES.emailTooLong)
        .pipe(z.email({ error: LOGIN_MESSAGES.emailInvalid })),
    ),
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
