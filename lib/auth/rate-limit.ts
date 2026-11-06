import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Limitation des tentatives de connexion (cahier §3.1) : 5 échecs en
 * 15 minutes, par adresse OU par IP, puis blocage de 15 minutes.
 * Tentatives enregistrées en base (`login_attempts`), purgées après 30 jours.
 *
 * Règles retenues (E44) :
 * - le 5e échec dans une fenêtre de 15 minutes déclenche un blocage de
 *   15 minutes exactement, à partir de ce 5e échec ;
 * - pendant le blocage, les tentatives sont refusées sans vérifier le mot de
 *   passe et ne sont pas enregistrées (elles ne prolongent pas le blocage) ;
 * - une connexion réussie remet le compteur à zéro pour cette adresse et cette IP.
 */

const MINUTE_MS = 60 * 1000;

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_FAILURE_WINDOW_MS = 15 * MINUTE_MS;
export const LOGIN_LOCK_DURATION_MS = 15 * MINUTE_MS;
export const LOGIN_ATTEMPT_RETENTION_MS = 30 * 24 * 60 * MINUTE_MS;

/** Valeur enregistrée quand la requête ne permet pas de connaître l'IP. */
export const UNKNOWN_IP_ADDRESS = "inconnue";
const IP_ADDRESS_MAX_LENGTH = 64;

export type LoginAttemptKey = { email: string; ipAddress: string };

export type LoginAttemptRecord = LoginAttemptKey & {
  succeeded: boolean;
  createdAt: Date;
};

type LoginAttemptClient = Pick<Prisma.TransactionClient, "loginAttempt">;

/**
 * Adresse IP du client. Sur Vercel, `x-forwarded-for` est réécrit par la
 * plateforme (le client ne peut pas l'imposer). La limite par adresse e-mail
 * ne dépend pas de cette valeur.
 */
export function clientIpAddress(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, IP_ADDRESS_MAX_LENGTH) : UNKNOWN_IP_ADDRESS;
}

/** Fin du blocage déclenché par une suite de tentatives (triées par date croissante), ou `null`. */
function lockEnd(attempts: readonly LoginAttemptRecord[]): number | null {
  let failures: number[] = [];
  let end: number | null = null;

  for (const attempt of attempts) {
    const time = attempt.createdAt.getTime();
    if (attempt.succeeded) {
      failures = [];
      continue;
    }
    failures = failures.filter((failure) => time - failure < LOGIN_FAILURE_WINDOW_MS);
    failures.push(time);
    if (failures.length >= LOGIN_MAX_FAILURES) {
      end = time + LOGIN_LOCK_DURATION_MS;
      // Les échecs qui ont déclenché ce blocage ne comptent plus pour le suivant.
      failures = [];
    }
  }
  return end;
}

/**
 * Calcul pur : fin du blocage en cours pour cette adresse ou cette IP, ou
 * `null` si la connexion peut être tentée. `attempts` : tentatives récentes
 * (au moins les 30 dernières minutes), triées par date croissante.
 */
export function computeLoginLock(
  attempts: readonly LoginAttemptRecord[],
  key: LoginAttemptKey,
  now: Date,
): Date | null {
  const byEmail = lockEnd(attempts.filter((attempt) => attempt.email === key.email));
  const byIp = lockEnd(attempts.filter((attempt) => attempt.ipAddress === key.ipAddress));
  const end = Math.max(byEmail ?? 0, byIp ?? 0);
  return end > now.getTime() ? new Date(end) : null;
}

/**
 * Fin du blocage en cours, ou `null`. Il suffit de lire les 30 dernières
 * minutes : un blocage encore actif a été déclenché il y a moins de
 * 15 minutes, par des échecs survenus dans les 15 minutes précédentes.
 */
export async function getLoginLock(
  client: LoginAttemptClient,
  key: LoginAttemptKey,
  now: Date,
): Promise<Date | null> {
  const since = new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS - LOGIN_LOCK_DURATION_MS);
  const attempts = await client.loginAttempt.findMany({
    where: {
      createdAt: { gt: since },
      OR: [{ email: key.email }, { ipAddress: key.ipAddress }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { email: true, ipAddress: true, succeeded: true, createdAt: true },
  });
  return computeLoginLock(attempts, key, now);
}

export async function recordLoginAttempt(
  client: LoginAttemptClient,
  attempt: LoginAttemptKey & { succeeded: boolean },
  now: Date,
): Promise<void> {
  await client.loginAttempt.create({
    data: {
      email: attempt.email,
      ipAddress: attempt.ipAddress,
      succeeded: attempt.succeeded,
      createdAt: now,
    },
  });
}

/** Supprime les tentatives de plus de 30 jours. */
export async function purgeOldLoginAttempts(
  client: LoginAttemptClient,
  now: Date,
): Promise<number> {
  const { count } = await client.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - LOGIN_ATTEMPT_RETENTION_MS) } },
  });
  return count;
}
