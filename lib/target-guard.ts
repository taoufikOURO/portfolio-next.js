// Garde-fou des scripts qui écrivent en base hors de l'application : seed
// (`prisma/seed.ts`) et import des contenus (`scripts/import-public-content.ts`),
// décision E68.
//
// Sans l'option explicite `--confirm-production`, un script refuse de tourner
// si `APP_ENV=production` ou si `DATABASE_URL` ne désigne pas une base locale.
// Le message nomme la variable, jamais sa valeur (aucune URL affichée).
//
// Module pur, sans `server-only` : importé par le seed (Node, hors de Next.js)
// et par les tests.

import { isLocalDatabaseUrl } from "./env-schema";

/** Option à ajouter, en toutes lettres, pour viser la production. */
export const CONFIRM_PRODUCTION_FLAG = "--confirm-production";

export type TargetCheck = {
  appEnv: string | undefined;
  databaseUrl: string | undefined;
  confirmProduction: boolean;
};

/** Raison du refus (sans aucune valeur de variable), ou `null` si le script peut tourner. */
export function productionTargetRefusal({ appEnv, databaseUrl, confirmProduction }: TargetCheck): string | null {
  if (confirmProduction) return null;
  if (appEnv === "production") {
    return `APP_ENV=production : ajoutez l'option ${CONFIRM_PRODUCTION_FLAG} pour viser la base de production.`;
  }
  const url = databaseUrl?.trim() ?? "";
  if (url === "") return "DATABASE_URL est absente.";
  if (!isLocalDatabaseUrl(url)) {
    return `DATABASE_URL ne désigne pas une base locale (localhost, 127.0.0.1 ou ::1) : ajoutez l'option ${CONFIRM_PRODUCTION_FLAG} pour la viser.`;
  }
  return null;
}
