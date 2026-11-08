// Création idempotente des buckets Supabase Storage (`pnpm storage:setup`).
//
// Lancement :
//   node --env-file=.env --conditions=react-server \
//     --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
//     --import ./scripts/ts-resolve-hook.mjs scripts/setup-storage.ts
//
// - Les quatre buckets sont ceux nommés dans `.env`
//   (`SUPABASE_STORAGE_BUCKET_*`) : `dev-*` en développement, sinon refus.
// - Un bucket absent est créé en lecture publique, avec la taille maximale et
//   les types MIME de son usage (`lib/storage/setup.ts`).
// - Un bucket existant n'est JAMAIS modifié : il est seulement signalé, avec un
//   avertissement s'il n'est pas public.
// - Aucune règle d'accès n'est créée : l'écriture reste réservée à la clé de
//   service, utilisée uniquement côté serveur.
// - La console n'affiche ni l'URL du projet ni la clé.
//
// Exécuté par Node 24 hors de Next.js (E24, E33) : imports relatifs sans
// extension (hook de résolution), pas d'alias `@/`. `--conditions=react-server`
// neutralise `import "server-only"` des modules de `lib/storage/`.

import { EnvError, parseEnv } from "../lib/env-schema";
import { createStorageApi, storageConfigFromEnv, type StorageConfig } from "../lib/storage/client";
import { StorageGuardError } from "../lib/storage/rules";
import { setupBuckets } from "../lib/storage/setup";

const PREFIX = "[storage:setup]";

function fail(message: string): never {
  console.error(`${PREFIX} ${message}`);
  process.exit(1);
}

let config: StorageConfig;
try {
  config = storageConfigFromEnv(parseEnv(process.env));
} catch (error) {
  if (error instanceof EnvError) fail(error.message);
  throw error;
}

let result;
try {
  result = await setupBuckets(config, createStorageApi(config));
} catch (error) {
  if (error instanceof StorageGuardError) fail(error.message);
  throw error;
}

for (const outcome of result.outcomes) {
  if (outcome.status === "exists") {
    const warning = outcome.public ? "" : " ATTENTION : il n'est pas public, il n'a pas été modifié.";
    console.log(`${PREFIX} ${outcome.name} : existe déjà, inchangé.${warning}`);
  } else if (outcome.status === "created") {
    console.log(
      `${PREFIX} ${outcome.name} : créé (public, ${outcome.fileSizeLimit / (1024 * 1024)} Mo max, ${outcome.allowedMimeTypes.join(", ")}).`,
    );
  } else {
    console.error(`${PREFIX} ${outcome.name} : création impossible (${outcome.error}).`);
  }
}

if (!result.ok) fail(result.error);

const created = result.outcomes.filter((outcome) => outcome.status === "created").length;
console.log(`${PREFIX} Terminé : ${created} bucket(s) créé(s), ${result.outcomes.length - created} déjà présent(s).`);
