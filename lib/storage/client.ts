import "server-only";

import { createClient } from "@supabase/supabase-js";

import { EnvError, parseEnv, type Env } from "../env-schema";
import {
  BUCKET_ENV_VARIABLES,
  BUCKET_KEYS,
  buildPublicUrl,
  type AppEnvName,
  type BucketKey,
} from "./rules";

/**
 * Client Supabase Storage, côté serveur uniquement.
 *
 * Il utilise `SUPABASE_SERVICE_ROLE_KEY` : cette clé contourne les règles
 * d'accès de Supabase et ne doit jamais atteindre le navigateur. D'où
 * `import "server-only"` ici et dans tous les modules de `lib/storage/`.
 * Les buckets sont en lecture publique ; aucune règle d'écriture n'est créée
 * pour les clés publiques : seul ce client peut écrire.
 *
 * Imports relatifs sans alias `@/` (chargé aussi par `scripts/setup-storage.ts`).
 */

export type StorageConfig = {
  appEnv: AppEnvName;
  supabaseUrl: string;
  serviceRoleKey: string;
  /** Nom réel de chaque bucket (variables `SUPABASE_STORAGE_BUCKET_*`). */
  buckets: Record<BucketKey, string>;
};

export function storageConfigFromEnv(
  env: Pick<
    Env,
    | "APP_ENV"
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "SUPABASE_SERVICE_ROLE_KEY"
    | (typeof BUCKET_ENV_VARIABLES)[BucketKey]
  >,
): StorageConfig {
  // L'URL du projet, sans chemin : une URL d'API (`…/rest/v1/`) ferait échouer
  // tous les appels (« Invalid path specified in request URL »).
  if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).pathname.replace(/\/+$/, "") !== "") {
    throw new EnvError(
      [
        {
          variable: "NEXT_PUBLIC_SUPABASE_URL",
          message: "doit être l'URL du projet (https://<projet>.supabase.co), sans chemin comme /rest/v1/.",
        },
      ],
      "Supabase Storage est inutilisable",
    );
  }
  const buckets = {} as Record<BucketKey, string>;
  for (const key of BUCKET_KEYS) buckets[key] = env[BUCKET_ENV_VARIABLES[key]];
  return {
    appEnv: env.APP_ENV,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    buckets,
  };
}

/** Erreur renvoyée par Supabase : seul le message, jamais d'en-tête ni de clé. */
export type StorageError = { message: string } | null;

/** Ce dont `lib/storage/` a besoin du client Supabase (remplaçable en test). */
export type BucketApi = {
  upload(
    path: string,
    body: Uint8Array,
    options: { contentType: string; upsert: false; cacheControl: string },
  ): Promise<{ error: StorageError }>;
  remove(paths: string[]): Promise<{ error: StorageError }>;
};

export type BucketSettings = {
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
};

export type StorageApi = {
  from(bucket: string): BucketApi;
  listBuckets(): Promise<{
    data: { name: string; public: boolean }[] | null;
    error: StorageError;
  }>;
  createBucket(name: string, settings: BucketSettings): Promise<{ error: StorageError }>;
};

/** Crée le client Storage avec la clé de service ; aucune session, aucun stockage local. */
export function createStorageApi(config: Pick<StorageConfig, "supabaseUrl" | "serviceRoleKey">): StorageApi {
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const storage: StorageApi = client.storage;
  return storage;
}

export type StorageLogger = { error(message: string): void };

/** Configuration et client utilisés par `upload.ts` et `remove.ts` (injectables en test). */
export type StorageContext = {
  config: StorageConfig;
  api: StorageApi;
  logger: StorageLogger;
};

let defaultContext: StorageContext | undefined;

/**
 * Contexte de l'application, créé au premier usage à partir de `process.env`
 * (même validation que `lib/env.ts`, garde-fou `dev-*` compris). Rien n'est
 * lu ni créé à l'import : les tests n'en dépendent pas.
 */
export function getStorageContext(): StorageContext {
  if (!defaultContext) {
    const config = storageConfigFromEnv(parseEnv(process.env));
    defaultContext = { config, api: createStorageApi(config), logger: console };
  }
  return defaultContext;
}

/** URL publique d'un fichier, calculée à l'affichage (E11). */
export function publicUrlFor(
  config: Pick<StorageConfig, "supabaseUrl" | "buckets">,
  bucket: BucketKey,
  path: string,
): string {
  return buildPublicUrl(config.supabaseUrl, config.buckets[bucket], path);
}
