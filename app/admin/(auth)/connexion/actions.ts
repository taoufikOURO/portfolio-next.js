"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { authenticate } from "@/lib/auth/login";
import { clientIpAddress } from "@/lib/auth/rate-limit";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";
import { createSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";
import {
  EMAIL_MAX_LENGTH,
  LOGIN_MESSAGES,
  loginFieldErrors,
  loginSchema,
  lockedMessage,
  type LoginFormState,
} from "@/lib/validation/auth";

/** Nom de l'erreur seulement : le message brut (Prisma) peut reprendre des valeurs saisies. */
function logUnexpected(error: unknown) {
  const name = error instanceof Error ? error.name : "inconnue";
  console.error(`Connexion à l'administration : erreur inattendue (${name}).`);
}

/**
 * Connexion à l'administration. Seule action accessible sans session : elle
 * en ouvre une. Validation serveur (même schéma que le formulaire) avant tout
 * accès à la base, limitation des tentatives, message neutre.
 */
export async function login(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const values = { email: typeof rawEmail === "string" ? rawEmail.slice(0, EMAIL_MAX_LENGTH) : "" };

  const parsed = loginSchema.safeParse({ email: rawEmail, password: formData.get("password") });
  if (!parsed.success) {
    return {
      ok: false,
      message: LOGIN_MESSAGES.formInvalid,
      fieldErrors: loginFieldErrors(parsed.error),
      values,
    };
  }

  const requestHeaders = await headers();
  const ipAddress = clientIpAddress(requestHeaders);

  let cookieValue: string;
  try {
    const result = await authenticate({ ...parsed.data, ipAddress });

    if (result.status === "locked") {
      const minutes = Math.max(1, Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60_000));
      return { ok: false, message: lockedMessage(minutes), fieldErrors: {}, values };
    }
    if (result.status === "invalid") {
      return { ok: false, message: LOGIN_MESSAGES.invalidCredentials, fieldErrors: {}, values };
    }

    ({ cookieValue } = await createSession(result.adminId, {
      ipAddress,
      userAgent: requestHeaders.get("user-agent"),
    }));
  } catch (error) {
    logUnexpected(error);
    return { ok: false, message: LOGIN_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, sessionCookieOptions());

  // Hors du try : `redirect` fonctionne en levant une exception.
  redirect(ADMIN_HOME_PATH);
}
