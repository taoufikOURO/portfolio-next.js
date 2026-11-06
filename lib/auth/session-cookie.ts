// Jeton de session et cookie signé : primitives pures (sans base de données).
//
// Volontairement SANS `import "server-only"` : `proxy.ts` l'importe (le proxy
// n'est pas un composant serveur React). Le module ne contient aucun secret :
// `SESSION_SECRET` est toujours passé en paramètre. Il ne peut pas être livré
// au navigateur (`node:crypto`).
//
// Format du cookie : `<jeton>.<signature>`
// - jeton : 32 octets aléatoires, en base64url (43 caractères) ;
// - signature : HMAC-SHA256 du jeton avec `SESSION_SECRET`, en base64url.
// En base, seul le hash SHA-256 du jeton est stocké (`sessions.token_hash`) :
// une fuite de la table ne permet pas de fabriquer un cookie valide.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "admin_session";

/** Le cookie n'est envoyé que pour l'administration. */
export const SESSION_COOKIE_PATH = "/admin";

const TOKEN_BYTES = 32;

/** Contexte inclus dans la signature : un HMAC calculé pour un autre usage ne vaut pas cookie. */
const SIGNATURE_CONTEXT = "admin-session:v1:";

// 32 octets → 43 caractères base64url ; HMAC-SHA256 (32 octets) → 43 caractères.
const COOKIE_PATTERN = /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function sign(token: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(SIGNATURE_CONTEXT + token).digest();
}

/** Valeur du cookie : `<jeton>.<signature>`. */
export function signSessionToken(token: string, secret: string): string {
  return `${token}.${sign(token, secret).toString("base64url")}`;
}

/**
 * Renvoie le jeton si le cookie est bien formé et correctement signé, sinon
 * `null`. Comparaison en temps constant. Ne dit rien de la validité de la
 * session en base : c'est le rôle de `lib/auth/session.ts`.
 */
export function readSignedSessionToken(
  value: string | undefined,
  secret: string | undefined,
): string | null {
  if (!value || !secret || !COOKIE_PATTERN.test(value)) return null;

  const [token, signature] = value.split(".");
  // Comparaison des chaînes encodées, pas des octets décodés : le dernier
  // caractère base64url porte 2 bits ignorés au décodage, et deux écritures
  // différentes de la même signature ne doivent pas être acceptées.
  const expected = Buffer.from(sign(token, secret).toString("base64url"));
  const received = Buffer.from(signature);
  if (received.length !== expected.length) return null;
  return timingSafeEqual(received, expected) ? token : null;
}

/** Hash stocké en base (SHA-256, hexadécimal). */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
