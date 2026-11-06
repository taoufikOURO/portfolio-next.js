import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import { authenticate, DUMMY_PASSWORD_HASH } from "./login";
import { hashPassword, PASSWORD_HASH_OPTIONS, verifyPassword } from "./password";
import { LOGIN_LOCK_DURATION_MS } from "./rate-limit";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
// Vrai argon2, mais espionné : on vérifie quel hash est contrôlé.
vi.mock("./password", async (importOriginal) => {
  const original = await importOriginal<typeof import("./password")>();
  return { ...original, verifyPassword: vi.fn(original.verifyPassword) };
});

const PASSWORD = "mot-de-passe-factice-de-test";
const EMAIL = "admin@example.com";
const IP = "203.0.113.7";
const START = new Date("2026-11-06T10:00:00.000Z");

let passwordHash: string;
let adminId: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  resetFakes();
  vi.mocked(verifyPassword).mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: EMAIL, passwordHash, emailVerifiedAt: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DUMMY_PASSWORD_HASH", () => {
  it("utilise exactement les paramètres argon2id des vrais mots de passe (même coût)", () => {
    const { memoryCost, timeCost, parallelism } = PASSWORD_HASH_OPTIONS;
    const prefix = `$argon2id$v=19$m=${memoryCost},t=${timeCost},p=${parallelism}$`;
    expect(DUMMY_PASSWORD_HASH.startsWith(prefix)).toBe(true);
    expect(passwordHash.startsWith(prefix)).toBe(true);
  });
});

describe("authenticate", () => {
  it("accepte le bon mot de passe et enregistre une tentative réussie", async () => {
    const result = await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP });
    expect(result).toEqual({ status: "success", adminId });
    expect(fakeDb.loginAttempts).toEqual([
      expect.objectContaining({ email: EMAIL, ipAddress: IP, succeeded: true }),
    ]);
  });

  it("même résultat pour un mauvais mot de passe et pour une adresse inconnue", async () => {
    const wrongPassword = await authenticate({ email: EMAIL, password: "pas-le-bon-mot", ipAddress: IP });
    const unknownEmail = await authenticate({
      email: "inconnu@example.com",
      password: PASSWORD,
      ipAddress: IP,
    });
    expect(wrongPassword).toEqual({ status: "invalid" });
    expect(unknownEmail).toEqual(wrongPassword);
    expect(fakeDb.loginAttempts.map((attempt) => attempt.succeeded)).toEqual([false, false]);
  });

  it("adresse inconnue : vérifie quand même un hash (le hash factice)", async () => {
    await authenticate({ email: "inconnu@example.com", password: PASSWORD, ipAddress: IP });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith(PASSWORD, DUMMY_PASSWORD_HASH);
  });

  it("adresse connue : vérifie le hash du compte", async () => {
    await authenticate({ email: EMAIL, password: "pas-le-bon-mot", ipAddress: IP });
    expect(verifyPassword).toHaveBeenCalledWith("pas-le-bon-mot", passwordHash);
  });

  it("6e tentative après 5 échecs : refusée 15 minutes, même avec le bon mot de passe", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      vi.setSystemTime(new Date(START.getTime() + attempt * 1000));
      expect(await authenticate({ email: EMAIL, password: "mauvais", ipAddress: IP })).toEqual({
        status: "invalid",
      });
    }
    const fifthFailure = new Date(START.getTime() + 4000);
    vi.mocked(verifyPassword).mockClear();

    vi.setSystemTime(new Date(START.getTime() + 5000));
    const locked = await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP });
    expect(locked).toEqual({
      status: "locked",
      lockedUntil: new Date(fifthFailure.getTime() + LOGIN_LOCK_DURATION_MS),
    });
    // Refus sans vérification du mot de passe, et sans enregistrement.
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(fakeDb.loginAttempts).toHaveLength(5);

    // Une minute avant la fin : toujours bloqué.
    vi.setSystemTime(new Date(fifthFailure.getTime() + LOGIN_LOCK_DURATION_MS - 60_000));
    expect((await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP })).status).toBe("locked");

    // Après 15 minutes : la connexion fonctionne.
    vi.setSystemTime(new Date(fifthFailure.getTime() + LOGIN_LOCK_DURATION_MS));
    expect(await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP })).toEqual({
      status: "success",
      adminId,
    });
  });

  it("le blocage s'applique aussi à une adresse inconnue (aucune différence visible)", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authenticate({ email: "inconnu@example.com", password: "mauvais", ipAddress: "192.0.2.9" });
    }
    const result = await authenticate({
      email: "inconnu@example.com",
      password: "mauvais",
      ipAddress: "198.51.100.1",
    });
    expect(result.status).toBe("locked");
  });

  it("prend le verrou PostgreSQL avant de compter les tentatives", async () => {
    await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP });
    expect(fakeDb.calls.executeRaw).toEqual(["SELECT pg_advisory_xact_lock(724011701)"]);
  });

  it("purge les tentatives de plus de 30 jours", async () => {
    fakeDb.loginAttempts.push({
      id: fakeId(),
      email: EMAIL,
      ipAddress: IP,
      succeeded: false,
      createdAt: new Date(START.getTime() - 31 * 24 * 60 * 60 * 1000),
    });
    await authenticate({ email: EMAIL, password: PASSWORD, ipAddress: IP });
    expect(fakeDb.loginAttempts).toHaveLength(1);
    expect(fakeDb.loginAttempts[0].createdAt).toEqual(START);
  });
});
