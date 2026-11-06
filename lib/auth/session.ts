import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

import {
  generateSessionToken,
  hashSessionToken,
  readSignedSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  signSessionToken,
} from "./session-cookie";

/**
 * Sessions de l'administration, stockées en base (modèle `Session`).
 *
 * - Le cookie contient un jeton aléatoire signé avec `SESSION_SECRET`
 *   (`session-cookie.ts`) ; seul le hash SHA-256 du jeton est en base.
 * - Durée : 7 jours glissants (chaque visite repousse l'échéance), 30 jours au
 *   maximum depuis la connexion, quelle que soit l'activité.
 * - L'échéance glissante est tenue en base (`expiresAt`). Le cookie, lui, vit
 *   jusqu'à la limite absolue de 30 jours : un composant serveur ne peut pas
 *   réécrire un cookie, et la base reste seule juge de la validité (E43).
 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const SESSION_IDLE_TIMEOUT_MS = 7 * DAY_MS;
export const SESSION_MAX_LIFETIME_MS = 30 * DAY_MS;

/**
 * L'échéance glissante n'est réécrite en base qu'après cet intervalle :
 * une page rendue plusieurs fois par minute ne provoque pas autant d'écritures.
 */
export const SESSION_TOUCH_INTERVAL_MS = 5 * MINUTE_MS;

const IP_ADDRESS_MAX_LENGTH = 64;
const USER_AGENT_MAX_LENGTH = 512;

export { SESSION_COOKIE_NAME, SESSION_COOKIE_PATH };

export type SessionMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Session valide, telle que la voient les layouts, pages et actions. */
export type AuthSession = {
  id: string;
  adminId: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
};

/** Options du cookie (cahier §3.1). `Secure` seulement en production : le développement tourne en http. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "strict" as const,
    path: SESSION_COOKIE_PATH,
    maxAge: Math.floor(SESSION_MAX_LIFETIME_MS / 1000),
  };
}

/** Options pour effacer le cookie (même chemin, sinon le navigateur le garde). */
export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.slice(0, maxLength);
}

function absoluteEnd(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_MAX_LIFETIME_MS);
}

/** Échéance glissante, plafonnée par la limite absolue. */
function slidingExpiry(now: Date, createdAt: Date): Date {
  const idle = now.getTime() + SESSION_IDLE_TIMEOUT_MS;
  return new Date(Math.min(idle, absoluteEnd(createdAt).getTime()));
}

/** Supprime les sessions expirées (échéance glissante ou limite absolue dépassée). */
export async function purgeExpiredSessions(now = new Date()): Promise<number> {
  const { count } = await db.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { createdAt: { lte: new Date(now.getTime() - SESSION_MAX_LIFETIME_MS) } },
      ],
    },
  });
  return count;
}

/**
 * Ouvre une session pour l'administrateur et renvoie la valeur du cookie.
 * Le jeton en clair n'existe que dans cette valeur : il n'est ni stocké ni journalisé.
 */
export async function createSession(
  adminId: string,
  metadata: SessionMetadata = {},
): Promise<{ cookieValue: string; session: AuthSession }> {
  const now = new Date();
  await purgeExpiredSessions(now);

  const token = generateSessionToken();
  const created = await db.session.create({
    data: {
      adminId,
      tokenHash: hashSessionToken(token),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: slidingExpiry(now, now),
      ipAddress: truncate(metadata.ipAddress, IP_ADDRESS_MAX_LENGTH),
      userAgent: truncate(metadata.userAgent, USER_AGENT_MAX_LENGTH),
    },
    select: {
      id: true,
      adminId: true,
      createdAt: true,
      expiresAt: true,
      admin: { select: { email: true, emailVerifiedAt: true } },
    },
  });

  return {
    cookieValue: signSessionToken(token, env.SESSION_SECRET),
    session: {
      id: created.id,
      adminId: created.adminId,
      email: created.admin.email,
      emailVerifiedAt: created.admin.emailVerifiedAt,
      createdAt: created.createdAt,
      expiresAt: created.expiresAt,
    },
  };
}

/**
 * Vérifie la valeur du cookie et renvoie la session, ou `null` si le cookie
 * est absent, mal signé, inconnu en base, expiré ou révoqué. Une session
 * expirée est supprimée. Une session valide voit son échéance repoussée
 * (au plus une écriture toutes les 5 minutes).
 */
export async function validateSessionCookie(
  cookieValue: string | undefined,
): Promise<AuthSession | null> {
  // Signature vérifiée avant toute requête : un cookie fabriqué ne touche pas la base.
  const token = readSignedSessionToken(cookieValue, env.SESSION_SECRET);
  if (!token) return null;

  const row = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      adminId: true,
      createdAt: true,
      expiresAt: true,
      lastSeenAt: true,
      admin: { select: { email: true, emailVerifiedAt: true } },
    },
  });
  if (!row) return null;

  const now = new Date();
  if (row.expiresAt <= now || absoluteEnd(row.createdAt) <= now) {
    await db.session.deleteMany({ where: { id: row.id } });
    return null;
  }

  let expiresAt = row.expiresAt;
  if (now.getTime() - row.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    expiresAt = slidingExpiry(now, row.createdAt);
    // `updateMany` : pas d'exception si la session vient d'être supprimée ailleurs.
    await db.session.updateMany({
      where: { id: row.id },
      data: { lastSeenAt: now, expiresAt },
    });
  }

  return {
    id: row.id,
    adminId: row.adminId,
    email: row.admin.email,
    emailVerifiedAt: row.admin.emailVerifiedAt,
    createdAt: row.createdAt,
    expiresAt,
  };
}

/** Révoque une session (déconnexion). Sans effet si elle n'existe plus. */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.deleteMany({ where: { id: sessionId } });
}
