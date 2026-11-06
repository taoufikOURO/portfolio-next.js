// Règle de longueur des mots de passe (cahier des charges §3.1 : 12 caractères minimum).
//
// Module pur, séparé de `password.ts` : il pourra servir aux schémas Zod
// partagés client/serveur (étapes 7 et 8) sans embarquer `@node-rs/argon2`,
// module natif impossible à livrer au navigateur. Aussi utilisé hors de
// Next.js (seed, via `lib/env-schema.ts`).

export const PASSWORD_MIN_LENGTH = 12;

/** Fragment de message, à préfixer (« Le mot de passe… », « ADMIN_PASSWORD : … »). */
export const PASSWORD_TOO_SHORT_MESSAGE = `doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;

/**
 * Nombre de caractères perçus : les points de code, pas les unités UTF-16
 * (un emoji ou un caractère hors du plan de base compte pour un).
 */
export function passwordLength(password: string): number {
  return [...password].length;
}

export function isPasswordLongEnough(password: string): boolean {
  return passwordLength(password) >= PASSWORD_MIN_LENGTH;
}
