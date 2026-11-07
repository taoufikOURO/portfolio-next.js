import "server-only";

import { db } from "@/lib/db";

import { authenticate } from "./login";
import { hashPassword } from "./password";
import { revokeOtherSessions } from "./session";
import {
  consumeAuthToken,
  inspectAuthToken,
  issueAuthToken,
  issuedRecently,
  type AuthTokenFailure,
} from "./tokens";

/**
 * Parcours par lien et page « Compte » (cahier §3.1, étape 8) :
 * mot de passe oublié, réinitialisation, validation d'adresse, changement
 * d'adresse, changement de mot de passe.
 *
 * Ce module ne fait qu'écrire en base et renvoyer les jetons à envoyer :
 * l'envoi des e-mails est fait par les actions (`lib/mail/send.ts`).
 * Les adresses reçues sont déjà normalisées par les schémas Zod.
 */

type Failure = { status: AuthTokenFailure };

// ---------------------------------------------------------------------------
// Mot de passe actuel
// ---------------------------------------------------------------------------

export type CurrentPasswordFailure =
  | { status: "wrong-password" }
  | { status: "locked"; lockedUntil: Date };

/**
 * Vérifie le mot de passe actuel avec la limitation des tentatives de la
 * connexion (E47) : un mauvais mot de passe saisi sur la page « Compte »
 * compte comme un échec de connexion, et le blocage s'applique aussi ici.
 */
