import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes, testEnv, TEST_SESSION_SECRET } from "@/test/fakes";

import {
  clearedSessionCookieOptions,
  createSession,
  purgeExpiredSessions,
  revokeSession,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_LIFETIME_MS,
  sessionCookieOptions,
  validateSessionCookie,
} from "./session";
import { generateSessionToken, hashSessionToken, signSessionToken } from "./session-cookie";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const START = new Date("2026-11-06T10:00:00.000Z");

function at(offsetMs: number): Date {
  return new Date(START.getTime() + offsetMs);
}

function addAdmin() {
  const admin = {
    id: fakeId(),
    email: "admin@example.com",
    passwordHash: "$argon2id$factice",
    emailVerifiedAt: null,
  };
  fakeDb.admins.push(admin);
  return admin;
}

beforeEach(() => {
  resetFakes();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSession", () => {
  it("enregistre uniquement le hash du jeton, jamais le jeton ni le cookie", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id, {
      ipAddress: "203.0.113.7",
      userAgent: "Navigateur de test",
    });

    const [token] = cookieValue.split(".");
    expect(fakeDb.sessions).toHaveLength(1);
    const stored = fakeDb.sessions[0];
    expect(stored.tokenHash).toBe(hashSessionToken(token));

    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(cookieValue.split(".")[1]);
  });

  it("ouvre une session de 7 jours, valable aussitôt", async () => {
    const admin = addAdmin();
    const { cookieValue, session } = await createSession(admin.id);

    expect(fakeDb.sessions[0]).toMatchObject({
      adminId: admin.id,
      createdAt: START,
      lastSeenAt: START,
      expiresAt: at(SESSION_IDLE_TIMEOUT_MS),
    });
    expect(session).toMatchObject({ adminId: admin.id, email: admin.email });

    const validated = await validateSessionCookie(cookieValue);
    expect(validated).toMatchObject({ id: session.id, adminId: admin.id, email: admin.email });
  });

  it("tronque l'adresse IP et le user-agent trop longs", async () => {
    const admin = addAdmin();
    await createSession(admin.id, { ipAddress: "1".repeat(200), userAgent: "u".repeat(2000) });
    expect(fakeDb.sessions[0].ipAddress).toHaveLength(64);
    expect(fakeDb.sessions[0].userAgent).toHaveLength(512);
  });

  it("supprime au passage les sessions expirées", async () => {
    const admin = addAdmin();
    await createSession(admin.id);
    vi.setSystemTime(at(8 * DAY));
    await createSession(admin.id);
    expect(fakeDb.sessions).toHaveLength(1);
    expect(fakeDb.sessions[0].createdAt).toEqual(at(8 * DAY));
  });
});

describe("validateSessionCookie : cookies refusés", () => {
  it.each([
    ["absent", undefined],
    ["vide", ""],
    ["illisible", "n-importe-quoi"],
  ])("refuse un cookie %s sans interroger la base", async (_label, value) => {
    expect(await validateSessionCookie(value)).toBeNull();
    expect(fakeDb.calls.sessionFindUnique).toBe(0);
  });

  it("refuse un jeton falsifié (signé avec un autre secret) sans interroger la base", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);
    const [token] = cookieValue.split(".");
    const forged = signSessionToken(token, "un-autre-secret-factice-tout-aussi-long-9876543210");

    expect(await validateSessionCookie(forged)).toBeNull();
    expect(fakeDb.calls.sessionFindUnique).toBe(0);
  });

  it("refuse un jeton correctement signé mais inconnu en base", async () => {
    addAdmin();
    const cookie = signSessionToken(generateSessionToken(), TEST_SESSION_SECRET);
    expect(await validateSessionCookie(cookie)).toBeNull();
  });

  it("refuse tous les cookies si SESSION_SECRET change", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);
    testEnv.SESSION_SECRET = "nouveau-secret-factice-apres-rotation-0123456789";
    expect(await validateSessionCookie(cookieValue)).toBeNull();
  });
});

