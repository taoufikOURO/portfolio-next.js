// Chemins de l'administration liés à l'authentification.
//
// Module pur (sans `server-only`) : importé par `proxy.ts` et par le code serveur.
// Le chemin de connexion vient de `lib/mail/templates.ts` (lien des e-mails),
// pour n'avoir qu'une seule source.

import { SIGN_IN_PATH } from "../mail/templates";

export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = SIGN_IN_PATH;

/**
 * Pages de l'administration accessibles sans session.
 * L'étape 8 y ajoutera « mot de passe oublié », « réinitialiser » et
 * « vérifier l'e-mail ».
 */
export const PUBLIC_ADMIN_PATHS: readonly string[] = [ADMIN_LOGIN_PATH];

/** Vrai pour une page publique de l'admin (comparaison exacte, barre oblique finale ignorée). */
export function isPublicAdminPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PUBLIC_ADMIN_PATHS.includes(normalized);
}
