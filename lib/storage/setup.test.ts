import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BucketSettings, StorageApi } from "./client";
import { StorageGuardError } from "./rules";
import { setupBuckets } from "./setup";

const MB = 1024 * 1024;

/** Réglages attendus, fixés par Taoufik (8 novembre 2026). */
const EXPECTED: Record<string, BucketSettings> = {
  "dev-articles": { public: true, fileSizeLimit: 5 * MB, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  "dev-projets": { public: true, fileSizeLimit: 5 * MB, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  "dev-profil": {
    public: true,
    fileSizeLimit: 5 * MB,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
  },
  "dev-stack": { public: true, fileSizeLimit: 5 * MB, allowedMimeTypes: ["image/png", "image/webp", "image/svg+xml"] },
};

const DEV = {
  appEnv: "development" as const,
  buckets: { articles: "dev-articles", projects: "dev-projets", profile: "dev-profil", stack: "dev-stack" },
};

type Created = { name: string; settings: BucketSettings };

/** Faux client : buckets existants donnés, créations enregistrées, aucun réseau. */
function fakeApi(existing: { name: string; public: boolean }[] = [], createError?: Record<string, string>) {
  const created: Created[] = [];
  let listCalls = 0;
  const api: Pick<StorageApi, "listBuckets" | "createBucket"> = {
    async listBuckets() {
      listCalls += 1;
      return { data: [...existing, ...created.map((c) => ({ name: c.name, public: c.settings.public }))], error: null };
    },
    async createBucket(name, settings) {
      if (createError?.[name]) return { error: { message: createError[name] } };
      created.push({ name, settings });
      return { error: null };
    },
  };
  return { api, created, listCalls: () => listCalls };
}

// Tout appel réseau réel ferait échouer le test.
beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("appel réseau interdit dans ce test");
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("setupBuckets", () => {
  it("crée les quatre buckets avec la taille maximale et les types MIME attendus", async () => {
    const { api, created } = fakeApi();
    const result = await setupBuckets(DEV, api);
    expect(result.ok).toBe(true);
    expect(Object.fromEntries(created.map((c) => [c.name, c.settings]))).toEqual(EXPECTED);
    expect(result.outcomes.map((o) => o.status)).toEqual(["created", "created", "created", "created"]);
  });

  it("est idempotent : un second lancement ne crée ni ne modifie rien", async () => {
    const fake = fakeApi();
    await setupBuckets(DEV, fake.api);
    const second = await setupBuckets(DEV, fake.api);
    expect(fake.created).toHaveLength(4);
    expect(second.outcomes.map((o) => o.status)).toEqual(["exists", "exists", "exists", "exists"]);
  });

  it("laisse un bucket existant inchangé, même mal réglé ou privé, et crée seulement les absents", async () => {
    const { api, created } = fakeApi([
      { name: "dev-articles", public: true },
      { name: "dev-stack", public: false },
    ]);
    const result = await setupBuckets(DEV, api);
    expect(created.map((c) => c.name)).toEqual(["dev-projets", "dev-profil"]);
    expect(result.outcomes).toContainEqual({ bucket: "stack", name: "dev-stack", status: "exists", public: false });
  });

  it("refuse en développement un bucket sans préfixe dev-, avant tout appel", async () => {
    const fake = fakeApi();
    await expect(
      setupBuckets({ ...DEV, buckets: { ...DEV.buckets, stack: "stack" } }, fake.api),
    ).rejects.toThrow(StorageGuardError);
    expect(fake.listCalls()).toBe(0);
    expect(fake.created).toEqual([]);
  });

  it("ne crée rien si la liste des buckets est impossible", async () => {
    const created: string[] = [];
    const result = await setupBuckets(DEV, {
      listBuckets: async () => ({ data: null, error: { message: "Invalid path specified in request URL" } }),
      createBucket: async (name) => (created.push(name), { error: null }),
    });
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? "" : result.error).toMatch(/Rien n'a été créé/);
    expect(created).toEqual([]);
  });

  it("signale l'échec d'une création sans arrêter les autres", async () => {
    const { api, created } = fakeApi([], { "dev-profil": "quota" });
    const result = await setupBuckets(DEV, api);
    expect(result.ok).toBe(false);
    expect(created.map((c) => c.name)).toEqual(["dev-articles", "dev-projets", "dev-stack"]);
    expect(result.outcomes).toContainEqual({ bucket: "profile", name: "dev-profil", status: "failed", error: "quota" });
  });

  it("en production, crée les buckets de production avec les mêmes réglages", async () => {
    const { api, created } = fakeApi();
    await setupBuckets(
      { appEnv: "production", buckets: { articles: "articles", projects: "projets", profile: "profil", stack: "stack" } },
      api,
    );
    expect(created.map((c) => [c.name, c.settings])).toEqual(
      Object.values(EXPECTED).map((settings, i) => [["articles", "projets", "profil", "stack"][i], settings]),
    );
  });
});