describe("expiration glissante", () => {
  it("repousse l'échéance à chaque visite (7 jours après la dernière)", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);

    vi.setSystemTime(at(6 * DAY));
    const visited = await validateSessionCookie(cookieValue);
    expect(visited?.expiresAt).toEqual(at(13 * DAY));
    expect(fakeDb.sessions[0]).toMatchObject({ lastSeenAt: at(6 * DAY), expiresAt: at(13 * DAY) });

    // Sans la visite du 6e jour, la session aurait expiré au 7e.
    vi.setSystemTime(at(12 * DAY));
    expect(await validateSessionCookie(cookieValue)).not.toBeNull();
  });

  it("expire après 7 jours sans visite, et la session est supprimée", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);

    vi.setSystemTime(at(SESSION_IDLE_TIMEOUT_MS - 1));
    expect(await validateSessionCookie(cookieValue)).not.toBeNull();

    vi.setSystemTime(at(SESSION_IDLE_TIMEOUT_MS - 1 + SESSION_IDLE_TIMEOUT_MS));
    expect(await validateSessionCookie(cookieValue)).toBeNull();
    expect(fakeDb.sessions).toHaveLength(0);
  });

  it("n'écrit pas en base à chaque requête (au plus toutes les 5 minutes)", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);

    vi.setSystemTime(at(4 * MINUTE));
    await validateSessionCookie(cookieValue);
    expect(fakeDb.sessions[0].lastSeenAt).toEqual(START);

    vi.setSystemTime(at(5 * MINUTE));
    await validateSessionCookie(cookieValue);
    expect(fakeDb.sessions[0].lastSeenAt).toEqual(at(5 * MINUTE));
  });

  it("ne dépasse jamais 30 jours depuis la connexion, même avec des visites quotidiennes", async () => {
    const admin = addAdmin();
    const { cookieValue } = await createSession(admin.id);

    for (let day = 1; day < 30; day += 1) {
      vi.setSystemTime(at(day * DAY));
      const session = await validateSessionCookie(cookieValue);
      expect(session, `jour ${day}`).not.toBeNull();
      expect(session!.expiresAt.getTime()).toBeLessThanOrEqual(at(SESSION_MAX_LIFETIME_MS).getTime());
    }

    vi.setSystemTime(at(SESSION_MAX_LIFETIME_MS));
    expect(await validateSessionCookie(cookieValue)).toBeNull();
    expect(fakeDb.sessions).toHaveLength(0);
  });
});

describe("révocation", () => {
  it("une session révoquée n'est plus acceptée", async () => {
    const admin = addAdmin();
    const { cookieValue, session } = await createSession(admin.id);
    const other = await createSession(admin.id);

    await revokeSession(session.id);

    expect(await validateSessionCookie(cookieValue)).toBeNull();
    // Les autres sessions ne sont pas touchées.
    expect(await validateSessionCookie(other.cookieValue)).not.toBeNull();
  });

  it("révoquer une session déjà supprimée ne lève pas d'erreur", async () => {
    await expect(revokeSession(fakeId())).resolves.toBeUndefined();
  });
});

describe("purgeExpiredSessions", () => {
  it("supprime les sessions inactives depuis 7 jours et celles de plus de 30 jours", async () => {
    const admin = addAdmin();
    const base = { adminId: admin.id, ipAddress: null, userAgent: null };
    fakeDb.sessions.push(
      // Active.
      { ...base, id: fakeId(), tokenHash: "a", createdAt: at(-DAY), lastSeenAt: START, expiresAt: at(DAY) },
      // Échéance glissante dépassée.
      { ...base, id: fakeId(), tokenHash: "b", createdAt: at(-9 * DAY), lastSeenAt: at(-8 * DAY), expiresAt: at(-DAY) },
      // Limite absolue de 30 jours atteinte.
      { ...base, id: fakeId(), tokenHash: "c", createdAt: at(-30 * DAY), lastSeenAt: START, expiresAt: at(DAY) },
    );

    expect(await purgeExpiredSessions()).toBe(2);
    expect(fakeDb.sessions.map((session) => session.tokenHash)).toEqual(["a"]);
  });
});

describe("options du cookie", () => {
  it("HttpOnly, SameSite=Strict, chemin /admin, 30 jours, sans Secure en développement", () => {
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/admin",
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it("Secure en production", () => {
    testEnv.APP_ENV = "production";
    expect(sessionCookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: "strict" });
  });

  it("l'effacement reprend le même chemin, avec une durée nulle", () => {
    expect(clearedSessionCookieOptions()).toMatchObject({ path: "/admin", maxAge: 0, httpOnly: true });
  });
});
