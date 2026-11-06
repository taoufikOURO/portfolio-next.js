import "server-only";

import { db } from "@/lib/db";

import { verifyPassword } from "./password";
import { getLoginLock, purgeOldLoginAttempts, recordLoginAttempt } from "./rate-limit";

/**
 * Vérification des identifiants, avec limitation des tentatives.
 *
 * - Adresse inconnue : un hash factice est quand même vérifié, pour que le
 *   temps de réponse ne révèle pas l'existence du compte.
 * - Résultat `invalid` identique pour une adresse inconnue et un mauvais mot
 *   de passe : l'appelant affiche un seul message neutre.
 * - Les tentatives d'une même connexion sont sérialisées par un verrou
 *   PostgreSQL (`pg_advisory_xact_lock`) : des requêtes envoyées en parallèle
 *   ne peuvent pas dépasser le seuil de 5 échecs (E44).
 */

/**
 * Hash argon2id d'un mot de passe aléatoire jeté aussitôt (personne ne le
 * connaît : ce n'est pas un secret). Mêmes paramètres que `PASSWORD_HASH_OPTIONS`,
 * donc même coût de vérification ; un test le contrôle. Écrit en dur pour que
 * la première requête n'ait pas à le calculer (ce qui la rendrait plus lente).
 */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$Sw3pTHSijdjJs7GH61RoJw$RvZr64TPYXuBEhGJiHvVEnmazMm9WrlQcqtTWUro9lI";

export type LoginInput = {
  /** Adresse déjà normalisée (minuscules, sans espaces) par `loginSchema`. */
  email: string;
  password: string;
  ipAddress: string;
};

export type LoginResult =
  | { status: "success"; adminId: string }
  | { status: "invalid" }
  | { status: "locked"; lockedUntil: Date };

export async function authenticate(input: LoginInput): Promise<LoginResult> {
  const key = { email: input.email, ipAddress: input.ipAddress };

  return db.$transaction(
    async (tx) => {
      // Clé arbitraire réservée aux connexions, relâchée à la fin de la
      // transaction. Littéral sans paramètre : PostgreSQL choisit la variante bigint.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(724011701)`;

      const lockedUntil = await getLoginLock(tx, key, new Date());
      if (lockedUntil) return { status: "locked", lockedUntil };

      const admin = await tx.admin.findUnique({
        where: { email: input.email },
        select: { id: true, passwordHash: true },
      });
      const passwordMatches = await verifyPassword(
        input.password,
        admin?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );
      const succeeded = admin !== null && passwordMatches;

      const now = new Date();
      await recordLoginAttempt(tx, { ...key, succeeded }, now);
      await purgeOldLoginAttempts(tx, now);

      return succeeded && admin ? { status: "success", adminId: admin.id } : { status: "invalid" };
    },
    // Des tentatives simultanées attendent leur tour derrière le verrou.
    { maxWait: 10_000, timeout: 15_000 },
  );
}
