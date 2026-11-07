// Chemins de l'administration liés à l'authentification.
//
// Module pur (sans `server-only`) : importé par `proxy.ts` et par le code serveur.
// Le chemin de connexion vient de `lib/mail/templates.ts` (lien des e-mails),
// pour n'avoir qu'une seule source.

import { EMAIL_VERIFICATION_PATH, PASSWORD_RESET_PATH, SIGN_IN_PATH } from "../mail/templates";

export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = SIGN_IN_PATH;
export const FORGOT_PASSWORD_PATH = "/admin/mot-de-passe-oublie";
/** Pages des liens envoyés par e-mail (chemins repris des modèles d'e-mails). */
export { EMAIL_VERIFICATION_PATH, PASSWORD_RESET_PATH };
export const ACCOUNT_PATH = "/admin/compte";

/**
 * Pages de l'administration accessibles sans session : connexion, mot de
 * passe oublié, réinitialisation et validation d'adresse (le lien peut être
 * ouvert sur un appareil où personne n'est connecté).
 */
export const PUBLIC_ADMIN_PATHS: readonly string[] = [
  ADMIN_LOGIN_PATH,
  FORGOT_PASSWORD_PATH,
  PASSWORD_RESET_PATH,
  EMAIL_VERIFICATION_PATH,
];

/** Vrai pour une page publique de l'admin (comparaison exacte, barre oblique finale ignorée). */
export function isPublicAdminPath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PUBLIC_ADMIN_PATHS.includes(normalized);
}