async function checkCurrentPassword(input: {
  adminId: string;
  email: string;
  password: string;
  ipAddress: string;
}): Promise<CurrentPasswordFailure | null> {
  const result = await authenticate({
    email: input.email,
    password: input.password,
    ipAddress: input.ipAddress,
  });
  if (result.status === "locked") return { status: "locked", lockedUntil: result.lockedUntil };
  if (result.status !== "success" || result.adminId !== input.adminId) {
    return { status: "wrong-password" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pages des liens
// ---------------------------------------------------------------------------

/**
 * État du lien ouvert (affichage de la page), sans le consommer : ouvrir le
 * lien ne change rien ; seul l'envoi du formulaire de la page l'utilise.
 */
export async function inspectLink(
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
  rawToken: unknown,
  now = new Date(),
) {
  return inspectAuthToken(db, rawToken, type, now);
}

// ---------------------------------------------------------------------------
// Mot de passe oublié et réinitialisation
// ---------------------------------------------------------------------------

/**
 * Prépare le lien de réinitialisation. Renvoie `null` (rien à envoyer) si
 * l'adresse est inconnue ou si un lien a été envoyé il y a moins d'une
 * minute. L'appelant affiche le même message dans tous les cas.
 */
export async function requestPasswordReset(
  email: string,
  now = new Date(),
): Promise<{ to: string; token: string } | null> {
  const admin = await db.admin.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!admin) return null;

  return db.$transaction(async (tx) => {
    if (await issuedRecently(tx, { adminId: admin.id, type: "PASSWORD_RESET" }, now)) return null;
    const { token } = await issueAuthToken(
      tx,
      { adminId: admin.id, type: "PASSWORD_RESET", targetEmail: admin.email },
      now,
    );
    return { to: admin.email, token };
  });
}

export type ResetPasswordResult = { status: "success"; revokedSessions: number } | Failure;

/**
 * Enregistre le nouveau mot de passe si le lien est valide, puis révoque
 * **toutes** les sessions (la personne n'est pas forcément connectée sur cet
 * appareil, et l'objectif est de couper un éventuel intrus). Le lien est
 * consommé dans la même transaction.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
  now = new Date(),
): Promise<ResetPasswordResult> {
  // Pas de calcul argon2 pour un lien déjà refusé.
  const check = await inspectAuthToken(db, rawToken, "PASSWORD_RESET", now);
  if (check.status !== "valid") return check;

  const passwordHash = await hashPassword(newPassword);

  return db.$transaction(async (tx) => {
    const consumed = await consumeAuthToken(tx, rawToken, "PASSWORD_RESET", now);
    if (consumed.status !== "valid") return consumed;

    const { adminId, targetEmail } = consumed.token;
    const admin = await tx.admin.findUnique({ where: { id: adminId }, select: { email: true } });
    // Lien envoyé à une adresse qui n'est plus celle du compte : refusé.
    if (!admin || targetEmail !== admin.email) return { status: "invalid" };

    await tx.admin.update({ where: { id: adminId }, data: { passwordHash } });
    const revokedSessions = await revokeOtherSessions(adminId, null, tx);
    await tx.authToken.deleteMany({ where: { adminId, type: "PASSWORD_RESET", usedAt: null } });
    return { status: "success", revokedSessions };
  });
}

// ---------------------------------------------------------------------------
// Validation d'adresse et changement d'adresse
// ---------------------------------------------------------------------------

export type VerifyEmailResult =
  | { status: "verified"; email: string }
  | { status: "changed"; email: string; previousEmail: string }
  | { status: "unavailable" }
  | Failure;

/**
 * Applique un lien de validation :
 * - adresse du lien = adresse du compte : l'adresse est marquée validée ;
 * - adresse différente (changement demandé) : elle devient l'adresse du
 *   compte, validée. C'est le seul endroit où l'adresse change. Tous les
 *   autres liens du compte (validation, réinitialisation) sont supprimés :
 *   un ancien lien ne peut pas ramener l'ancienne adresse.
 */
export async function verifyEmail(rawToken: string, now = new Date()): Promise<VerifyEmailResult> {
  return db.$transaction(async (tx) => {
    const consumed = await consumeAuthToken(tx, rawToken, "EMAIL_VERIFICATION", now);
    if (consumed.status !== "valid") return consumed;

    const { adminId, targetEmail } = consumed.token;
    const admin = await tx.admin.findUnique({
      where: { id: adminId },
      select: { email: true, emailVerifiedAt: true },
    });
    if (!admin || !targetEmail) return { status: "invalid" };

    if (targetEmail === admin.email) {
      if (!admin.emailVerifiedAt) {
        await tx.admin.update({ where: { id: adminId }, data: { emailVerifiedAt: now } });
      }
      await tx.authToken.deleteMany({
        where: { adminId, type: "EMAIL_VERIFICATION", targetEmail, usedAt: null },
      });
      return { status: "verified", email: admin.email };
    }

    const taken = await tx.admin.findUnique({ where: { email: targetEmail }, select: { id: true } });
    if (taken) return { status: "unavailable" };

    await tx.admin.update({
      where: { id: adminId },
      data: { email: targetEmail, emailVerifiedAt: now },
    });
    await tx.authToken.deleteMany({ where: { adminId, usedAt: null } });
    return { status: "changed", email: targetEmail, previousEmail: admin.email };
  });
}

export type RequestEmailChangeResult =
  | { status: "issued"; token: string; newEmail: string; previousEmail: string }
  | { status: "same-email" }
  | { status: "unavailable" }
  | CurrentPasswordFailure;

/**
 * Demande de changement d'adresse : exige le mot de passe actuel (E47).
 * L'adresse du compte ne change pas ici : un lien est créé pour la nouvelle
 * adresse (`targetEmail`) ; il remplace une demande précédente encore en
 * attente. L'appelant envoie le lien à la nouvelle adresse et la
 * notification à l'ancienne.
 */
export async function requestEmailChange(
  input: {
    adminId: string;
    currentEmail: string;
    newEmail: string;
    currentPassword: string;
    ipAddress: string;
  },
  now = new Date(),
): Promise<RequestEmailChangeResult> {
  if (input.newEmail === input.currentEmail) return { status: "same-email" };

  const failure = await checkCurrentPassword({
    adminId: input.adminId,
    email: input.currentEmail,
    password: input.currentPassword,
    ipAddress: input.ipAddress,
  });
  if (failure) return failure;

  const taken = await db.admin.findUnique({ where: { email: input.newEmail }, select: { id: true } });
  if (taken) return { status: "unavailable" };

  const { token } = await db.$transaction((tx) =>
    issueAuthToken(
      tx,
      {
        adminId: input.adminId,
        type: "EMAIL_VERIFICATION",
        targetEmail: input.newEmail,
        // Remplace les demandes de changement en attente, pas la validation de l'adresse actuelle.
        supersede: { targetEmail: { not: input.currentEmail } },
      },
      now,
    ),
  );
  return { status: "issued", token, newEmail: input.newEmail, previousEmail: input.currentEmail };
}

/** Changement d'adresse en attente (lien envoyé, pas encore cliqué, non expiré). */
export async function getPendingEmailChange(
  adminId: string,
  currentEmail: string,
  now = new Date(),
): Promise<{ targetEmail: string; expiresAt: Date } | null> {
  const pending = await db.authToken.findFirst({
    where: {
      adminId,
      type: "EMAIL_VERIFICATION",
      usedAt: null,
      expiresAt: { gt: now },
      targetEmail: { not: currentEmail },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { targetEmail: true, expiresAt: true },
  });
  return pending?.targetEmail ? { targetEmail: pending.targetEmail, expiresAt: pending.expiresAt } : null;
}

export type ResendVerificationResult =
  | { status: "issued"; to: string; token: string }
  | { status: "already-verified" }
  | { status: "cooldown" };

/** « Renvoyer le lien » de la bannière : nouveau lien pour l'adresse actuelle. */
export async function resendEmailVerification(
  adminId: string,
  now = new Date(),
): Promise<ResendVerificationResult> {
  return db.$transaction(async (tx) => {
    const admin = await tx.admin.findUnique({
      where: { id: adminId },
      select: { email: true, emailVerifiedAt: true },
    });
    if (!admin || admin.emailVerifiedAt) return { status: "already-verified" };

    const scope = { adminId, type: "EMAIL_VERIFICATION" as const, targetEmail: admin.email };
    if (await issuedRecently(tx, scope, now)) return { status: "cooldown" };

    const { token } = await issueAuthToken(
      tx,
      { ...scope, supersede: { targetEmail: admin.email } },
      now,
    );
    return { status: "issued", to: admin.email, token };
  });
}

// ---------------------------------------------------------------------------
// Changement de mot de passe
// ---------------------------------------------------------------------------

export type ChangePasswordResult =
  | { status: "changed"; revokedSessions: number }
  | CurrentPasswordFailure;

/**
 * Exige le mot de passe actuel. Les autres sessions sont révoquées ; la
 * session courante (`sessionId`) reste ouverte. Les liens de réinitialisation
 * en attente sont supprimés.
 */
export async function changePassword(input: {
  adminId: string;
  email: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress: string;
}): Promise<ChangePasswordResult> {
  const failure = await checkCurrentPassword({
    adminId: input.adminId,
    email: input.email,
    password: input.currentPassword,
    ipAddress: input.ipAddress,
  });
  if (failure) return failure;

  const passwordHash = await hashPassword(input.newPassword);

  const revokedSessions = await db.$transaction(async (tx) => {
    await tx.admin.update({ where: { id: input.adminId }, data: { passwordHash } });
    const count = await revokeOtherSessions(input.adminId, input.sessionId, tx);
    await tx.authToken.deleteMany({
      where: { adminId: input.adminId, type: "PASSWORD_RESET", usedAt: null },
    });
    return count;
  });
  return { status: "changed", revokedSessions };
}
