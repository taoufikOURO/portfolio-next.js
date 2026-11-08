import "server-only";

import { getStorageContext, type StorageContext } from "./client";
import { removeFile } from "./remove";
import {
  assertWritableBucket,
  BUCKET_KINDS,
  FILE_MESSAGES,
  generateObjectPath,
  inspectFile,
  maxBytesOf,
  type BucketKey,
  type FileKind,
} from "./rules";

/**
 * Envoi d'un fichier vers Supabase Storage.
 *
 * Ordre des contrôles, tous AVANT la moindre écriture :
 * 1. garde-fou du bucket (`dev-*` en développement) ;
 * 2. usage prévu pour ce bucket ;
 * 3. taille annoncée (avant même de lire le fichier) ;
 * 4. type réel, taille par format et contenu SVG (`inspectFile`).
 *
 * Le fichier est enregistré sous `<uuid>.<extension>` : le nom d'origine n'est
 * jamais conservé. C'est ce chemin qui est stocké en base ; l'URL publique est
 * calculée à l'affichage (`publicUrlFor`, E11).
 */

export type UploadInput = {
  bucket: BucketKey;
  kind: FileKind;
  /** Fichier reçu d'un formulaire (`File`), ou son contenu. */
  file: Blob | Uint8Array;
};

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

export const UPLOAD_FAILED_MESSAGE = "L’envoi du fichier a échoué. Réessayez dans un instant.";

/**
 * Durée de cache (secondes) : 1 heure, valeur par défaut de Supabase. Le CDN
 * de Supabase garde sa copie jusqu'à cette échéance, même après suppression du
 * fichier (constaté à l'étape 10 avec un an : fichier supprimé du bucket mais
 * encore servi). Une durée courte borne l'accès à un fichier supprimé.
 */
export const CACHE_CONTROL_SECONDS = "3600";

function sizeOf(file: Blob | Uint8Array): number {
  return file instanceof Uint8Array ? file.byteLength : file.size;
}

async function bytesOf(file: Blob | Uint8Array): Promise<Uint8Array> {
  return file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
}

export async function uploadFile(
  { bucket, kind, file }: UploadInput,
  context: StorageContext = getStorageContext(),
): Promise<UploadResult> {
  const bucketName = context.config.buckets[bucket];
  assertWritableBucket(context.config.appEnv, bucketName);

  if (!BUCKET_KINDS[bucket].includes(kind)) return { ok: false, error: FILE_MESSAGES.kindNotAllowed };
  if (sizeOf(file) > maxBytesOf(kind)) return { ok: false, error: FILE_MESSAGES.tooLargeForKind(kind) };

  const bytes = await bytesOf(file);
  const inspected = await inspectFile(bytes, kind);
  if (!inspected.ok) return inspected;

  const path = generateObjectPath(inspected.extension);
  const { error } = await context.api.from(bucketName).upload(path, bytes, {
    contentType: inspected.contentType,
    upsert: false,
    cacheControl: CACHE_CONTROL_SECONDS,
  });
  if (error) {
    context.logger.error(`[storage] envoi refusé par « ${bucketName} » : ${error.message}`);
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  return { ok: true, path };
}

export type ReplaceInput = UploadInput & {
  /** Chemin du fichier actuel, supprimé une fois le nouveau enregistré. */
  previousPath?: string | null;
  /**
   * Enregistre le nouveau chemin en base. Appelé entre l'envoi et la
   * suppression de l'ancien fichier : s'il échoue, le nouveau fichier est
   * supprimé et l'ancien conservé.
   */
  save: (path: string) => Promise<void>;
};

export type ReplaceResult =
  | { ok: true; path: string; previousRemoved: boolean }
  | { ok: false; error: string };

/**
 * Remplace un fichier : envoi du nouveau, enregistrement du chemin, puis
 * suppression de l'ancien. Si la suppression de l'ancien échoue, le
 * remplacement reste valide (`previousRemoved: false`, erreur journalisée).
 */
export async function replaceFile(
  { previousPath, save, ...input }: ReplaceInput,
  context: StorageContext = getStorageContext(),
): Promise<ReplaceResult> {
  const uploaded = await uploadFile(input, context);
  if (!uploaded.ok) return uploaded;

  try {
    await save(uploaded.path);
  } catch (error) {
    await removeFile(input.bucket, uploaded.path, context);
    throw error;
  }

  const previousRemoved =
    previousPath && previousPath !== uploaded.path
      ? await removeFile(input.bucket, previousPath, context)
      : true;
  return { ok: true, path: uploaded.path, previousRemoved };
}
