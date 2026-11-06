import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ADMIN_LOGIN_PATH } from "./routes";
import { SESSION_COOKIE_NAME, validateSessionCookie, type AuthSession } from "./session";

/**
 * Session de la requête en cours, ou `null`. Mise en cache pour la durée d'un
 * rendu : le layout et la page qui l'appellent tous deux ne font qu'une requête.
 */
export const getCurrentSession = cache(async (): Promise<AuthSession | null> => {
  const cookieStore = await cookies();
  return validateSessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
});

/**
 * À appeler en tête de chaque layout, page et action serveur de l'administration
 * (règle 6 de `CLAUDE.md`). Sans session valide, redirige vers la connexion.
 * `proxy.ts` ne remplace jamais cet appel : il ne lit que la signature du cookie.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getCurrentSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}
