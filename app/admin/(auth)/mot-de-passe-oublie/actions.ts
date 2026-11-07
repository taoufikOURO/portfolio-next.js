"use server";

import { after } from "next/server";

import { requestPasswordReset } from "@/lib/auth/account";
import { logUnexpectedError } from "@/lib/auth/log";
import { sendPasswordReset } from "@/lib/mail/send";
import {
  ACCOUNT_MESSAGES,
  EMAIL_MAX_LENGTH,
  firstFieldErrors,
  forgotPasswordSchema,
  type ActionState,
} from "@/lib/validation/auth";

export type ForgotPasswordState = ActionState<"email">;

const CONTEXT = "Mot de passe oublié";

/**
 * « Mot de passe oublié » : accessible sans session (le lien envoyé est la
 * preuve). Le message est **le même** que l'adresse existe ou non, et le
 * travail se fait après la réponse (`after`) : le temps de réponse ne dépend
 * ni de la base ni de l'envoi SMTP, donc ne révèle pas non plus l'existence
 * du compte (E47).
 */
export async function requestPasswordResetAction(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const rawEmail = formData.get("email");
  const values = { email: typeof rawEmail === "string" ? rawEmail.slice(0, EMAIL_MAX_LENGTH) : "" };

  const parsed = forgotPasswordSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return {
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: firstFieldErrors(parsed.error),
      values,
    };
  }

  // Tout le travail (recherche du compte, création du lien, envoi) se fait
  // après la réponse : elle part aussi vite que l'adresse existe ou non.
  const { email } = parsed.data;
  after(async () => {
    try {
      const mail = await requestPasswordReset(email);
      if (mail) await sendPasswordReset(mail);
    } catch (error) {
      // `lib/mail/send.ts` a déjà journalisé le code SMTP, le cas échéant.
      logUnexpectedError(CONTEXT, error);
    }
  });

  return { ok: true, message: ACCOUNT_MESSAGES.resetRequested, fieldErrors: {}, values };
}
