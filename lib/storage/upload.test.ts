import { describe, expect, it } from "vitest";

import { EnvError } from "../env-schema";
import type { BucketApi, StorageApi, StorageConfig, StorageContext } from "./client";
import { publicUrlFor, storageConfigFromEnv } from "./client";
import { removeFile } from "./remove";
import { FILE_MESSAGES, isObjectPath, StorageGuardError } from "./rules";
import { CACHE_CONTROL_SECONDS, replaceFile, UPLOAD_FAILED_MESSAGE, uploadFile } from "./upload";

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const OLD_PATH = "0b6f3a4e-2c1d-4b7a-9e8f-1a2b3c4d5e6f.png";

const DEV_BUCKETS = { articles: "dev-articles", projects: "dev-projets", profile: "dev-profil", stack: "dev-stack" };

type Call =
  | { op: "upload"; bucket: string; path: string; contentType: string; size: number }
  | { op: "remove"; bucket: string; paths: string[] };

/** Faux Supabase Storage : enregistre les appels, ne touche à rien. */
function fakeContext(
  overrides: Partial<StorageConfig> = {},
  failures: { upload?: string; remove?: string } = {},
): StorageContext & { calls: Call[]; errors: string[] } {
  const calls: Call[] = [];
  const errors: string[] = [];
  const bucketApi = (bucket: string): BucketApi => ({
    async upload(path, body, options) {
      calls.push({ op: "upload", bucket, path, contentType: options.contentType, size: body.byteLength });
      return { error: failures.upload ? { message: failures.upload } : null };
    },
    async remove(paths) {
      calls.push({ op: "remove", bucket, paths });
      return { error: failures.remove ? { message: failures.remove } : null };
    },
  });
  const api: StorageApi = {
    from: bucketApi,
    listBuckets: async () => ({ data: [], error: null }),
    createBucket: async () => ({ error: null }),
  };
  return {
    config: {
      appEnv: "development",
      supabaseUrl: "https://projet.supabase.co",
      serviceRoleKey: "cle-factice",
      buckets: DEV_BUCKETS,
      ...overrides,
    },
    api,
    logger: { error: (message) => errors.push(message) },
    calls,
    errors,
  };
}

describe("uploadFile", () => {
  it("envoie une image valide sous <uuid>.png, avec son vrai type", async () => {
    const context = fakeContext();
    const file = new File([PNG], "Ma photo de vacances.png", { type: "image/png" });
    const result = await uploadFile({ bucket: "articles", kind: "image", file }, context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isObjectPath(result.path)).toBe(true);
    expect(result.path).not.toMatch(/vacances/);
    expect(context.calls).toEqual([
      { op: "upload", bucket: "dev-articles", path: result.path, contentType: "image/png", size: PNG.byteLength },
    ]);
  });

  it("envoie avec un cache d'une heure au plus (un fichier supprimé ne reste pas servi longtemps)", async () => {
    let cacheControl: string | undefined;
    const context = fakeContext();
    const real = context.api.from;
    context.api.from = (bucket) => {
      const api = real(bucket);
      return { ...api, upload: (path, body, options) => ((cacheControl = options.cacheControl), api.upload(path, body, options)) };
    };
    await uploadFile({ bucket: "articles", kind: "image", file: PNG }, context);
    expect(cacheControl).toBe(CACHE_CONTROL_SECONDS);
    expect(Number(CACHE_CONTROL_SECONDS)).toBeLessThanOrEqual(3600);
  });

  it("ignore le type annoncé par le navigateur", async () => {
    const context = fakeContext();
    const file = new File([PNG], "icone.svg", { type: "image/svg+xml" });
    const result = await uploadFile({ bucket: "stack", kind: "icon", file }, context);
    expect(result.ok && result.path.endsWith(".png")).toBe(true);
    expect(context.calls[0]).toMatchObject({ contentType: "image/png" });
  });

  it("refuse un faux PNG sans rien écrire", async () => {
    const context = fakeContext();
    const file = new File(["du texte, pas une image"], "faux.png", { type: "image/png" });
    expect(await uploadFile({ bucket: "articles", kind: "image", file }, context)).toEqual({
      ok: false,
      error: FILE_MESSAGES.wrongType("image"),
    });
    expect(context.calls).toEqual([]);
  });

  it("refuse un fichier trop lourd sans le lire ni rien écrire", async () => {
    const context = fakeContext();
    const heavy = new Blob([new Uint8Array(1024 * 1024 + 1)]);
    let read = false;
    const spy = Object.assign(heavy, {
      arrayBuffer: () => {
        read = true;
        return Blob.prototype.arrayBuffer.call(heavy);
      },
    });
    expect(await uploadFile({ bucket: "articles", kind: "image", file: spy }, context)).toEqual({
      ok: false,
      error: FILE_MESSAGES.tooLargeForKind("image"),
    });
    expect(read).toBe(false);
    expect(context.calls).toEqual([]);
  });

  it("refuse un SVG contenant un script sans rien écrire", async () => {
    const context = fakeContext();
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], "icone.svg", {
      type: "image/svg+xml",
    });
    expect(await uploadFile({ bucket: "stack", kind: "icon", file }, context)).toEqual({
      ok: false,
      error: FILE_MESSAGES.svgScript,
    });
    expect(context.calls).toEqual([]);
  });

  it("refuse un usage non prévu pour le bucket (CV dans les articles)", async () => {
    const context = fakeContext();
    expect(await uploadFile({ bucket: "articles", kind: "resume", file: PNG }, context)).toEqual({
      ok: false,
      error: FILE_MESSAGES.kindNotAllowed,
    });
    expect(context.calls).toEqual([]);
  });

  it("renvoie un message générique si Supabase refuse, et journalise sans la clé", async () => {
    const context = fakeContext({}, { upload: "Bucket not found" });
    expect(await uploadFile({ bucket: "articles", kind: "image", file: PNG }, context)).toEqual({
      ok: false,
      error: UPLOAD_FAILED_MESSAGE,
    });
    expect(context.errors).toHaveLength(1);
    expect(context.errors[0]).not.toContain("cle-factice");
  });
});

