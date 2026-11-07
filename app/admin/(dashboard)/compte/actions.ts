"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { changePassword, requestEmailChange } from "@/lib/auth/account";
import { logUnexpectedError, minutesUntil } from "@/lib/auth/log";
import { clientIpAddress } from "@/lib/auth/rate-limit";
import { requireSession } from "@/lib/auth/require-session";
import { ACCOUNT_PATH } from "@/lib/auth/routes";
import { revokeOtherSessions } from "@/lib/auth/session";
import { sendEmailChangeNotice, sendEmailVerification } from "@/lib/mail/send";
import {
  ACCOUNT_MESSAGES,
  changeEmailSchema,
  changePasswordSchema,
  EMAIL_MAX_LENGTH,
  emailChangeRequestedMessage,
  firstFieldErrors,
  otherSessionsRevokedMessage,
  passwordLockedMessage,
  type ActionState,
} from "@/lib/validation/auth";

export type ChangeEmailState = ActionState<"newEmail" | "currentPassword">;
export type ChangePasswordState = ActionState<"currentPassword" | "newPassword" | "confirmation">;
export type RevokeSessionsState = ActionState<never>;

/**
 * Changement d'adresse (mot de passe actuel exigé, E47). L'adresse du compte
 * ne change pas ici : un lien part vers la nouvelle adresse, et l'ancienne
 * reçoit une notification où la nouvelle est masquée (E41).
 */
export async function requestEmailChangeAction(
  _previous: ChangeEmailState,
  formData: FormData,
): Promise<ChangeEmailState> {
  const session = await requireSession();

  const rawEmail = formData.get("newEmail");
  const values = { newEmail: typeof rawEmail === "string" ? rawEmail.slice(0, EMAIL_MAX_LENGTH) : "" };

  const parsed = changeEmailSchema.safeParse({
    newEmail: rawEmail,
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: firstFieldErrors(parsed.error),
      values,
    };
  }

  try {
    const result = await requestEmailChange({
      adminId: session.adminId,
      currentEmail: session.email,
      newEmail: parsed.data.newEmail,
      currentPassword: parsed.data.currentPassword,
      ipAddress: clientIpAddress(await headers()),
    });

    switch (result.status) {
      case "same-email":
        return {
          ok: false,
          message: ACCOUNT_MESSAGES.formInvalid,
          fieldErrors: { newEmail: ACCOUNT_MESSAGES.newEmailSameAsCurrent },
          values,
        };
      case "unavailable":
        return {
          ok: false,
          message: ACCOUNT_MESSAGES.formInvalid,
          fieldErrors: { newEmail: ACCOUNT_MESSAGES.newEmailUnavailable },
          values,
        };
      case "wrong-password":
        return {
          ok: false,
          message: ACCOUNT_MESSAGES.formInvalid,
          fieldErrors: { currentPassword: ACCOUNT_MESSAGES.currentPasswordWrong },
          values,
        };
      case "locked":
        return {
          ok: false,
          message: passwordLockedMessage(minutesUntil(result.lockedUntil)),
          fieldErrors: {},
          values,
        };
    }

    revalidatePath(ACCOUNT_PATH);
    try {
      await sendEmailVerification({ to: result.newEmail, token: result.token });
      await sendEmailChangeNotice({ to: result.previousEmail, newEmail: result.newEmail });
    } catch (error) {
      logUnexpectedError("Changement d'adresse (envoi)", error);
      return { ok: false, message: ACCOUNT_MESSAGES.mailFailed, fieldErrors: {}, values };
    }
    return { ok: true, message: emailChangeRequestedMessage(result.newEmail), fieldErrors: {} };
  } catch (error) {
    logUnexpectedError("Changement d'adresse", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {}, values };
  }
}

/**
 * Changement de mot de passe : mot de passe actuel exigé, autres sessions
 * révoquées, session courante conservée.
 */
export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return { ok: false, message: ACCOUNT_MESSAGES.formInvalid, fieldErrors: firstFieldErrors(parsed.error) };
  }

  try {
    const result = await changePassword({
      adminId: session.adminId,
      email: session.email,
      sessionId: session.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      ipAddress: clientIpAddress(await headers()),
    });

    if (result.status === "wrong-password") {
      return {
        ok: false,
        message: ACCOUNT_MESSAGES.formInvalid,
        fieldErrors: { currentPassword: ACCOUNT_MESSAGES.currentPasswordWrong },
      };
    }
    if (result.status === "locked") {
      return { ok: false, message: passwordLockedMessage(minutesUntil(result.lockedUntil)), fieldErrors: {} };
    }
  } catch (error) {
    logUnexpectedError("Changement de mot de passe", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidatePath(ACCOUNT_PATH);
  return { ok: true, message: ACCOUNT_MESSAGES.passwordChanged, fieldErrors: {} };
}

/** « Déconnecter les autres sessions » : toutes sauf celle-ci. */
export async function revokeOtherSessionsAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous?: RevokeSessionsState,
): Promise<RevokeSessionsState> {
  const session = await requireSession();

  let count: number;
  try {
    count = await revokeOtherSessions(session.adminId, session.id);
  } catch (error) {
    logUnexpectedError("Déconnexion des autres sessions", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidatePath(ACCOUNT_PATH);
  return { ok: true, message: otherSessionsRevokedMessage(count), fieldErrors: {} };
}
