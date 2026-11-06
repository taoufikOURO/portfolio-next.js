// Validation des variables d'environnement et garde-fous de développement.
//
// Module pur, volontairement SANS `import "server-only"` : il est aussi chargé
// hors de Next.js (prisma.config.ts, seed, scripts lancés par `node`).
// L'application, elle, passe par `lib/env.ts`.
//
// Contraintes (exécution directe par Node, voir E24) : imports relatifs avec
// extension, pas d'alias `@/`, pas d'`enum` ni de propriétés de paramètre.
//
// Règle de sécurité : aucun message d'erreur ne contient la valeur d'une
// variable, seulement son nom.

import { z } from "zod";

/** Hôtes acceptés pour la base de données en développement. */
export const LOCAL_DATABASE_HOSTS: readonly string[] = ["localhost", "127.0.0.1", "::1"];

/** Préfixe obligatoire des buckets Supabase Storage en développement. */
export const DEV_BUCKET_PREFIX = "dev-";

export const BUCKET_VARIABLES = [
  "SUPABASE_STORAGE_BUCKET_ARTICLES",
  "SUPABASE_STORAGE_BUCKET_PROJECTS",
  "SUPABASE_STORAGE_BUCKET_PROFILE",
  "SUPABASE_STORAGE_BUCKET_STACK",
] as const;

const DATABASE_VARIABLES = ["DATABASE_URL", "DIRECT_URL"] as const;

/** Variables obligatoires uniquement en production (envoi réel des e-mails). */
const PRODUCTION_ONLY_VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
] as const;

const MISSING = "variable manquante ou vide.";

// ---------------------------------------------------------------------------
// Garde-fous
// ---------------------------------------------------------------------------

function normalizeHost(host: string): string {
  const lower = host.trim().toLowerCase();
  // L'API URL renvoie les adresses IPv6 entre crochets : « [::1] ».
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
}

function isLocalHost(host: string): boolean {
  return LOCAL_DATABASE_HOSTS.includes(normalizeHost(host));
}

/** URL `postgres://` ou `postgresql://` analysable. */
export function isPostgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

/**
 * Vrai seulement si l'URL désigne sans ambiguïté une base locale.
 *
 * Refusé : hôte absent (le pilote se rabattrait sur PGHOST ou un socket),
 * plusieurs hôtes, hôte distant, ou paramètre `?host=` qui pointerait
 * ailleurs que sur la machine locale.
 */
export function isLocalDatabaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return false;
  if (!isLocalHost(url.hostname)) return false;

  for (const host of url.searchParams.getAll("host")) {
    if (!isLocalHost(host)) return false;
  }
  return true;
}

export function isDevBucketName(name: string): boolean {
  return name.startsWith(DEV_BUCKET_PREFIX) && name.length > DEV_BUCKET_PREFIX.length;
}

// ---------------------------------------------------------------------------
// Schéma
// ---------------------------------------------------------------------------

function requiredString(invalidMessage = "valeur invalide.") {
  return z.string({ error: (issue) => (issue.input === undefined ? MISSING : invalidMessage) });
}

function optionalString() {
  return z.string({ error: "valeur invalide." }).optional();
}

const httpUrl = (message: string) =>
  requiredString(message).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, message);

const databaseUrl = requiredString().refine(
  isPostgresUrl,
  "doit être une URL PostgreSQL (postgresql://…).",
);

const envSchema = z
  .object({
    APP_ENV: z.enum(["development", "production"], {
      error: (issue) =>
        issue.input === undefined ? MISSING : "doit valoir « development » ou « production ».",
    }),
    APP_URL: httpUrl("doit être une URL http(s) valide."),
    NEXT_PUBLIC_SITE_URL: optionalString(),

    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,

    SESSION_SECRET: requiredString().min(32, "doit contenir au moins 32 caractères."),

    NEXT_PUBLIC_SUPABASE_URL: httpUrl("doit être une URL http(s) valide."),
    SUPABASE_SERVICE_ROLE_KEY: requiredString(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString(),
    SUPABASE_STORAGE_BUCKET_ARTICLES: requiredString(),
    SUPABASE_STORAGE_BUCKET_PROJECTS: requiredString(),
    SUPABASE_STORAGE_BUCKET_PROFILE: requiredString(),
    SUPABASE_STORAGE_BUCKET_STACK: requiredString(),

    SMTP_HOST: optionalString(),
    SMTP_PORT: z.coerce
      .number({ error: "doit être un numéro de port." })
      .int("doit être un numéro de port.")
      .min(1, "doit être un numéro de port.")
      .max(65535, "doit être un numéro de port.")
      .optional(),
    SMTP_USER: optionalString(),
    SMTP_PASS: optionalString(),
    MAIL_FROM: optionalString(),

    GITHUB_TOKEN: optionalString(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "development") {
      for (const key of DATABASE_VARIABLES) {
        if (isPostgresUrl(env[key]) && !isLocalDatabaseUrl(env[key])) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message:
              "doit pointer vers une base locale (localhost, 127.0.0.1 ou ::1) quand APP_ENV=development.",
          });
        }
      }
      for (const key of BUCKET_VARIABLES) {
        if (!isDevBucketName(env[key])) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `doit commencer par « ${DEV_BUCKET_PREFIX} » quand APP_ENV=development.`,
          });
        }
      }
    }

    if (env.APP_ENV === "production") {
      for (const key of PRODUCTION_ONLY_VARIABLES) {
        if (env[key] === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "variable obligatoire quand APP_ENV=production.",
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Source des variables : `process.env` ou un objet équivalent (tests). */
export type EnvSource = Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export class EnvError extends Error {
  /** Noms des variables en cause (jamais leurs valeurs). */
  readonly variables: string[];

  constructor(problems: { variable: string; message: string }[]) {
    const lines = problems.map((problem) => `  - ${problem.variable} : ${problem.message}`);
    super(
      [
        "Configuration invalide : l'application ne peut pas démarrer.",
        ...lines,
        "Corrigez le fichier .env (voir .env.example).",
      ].join("\n"),
    );
    this.name = "EnvError";
    this.variables = [...new Set(problems.map((problem) => problem.variable))];
  }
}

/** Ne garde que les variables connues, sans espaces autour ; une chaîne vide compte comme absente. */
function pickKnownVariables(source: EnvSource): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of Object.keys(envSchema.shape)) {
    const value = source[key]?.trim();
    if (value) picked[key] = value;
  }
  return picked;
}

/**
 * Valide les variables d'environnement.
 * Lève une `EnvError` (message en français, noms des variables seulement)
 * si une variable obligatoire manque ou si un garde-fou est enfreint.
 */
export function parseEnv(source: EnvSource): Env {
  const result = envSchema.safeParse(pickKnownVariables(source));
  if (result.success) return result.data;

  throw new EnvError(
    result.error.issues.map((issue) => ({
      variable: String(issue.path[0] ?? "configuration"),
      message: issue.message,
    })),
  );
}
