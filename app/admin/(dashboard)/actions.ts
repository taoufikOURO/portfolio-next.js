"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/require-session";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/routes";
import {
  clearedSessionCookieOptions,
  revokeSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

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
