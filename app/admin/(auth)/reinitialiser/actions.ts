"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resetPassword } from "@/lib/auth/account";
import { logUnexpectedError } from "@/lib/auth/log";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/routes";
import { clearedSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  ACCOUNT_MESSAGES,
  firstFieldErrors,
  resetPasswordSchema,
  type ActionState,
} from "@/lib/validation/auth";

import { LINK_FAILURE_MESSAGES, linkResultPath } from "../link-messages";

export type ResetPasswordState = ActionState<"token" | "newPassword" | "confirmation">;

/**
 * Nouveau mot de passe par lien de réinitialisation. Accessible sans session :
 * le jeton du lien est la preuve. Le lien est consommé, le mot de passe
 * remplacé et **toutes** les sessions révoquées, y compris celle de ce
 * navigateur s'il y en avait une (son cookie est effacé). Puis redirection
 * vers la connexion, qui affiche le succès (E47).
 */
export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    const fieldErrors = firstFieldErrors<"token" | "newPassword" | "confirmation">(parsed.error);
    return {
      ok: false,
      message: fieldErrors.token ? ACCOUNT_MESSAGES.tokenInvalid : ACCOUNT_MESSAGES.formInvalid,
      fieldErrors,
    };
  }

  try {
    const result = await resetPassword(parsed.data.token, parsed.data.newPassword);
    if (result.status !== "success") {
      const message = LINK_FAILURE_MESSAGES[result.status];
      return { ok: false, message, fieldErrors: { token: message } };
    }
  } catch (error) {
    logUnexpectedError("Réinitialisation du mot de passe", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {} };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(SESSION_COOKIE_NAME)) {
    cookieStore.set(SESSION_COOKIE_NAME, "", clearedSessionCookieOptions());
  }

  // Hors du try : `redirect` fonctionne en levant une exception.
  redirect(linkResultPath(ADMIN_LOGIN_PATH, "mot-de-passe-reinitialise"));
}