describe("garde-fou de développement", () => {
  const PRODUCTION_BUCKETS = { articles: "articles", projects: "projets", profile: "profil", stack: "stack" };

  it("en development, aucun envoi possible dans un bucket sans préfixe dev-", async () => {
    for (const bucket of ["articles", "projects", "profile", "stack"] as const) {
      const context = fakeContext({ buckets: PRODUCTION_BUCKETS });
      const kind = bucket === "stack" ? "icon" : "image";
      await expect(uploadFile({ bucket, kind, file: PNG }, context)).rejects.toThrow(StorageGuardError);
      expect(context.calls).toEqual([]);
    }
  });

  it("en development, aucune suppression possible dans un bucket sans préfixe dev-", async () => {
    const context = fakeContext({ buckets: PRODUCTION_BUCKETS });
    await expect(removeFile("stack", OLD_PATH, context)).rejects.toThrow(StorageGuardError);
    expect(context.calls).toEqual([]);
  });

  it("le garde-fou passe avant tout contrôle du fichier", async () => {
    const context = fakeContext({ buckets: { ...DEV_BUCKETS, articles: "articles" } });
    await expect(uploadFile({ bucket: "articles", kind: "image", file: new Uint8Array(0) }, context)).rejects.toThrow(
      StorageGuardError,
    );
  });

  it("en production, les buckets de production sont utilisés", async () => {
    const context = fakeContext({ appEnv: "production", buckets: PRODUCTION_BUCKETS });
    expect((await uploadFile({ bucket: "projects", kind: "image", file: PNG }, context)).ok).toBe(true);
    expect(context.calls[0]).toMatchObject({ bucket: "projets" });
  });
});

describe("removeFile", () => {
  it("supprime un chemin de l'application", async () => {
    const context = fakeContext();
    expect(await removeFile("profile", OLD_PATH, context)).toBe(true);
    expect(context.calls).toEqual([{ op: "remove", bucket: "dev-profil", paths: [OLD_PATH] }]);
  });

  it.each(["../autre.png", "dossier/x.png", "", "photo.png"])("ignore un chemin non reconnu (« %s »)", async (path) => {
    const context = fakeContext();
    expect(await removeFile("profile", path, context)).toBe(false);
    expect(context.calls).toEqual([]);
  });

  it("renvoie false et journalise si Supabase refuse", async () => {
    const context = fakeContext({}, { remove: "réseau" });
    expect(await removeFile("profile", OLD_PATH, context)).toBe(false);
    expect(context.errors).toHaveLength(1);
  });
});

