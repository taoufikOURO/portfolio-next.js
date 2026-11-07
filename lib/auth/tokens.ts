import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { AuthTokenType, Prisma } from "@/generated/prisma/client";
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_HOURS } from "@/lib/mail/templates";
import { isWellFormedAuthToken } from "@/lib/validation/auth";

/**
 * Jetons des liens envoyés par e-mail (modèle `AuthToken`) : validation
 * d'adresse (24 heures) et réinitialisation du mot de passe (1 heure).
 *
 * - Le jeton en clair (32 octets aléatoires, base64url) n'existe que dans le
 *   lien : seul son hash SHA-256 est en base. Un jeton modifié, même d'un seul
 *   caractère, donne un autre hash : il n'est pas trouvé.
 * - Usage unique : la consommation pose `usedAt` par une mise à jour
 *   conditionnelle (`usedAt` nul et échéance future). Deux clics simultanés ne
 *   peuvent pas réussir tous les deux.
 * - Un nouveau lien remplace les précédents encore inutilisés de la même nature
 *   (ils sont supprimés) : seul le dernier e-mail reçu fonctionne.
 * - Les jetons expirés depuis plus de 7 jours sont purgés à chaque émission.
 *
 * Nature d'un jeton de validation (E47) : `targetEmail` égal à l'adresse du
 * compte, c'est la validation de l'adresse actuelle ; différent, c'est un
 * changement d'adresse. Quand l'adresse change, tous les autres jetons du
 * compte sont supprimés dans la même transaction (`lib/auth/account.ts`).
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const AUTH_TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS,
  PASSWORD_RESET: PASSWORD_RESET_TTL_HOURS * HOUR_MS,
};

/** Délai minimal entre deux envois du même lien (« Renvoyer », « Mot de passe oublié »). */
export const AUTH_TOKEN_RESEND_COOLDOWN_MS = MINUTE_MS;

/** Un jeton expiré reste quelques jours en base, pour afficher « lien expiré » plutôt que « invalide ». */
export const AUTH_TOKEN_RETENTION_MS = 7 * 24 * HOUR_MS;

const TOKEN_BYTES = 32;

export type AuthTokenClient = Pick<Prisma.TransactionClient, "authToken">;

export function generateAuthToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Hash stocké en base (SHA-256, hexadécimal). */
export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ValidAuthToken = {
  id: string;
  adminId: string;
  type: AuthTokenType;
  targetEmail: string | null;
  expiresAt: Date;
};

export type AuthTokenFailure = "invalid" | "expired" | "used";

export type AuthTokenCheck =
  | { status: "valid"; token: ValidAuthToken }
  | { status: AuthTokenFailure };

/** Supprime les jetons expirés depuis plus de 7 jours. */
export async function purgeOldAuthTokens(client: AuthTokenClient, now: Date): Promise<number> {
  const { count } = await client.authToken.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - AUTH_TOKEN_RETENTION_MS) } },
  });
  return count;
}

/**
 * Crée un jeton et renvoie sa valeur en clair (à mettre dans le lien, jamais
 * en base ni dans un journal). `supersede` : jetons inutilisés du même compte
 * et du même type à supprimer (remplacés par celui-ci).
 */
export async function issueAuthToken(
  client: AuthTokenClient,
  input: {
    adminId: string;
    type: AuthTokenType;
    targetEmail: string;
    supersede?: Prisma.AuthTokenWhereInput;
  },
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  await purgeOldAuthTokens(client, now);
  await client.authToken.deleteMany({
    where: { ...input.supersede, adminId: input.adminId, type: input.type, usedAt: null },
  });

  const token = generateAuthToken();
  const expiresAt = new Date(now.getTime() + AUTH_TOKEN_TTL_MS[input.type]);
  await client.authToken.create({
    data: {
      adminId: input.adminId,
      type: input.type,
      tokenHash: hashAuthToken(token),
      targetEmail: input.targetEmail,
      createdAt: now,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

/** Vrai si un jeton de cette nature a été émis il y a moins d'une minute. */
export async function issuedRecently(
  client: AuthTokenClient,
  where: { adminId: string; type: AuthTokenType } & Prisma.AuthTokenWhereInput,
  now: Date,
): Promise<boolean> {
  const recent = await client.authToken.findFirst({
    where: {
      ...where,
      usedAt: null,
      createdAt: { gt: new Date(now.getTime() - AUTH_TOKEN_RESEND_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  return recent !== null;
}

/**
 * Lit un jeton sans le consommer (affichage de la page du lien). Un jeton
 * mal formé est refusé sans requête en base.
 */
export async function inspectAuthToken(
  client: AuthTokenClient,
  rawToken: unknown,
  type: AuthTokenType,
  now: Date,
): Promise<AuthTokenCheck> {
  if (!isWellFormedAuthToken(rawToken)) return { status: "invalid" };

  const row = await client.authToken.findUnique({
    where: { tokenHash: hashAuthToken(rawToken) },
    select: {
      id: true,
      adminId: true,
      type: true,
      targetEmail: true,
      expiresAt: true,
      usedAt: true,
    },
  });
  // Un jeton d'un autre type ne vaut rien ici (et on ne dit pas qu'il existe).
  if (!row || row.type !== type) return { status: "invalid" };
  if (row.usedAt) return { status: "used" };
  if (row.expiresAt <= now) return { status: "expired" };

  return {
    status: "valid",
    token: {
      id: row.id,
      adminId: row.adminId,
      type: row.type,
      targetEmail: row.targetEmail,
      expiresAt: row.expiresAt,
    },
  };
}

/**
 * Consomme un jeton : il ne pourra plus servir. À appeler dans la transaction
 * qui applique son effet (si l'effet échoue, le jeton reste utilisable).
 * La mise à jour conditionnelle garantit l'usage unique même en cas de
 * requêtes simultanées.
 */
export async function consumeAuthToken(
  client: AuthTokenClient,
  rawToken: unknown,
  type: AuthTokenType,
  now: Date,
): Promise<AuthTokenCheck> {
  const check = await inspectAuthToken(client, rawToken, type, now);
  if (check.status !== "valid") return check;

  const { count } = await client.authToken.updateMany({
    where: { id: check.token.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return count === 1 ? check : { status: "used" };
}
