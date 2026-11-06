import "server-only";

import { parseEnv } from "./env-schema";

export type { Env } from "./env-schema";

/**
 * Variables d'environnement validées, pour le code serveur de l'application.
 *
 * La validation a lieu au premier import : si une variable obligatoire manque,
 * ou si un garde-fou de développement est enfreint (base non locale, bucket
 * sans préfixe `dev-`), le serveur refuse de démarrer avec un message en
 * français qui nomme la variable sans afficher sa valeur.
 */
export const env = parseEnv(process.env);
