// Configuration de la CLI Prisma 7 (migrations, generate, studio).
//
// Prisma 7 ne lit plus `.env` tout seul : on le charge ici avec l'API native
// de Node. Les variables déjà définies dans l'environnement (Vercel, CI) ne
// sont pas écrasées, et l'absence de `.env` n'est pas une erreur.
//
// Garde-fou : hors production, la CLI refuse toute base qui n'est pas locale,
// pour qu'une migration ou un reset ne puisse jamais viser Supabase par erreur.

import { defineConfig } from "prisma/config";

import { isLocalDatabaseUrl } from "./lib/env-schema";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

// Migrations : connexion directe (en production, DATABASE_URL passe par le pooler).
const directUrl = process.env.DIRECT_URL?.trim() || undefined;

if (process.env.APP_ENV !== "production" && directUrl && !isLocalDatabaseUrl(directUrl)) {
  throw new Error(
    "DIRECT_URL doit pointer vers une base locale (localhost, 127.0.0.1 ou ::1) " +
      "tant que APP_ENV ne vaut pas « production ». Commande Prisma annulée.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
