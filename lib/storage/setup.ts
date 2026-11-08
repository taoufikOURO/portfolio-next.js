import "server-only";

import type { StorageApi, StorageConfig } from "./client";
import {
  assertWritableBucket,
  BUCKET_KEYS,
  bucketContentTypes,
  bucketMaxBytes,
  type BucketKey,
} from "./rules";

/**
 * Création idempotente des buckets (`pnpm storage:setup`, `scripts/setup-storage.ts`).
 *
 * - Bucket absent : créé public, avec la taille maximale (`fileSizeLimit`) et
 *   les types MIME (`allowedMimeTypes`) de ses usages, tirés de `rules.ts`
 *   (seconde barrière côté Supabase).
 * - Bucket existant : jamais modifié, seulement signalé (avertissement s'il
 *   n'est pas public).
 * - Garde-fou : hors production, tout nom sans préfixe `dev-` est refusé avant
 *   le moindre appel réseau.
 *
 * Imports relatifs sans alias `@/` (chargé par un script Node, E24, E33).
 */

export type BucketOutcome =
  | { bucket: BucketKey; name: string; status: "created"; fileSizeLimit: number; allowedMimeTypes: string[] }
  | { bucket: BucketKey; name: string; status: "exists"; public: boolean }
  | { bucket: BucketKey; name: string; status: "failed"; error: string };

export type SetupResult =
  | { ok: true; outcomes: BucketOutcome[] }
  | { ok: false; error: string; outcomes: BucketOutcome[] };

/** Réglages appliqués à la création d'un bucket. */
export function bucketSettings(bucket: BucketKey) {
  return {
    public: true,
    fileSizeLimit: bucketMaxBytes(bucket),
    allowedMimeTypes: bucketContentTypes(bucket),
  };
}

export async function setupBuckets(
  config: Pick<StorageConfig, "appEnv" | "buckets">,
  api: Pick<StorageApi, "listBuckets" | "createBucket">,
): Promise<SetupResult> {
  for (const key of BUCKET_KEYS) assertWritableBucket(config.appEnv, config.buckets[key]);

  const listed = await api.listBuckets();
  if (listed.error || !listed.data) {
    return {
      ok: false,
      error: `liste des buckets impossible : ${listed.error?.message ?? "réponse vide"}. Rien n'a été créé.`,
      outcomes: [],
    };
  }
  const existing = new Map(listed.data.map((bucket) => [bucket.name, bucket]));

  const outcomes: BucketOutcome[] = [];
  for (const key of BUCKET_KEYS) {
    const name = config.buckets[key];
    const current = existing.get(name);
    if (current) {
      outcomes.push({ bucket: key, name, status: "exists", public: current.public });
      continue;
    }
    const settings = bucketSettings(key);
    const { error } = await api.createBucket(name, settings);
    outcomes.push(
      error
        ? { bucket: key, name, status: "failed", error: error.message }
        : {
            bucket: key,
            name,
            status: "created",
            fileSizeLimit: settings.fileSizeLimit,
            allowedMimeTypes: settings.allowedMimeTypes,
          },
    );
  }

  const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
  return failed > 0
    ? { ok: false, error: `${failed} bucket(s) non créé(s).`, outcomes }
    : { ok: true, outcomes };
}
