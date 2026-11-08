import "server-only";

import { getStorageContext, type StorageContext } from "./client";
import { assertWritableBucket, isObjectPath, type BucketKey } from "./rules";

/**
 * Supprime un fichier d'un bucket.
 *
 * - Le garde-fou de développement s'applique aussi à la suppression : hors
 *   `APP_ENV=production`, rien n'est supprimé d'un bucket sans préfixe `dev-`
 *   (`StorageGuardError`, levée avant tout appel réseau).
 * - Seuls les chemins générés par l'application (`<uuid>.<extension>`) sont
 *   acceptés : pas de dossier, pas de `..`, pas de liste.
 *
 * Renvoie `true` si Supabase a accepté la suppression (un fichier déjà absent
 * compte comme supprimé), `false` sinon (l'erreur est journalisée).
 */
export async function removeFile(
  bucket: BucketKey,
  path: string,
  context: StorageContext = getStorageContext(),
): Promise<boolean> {
  const bucketName = context.config.buckets[bucket];
  assertWritableBucket(context.config.appEnv, bucketName);

  if (!isObjectPath(path)) {
    context.logger.error(`[storage] suppression ignorée : chemin non reconnu dans « ${bucketName} ».`);
    return false;
  }

  const { error } = await context.api.from(bucketName).remove([path]);
  if (error) {
    context.logger.error(`[storage] suppression refusée dans « ${bucketName} » : ${error.message}`);
    return false;
  }
  return true;
}