describe("replaceFile", () => {
  it("envoie le nouveau fichier, enregistre son chemin, puis supprime l'ancien", async () => {
    const context = fakeContext();
    const saved: string[] = [];
    const result = await replaceFile(
      {
        bucket: "stack",
        kind: "icon",
        file: PNG,
        previousPath: OLD_PATH,
        save: async (path) => {
          saved.push(path);
          expect(context.calls.map((call) => call.op)).toEqual(["upload"]);
        },
      },
      context,
    );
    expect(result).toEqual({ ok: true, path: saved[0], previousRemoved: true });
    expect(context.calls.map((call) => call.op)).toEqual(["upload", "remove"]);
    expect(context.calls[1]).toEqual({ op: "remove", bucket: "dev-stack", paths: [OLD_PATH] });
  });

  it("sans fichier précédent, ne supprime rien", async () => {
    const context = fakeContext();
    const result = await replaceFile({ bucket: "stack", kind: "icon", file: PNG, previousPath: null, save: async () => {} }, context);
    expect(result.ok).toBe(true);
    expect(context.calls.map((call) => call.op)).toEqual(["upload"]);
  });

  it("fichier refusé : rien n'est envoyé, l'ancien est conservé, rien n'est enregistré", async () => {
    const context = fakeContext();
    let saved = false;
    const result = await replaceFile(
      { bucket: "stack", kind: "icon", file: new TextEncoder().encode("faux"), previousPath: OLD_PATH, save: async () => void (saved = true) },
      context,
    );
    expect(result.ok).toBe(false);
    expect(saved).toBe(false);
    expect(context.calls).toEqual([]);
  });

  it("échec de l'enregistrement : le nouveau fichier est supprimé, l'ancien conservé", async () => {
    const context = fakeContext();
    await expect(
      replaceFile(
        { bucket: "stack", kind: "icon", file: PNG, previousPath: OLD_PATH, save: async () => Promise.reject(new Error("base")) },
        context,
      ),
    ).rejects.toThrow("base");
    const [upload, remove] = context.calls;
    expect(upload.op).toBe("upload");
    expect(remove).toEqual({ op: "remove", bucket: "dev-stack", paths: [upload.op === "upload" ? upload.path : ""] });
    expect(context.calls).toHaveLength(2);
  });

  it("échec de la suppression de l'ancien : remplacement conservé, signalé", async () => {
    const context = fakeContext({}, { remove: "réseau" });
    const result = await replaceFile({ bucket: "stack", kind: "icon", file: PNG, previousPath: OLD_PATH, save: async () => {} }, context);
    expect(result).toMatchObject({ ok: true, previousRemoved: false });
  });
});

describe("configuration", () => {
  const ENV = {
    APP_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "cle-factice",
    SUPABASE_STORAGE_BUCKET_ARTICLES: "dev-articles",
    SUPABASE_STORAGE_BUCKET_PROJECTS: "dev-projets",
    SUPABASE_STORAGE_BUCKET_PROFILE: "dev-profil",
    SUPABASE_STORAGE_BUCKET_STACK: "dev-stack",
  } as const;

  it.each(["https://projet.supabase.co/rest/v1/", "https://projet.supabase.co/storage/v1"])(
    "refuse une URL d'API au lieu de l'URL du projet (%s), sans afficher la valeur",
    (url) => {
      expect(() => storageConfigFromEnv({ ...ENV, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow(EnvError);
      try {
        storageConfigFromEnv({ ...ENV, NEXT_PUBLIC_SUPABASE_URL: url });
      } catch (error) {
        expect((error as Error).message).toContain("NEXT_PUBLIC_SUPABASE_URL");
        expect((error as Error).message).not.toContain("projet.supabase.co/");
        expect((error as Error).message).not.toContain("cle-factice");
      }
    },
  );

  it("accepte l'URL du projet avec une barre finale", () => {
    expect(() => storageConfigFromEnv({ ...ENV, NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co/" })).not.toThrow();
  });

  it("lit les noms des buckets dans les variables SUPABASE_STORAGE_BUCKET_*", () => {
    const config = storageConfigFromEnv({
      APP_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "cle-factice",
      SUPABASE_STORAGE_BUCKET_ARTICLES: "dev-articles",
      SUPABASE_STORAGE_BUCKET_PROJECTS: "dev-projets",
      SUPABASE_STORAGE_BUCKET_PROFILE: "dev-profil",
      SUPABASE_STORAGE_BUCKET_STACK: "dev-stack",
    });
    expect(config.buckets).toEqual(DEV_BUCKETS);
    expect(publicUrlFor(config, "stack", OLD_PATH)).toBe(
      `https://projet.supabase.co/storage/v1/object/public/dev-stack/${OLD_PATH}`,
    );
  });
});
