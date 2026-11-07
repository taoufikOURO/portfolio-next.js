"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resendEmailVerification } from "@/lib/auth/account";
import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from "@/lib/auth/routes";
import {
  clearedSessionCookieOptions,
  revokeSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { sendEmailVerification } from "@/lib/mail/send";
import { ACCOUNT_MESSAGES, type ActionState } from "@/lib/validation/auth";

/**
 * Déconnexion : session supprimée en base, cookie effacé (même chemin
 * `/admin`), retour à la connexion. Sans session valide, `requireSession()`
 * refuse l'action (redirection) avant toute écriture.
 */
export async function logout(): Promise<void> {
  const session = await requireSession();
  await revokeSession(session.id);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", clearedSessionCookieOptions());

  redirect(ADMIN_LOGIN_PATH);
}

export type ResendVerificationState = ActionState<never>;

/**
 * « Renvoyer le lien » de la bannière de validation : un nouveau lien pour
 * l'adresse actuelle (il remplace le précédent), au plus un par minute.
 */
export async function resendVerification(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous?: ResendVerificationState,
): Promise<ResendVerificationState> {
  const session = await requireSession();

  try {
    const result = await resendEmailVerification(session.adminId);
    if (result.status === "already-verified") {
      revalidatePath(ADMIN_HOME_PATH, "layout");
      return { ok: true, message: ACCOUNT_MESSAGES.alreadyVerified, fieldErrors: {} };
    }
    if (result.status === "cooldown") {
      return { ok: false, message: ACCOUNT_MESSAGES.verificationCooldown, fieldErrors: {} };
    }
    try {
      await sendEmailVerification({ to: result.to, token: result.token });
    } catch (error) {
      logUnexpectedError("Renvoi du lien de validation (envoi)", error);
      return { ok: false, message: ACCOUNT_MESSAGES.mailFailed, fieldErrors: {} };
    }
  } catch (error) {
    logUnexpectedError("Renvoi du lien de validation", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {} };
  }

  return { ok: true, message: ACCOUNT_MESSAGES.verificationSent, fieldErrors: {} };
}
