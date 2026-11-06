// Hachage et vérification des mots de passe (argon2id, via @node-rs/argon2).
//
// Module pur, volontairement SANS `import "server-only"` : le seed l'exécute
// hors de Next.js (E33). Il ne peut pas pour autant fuiter vers le navigateur :
// @node-rs/argon2 est un module natif, que Next.js garde côté serveur
// (`serverExternalPackages` par défaut) et qu'aucun bundle client ne peut contenir.
// Les formulaires (étapes 7 et 8) importent la règle depuis `password-policy.ts`.
//
// Règle de sécurité : aucun message d'erreur ne contient le mot de passe ni son hash.

import { hash, verify, type Algorithm, type Options } from "@node-rs/argon2";

import { isPasswordLongEnough, PASSWORD_TOO_SHORT_MESSAGE } from "./password-policy";

export { PASSWORD_MIN_LENGTH } from "./password-policy";

// `Algorithm.Argon2id` vaut 2. L'énumération est déclarée en `const enum`
// ambiante, inutilisable avec `isolatedModules` et par Node (suppression des
// types) : la valeur est donc écrite en clair. Un test vérifie le préfixe
// `$argon2id$` du hash obtenu.
const ARGON2ID = 2 as Algorithm;

/**
 * Paramètres argon2id : recommandation minimale de l'OWASP
 * (19 Mio de mémoire, 2 passes, 1 fil). Ils sont inscrits dans chaque hash,
 * ce qui permettra de les renforcer plus tard sans invalider les anciens.
 */
export const PASSWORD_HASH_OPTIONS: Readonly<Options> = Object.freeze({
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});

export class PasswordPolicyError extends Error {
  constructor() {
    super(`Mot de passe refusé : il ${PASSWORD_TOO_SHORT_MESSAGE}`);
    this.name = "PasswordPolicyError";
  }
}

/** Lève une `PasswordPolicyError` si le mot de passe ne respecte pas la règle de longueur. */
export function assertPasswordPolicy(password: string): void {
  if (!isPasswordLongEnough(password)) throw new PasswordPolicyError();
}

/**
 * Hache un nouveau mot de passe (sel aléatoire, format PHC `$argon2id$…`).
 * Refuse un mot de passe trop court : aucun hash n'est alors calculé.
 */
export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return hash(password, PASSWORD_HASH_OPTIONS);
}

/**
 * Vérifie un mot de passe contre un hash stocké. La règle de longueur ne
 * s'applique pas ici. Un hash illisible donne `false`, jamais une exception.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
