// Seed : compte administrateur unique et profil vide (id = 1).
//
// Lancement : `pnpm db:seed` (`prisma db seed`, commande déclarée dans
// prisma.config.ts). La CLI Prisma charge `.env` et applique son garde-fou sur
// DIRECT_URL ; ce script valide en plus ses propres variables (DATABASE_URL
// locale en développement, ADMIN_EMAIL, ADMIN_PASSWORD d'au moins 12 caractères)
// avant tout accès à la base.
//
// Exécuté par Node 24 hors de Next.js (E33) : il ne peut pas importer
// `lib/env.ts` ni `lib/db.ts` (`server-only`) et crée son propre client à partir
// du client généré dans `generated/prisma/`. Pas d'alias `@/`.
//
// Idempotent :
// - aucun administrateur : le compte est créé, mot de passe haché (argon2id) ;
// - un administrateur existe déjà : rien n'est modifié, le mot de passe n'est
//   jamais écrasé (le compte est unique, même si ADMIN_EMAIL a changé) ;
// - le profil (id = 1) est créé vide s'il n'existe pas, jamais modifié sinon.
//
// Sécurité : la console n'affiche jamais le mot de passe, son hash, ni les
// valeurs des variables (seulement leurs noms). Refusé si APP_ENV=production ou
// si DATABASE_URL n'est pas locale, sauf avec `--confirm-production` (E68,
// `lib/target-guard.ts`) : `pnpm db:seed:production`.

import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";
import { EnvError, parseSeedEnv, SEED_FAILURE, type SeedEnv } from "../lib/env-schema";
import { CONFIRM_PRODUCTION_FLAG, productionTargetRefusal } from "../lib/target-guard";

const PROFILE_ID = 1;

type AdminOutcome = "created" | "kept" | "kept-other-email";
type ProfileOutcome = "created" | "kept";

async function seed(db: PrismaClient, env: SeedEnv) {
  // `select` minimal : le hash existant n'est jamais lu.
  const [existingAdmin, existingProfile] = await Promise.all([
    db.admin.findFirst({ select: { email: true } }),
    db.profile.findUnique({ where: { id: PROFILE_ID }, select: { id: true } }),
  ]);

  let passwordHash: string | undefined;
  if (!existingAdmin) {
    if (env.ADMIN_PASSWORD === undefined) {
      throw new EnvError(
        [
          {
            variable: "ADMIN_PASSWORD",
            message: "variable manquante ou vide : obligatoire pour créer le compte administrateur.",
          },
        ],
        SEED_FAILURE,
      );
    }
    passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  }

  await db.$transaction(async (tx) => {
    if (passwordHash !== undefined) {
      await tx.admin.create({
        data: { email: env.ADMIN_EMAIL, passwordHash },
        select: { id: true },
      });
    }
    if (!existingProfile) {
      await tx.profile.create({ data: { id: PROFILE_ID }, select: { id: true } });
    }
  });

  const admin: AdminOutcome = !existingAdmin
    ? "created"
    : existingAdmin.email === env.ADMIN_EMAIL
      ? "kept"
      : "kept-other-email";
  const profile: ProfileOutcome = existingProfile ? "kept" : "created";
  return { admin, profile };
}

function report(admin: AdminOutcome, profile: ProfileOutcome, env: SeedEnv): void {
  switch (admin) {
    case "created":
      console.log(
        "Compte administrateur créé pour ADMIN_EMAIL (mot de passe enregistré uniquement sous forme de hash argon2id).",
      );
      console.log("À faire : retirer ADMIN_PASSWORD de .env, il ne sert plus.");
      break;
    case "kept":
      console.log(
        "Compte administrateur déjà présent pour ADMIN_EMAIL : aucun compte créé, mot de passe existant conservé.",
      );
      break;
    case "kept-other-email":
      console.warn(
        "Attention : un compte administrateur existe déjà, avec une autre adresse que ADMIN_EMAIL.\n" +
          "Le compte est unique : aucun compte créé, rien n'a été modifié (adresse et mot de passe conservés).\n" +
          "Pour changer d'adresse, utiliser la page « Compte » de l'administration.",
      );
      break;
  }
  if (admin !== "created" && env.ADMIN_PASSWORD !== undefined) {
    console.log("ADMIN_PASSWORD n'a pas été utilisé : il peut être retiré de .env.");
  }

  console.log(
    profile === "created"
      ? "Profil créé (id = 1, vide)."
      : "Profil déjà présent (id = 1) : inchangé.",
  );
}

// Codes Prisma fréquents, traduits. Le message brut d'une erreur Prisma n'est
// jamais affiché : il peut reprendre les arguments de la requête (dont le hash).
const PRISMA_HINTS: Record<string, string> = {
  P1000: "authentification refusée par PostgreSQL : vérifier DATABASE_URL.",
  P1001: "base injoignable : vérifier que le service postgresql-x64-18 est démarré.",
  P1003: "la base indiquée par DATABASE_URL n'existe pas.",
  P2002: "contrainte d'unicité violée (lancement simultané ?) : relancer le seed.",
  P2021: "table absente : appliquer d'abord les migrations (pnpm db:migrate).",
};

function describeError(error: unknown): string {
  if (error instanceof EnvError) return error.message;

  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
  const isPrismaError =
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError;

  const name = error instanceof Error ? error.name : "Erreur inconnue";
  const hint = code ? PRISMA_HINTS[code] : undefined;
  const detail =
    hint ?? (!isPrismaError && error instanceof Error ? error.message : "voir le code d'erreur.");
  return `Échec du seed (${name}${code ? ` ${code}` : ""}) : ${detail}`;
}

async function main(): Promise<void> {
  // Validation complète avant toute connexion à la base.
  const env = parseSeedEnv(process.env);

  // Jamais sur la production sans confirmation explicite (E68) :
  // `pnpm db:seed:production` (`prisma db seed -- --confirm-production`).
  const refusal = productionTargetRefusal({
    appEnv: env.APP_ENV,
    databaseUrl: env.DATABASE_URL,
    confirmProduction: process.argv.slice(2).includes(CONFIRM_PRODUCTION_FLAG),
  });
  if (refusal) {
    console.error(`Seed refusé, rien n'a été écrit : ${refusal}`);
    process.exitCode = 1;
    return;
  }

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    errorFormat: "minimal",
    log: [],
  });
  try {
    const { admin, profile } = await seed(db, env);
    report(admin, profile, env);
  } finally {
    await db.$disconnect();
  }
}

try {
  await main();
} catch (error) {
  console.error(describeError(error));
  process.exitCode = 1;
}
