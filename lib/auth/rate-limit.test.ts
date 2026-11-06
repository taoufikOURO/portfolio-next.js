import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, resetFakes } from "@/test/fakes";

import {
  clientIpAddress,
  computeLoginLock,
  getLoginLock,
  LOGIN_LOCK_DURATION_MS,
  purgeOldLoginAttempts,
  recordLoginAttempt,
  UNKNOWN_IP_ADDRESS,
  type LoginAttemptRecord,
} from "./rate-limit";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));

const MINUTE = 60 * 1000;
const START = new Date("2026-11-06T10:00:00.000Z");
const at = (minutes: number) => new Date(START.getTime() + minutes * MINUTE);

const KEY = { email: "admin@example.com", ipAddress: "203.0.113.7" };

function failure(minutes: number, key: Partial<typeof KEY> = {}): LoginAttemptRecord {
  return { ...KEY, ...key, succeeded: false, createdAt: at(minutes) };
}

function success(minutes: number, key: Partial<typeof KEY> = {}): LoginAttemptRecord {
  return { ...KEY, ...key, succeeded: true, createdAt: at(minutes) };
}

describe("computeLoginLock", () => {
  it("4 échecs en 15 minutes : pas de blocage", () => {
    const attempts = [0, 1, 2, 3].map((minute) => failure(minute));
    expect(computeLoginLock(attempts, KEY, at(4))).toBeNull();
  });

  it("5 échecs en 15 minutes : blocage de 15 minutes à partir du 5e", () => {
    const attempts = [0, 1, 2, 3, 4].map((minute) => failure(minute));
    expect(computeLoginLock(attempts, KEY, at(4))).toEqual(at(19));
    expect(computeLoginLock(attempts, KEY, at(18.99))).toEqual(at(19));
    expect(computeLoginLock(attempts, KEY, at(19))).toBeNull();
  });

  it("le blocage dure 15 minutes même si les premiers échecs sortent de la fenêtre", () => {
    // 5e échec à la 14e minute : la fenêtre glissante se viderait dès la 15e,
    // mais le blocage court jusqu'à la 29e.
    const attempts = [0, 1, 2, 3, 14].map((minute) => failure(minute));
    expect(computeLoginLock(attempts, KEY, at(16))).toEqual(at(14 + LOGIN_LOCK_DURATION_MS / MINUTE));
  });

  it("5 échecs étalés sur plus de 15 minutes : pas de blocage", () => {
    const attempts = [0, 4, 8, 12, 16].map((minute) => failure(minute));
    expect(computeLoginLock(attempts, KEY, at(16))).toBeNull();
  });

  it("bloque par adresse, même depuis des IP différentes", () => {
    const attempts = [0, 1, 2, 3, 4].map((minute) => failure(minute, { ipAddress: `198.51.100.${minute}` }));
    expect(computeLoginLock(attempts, { ...KEY, ipAddress: "192.0.2.1" }, at(5))).toEqual(at(19));
  });

  it("bloque par IP, même pour des adresses différentes (y compris inconnues)", () => {
    const attempts = [0, 1, 2, 3, 4].map((minute) => failure(minute, { email: `inconnu${minute}@example.com` }));
    expect(computeLoginLock(attempts, { ...KEY, email: "admin@example.com" }, at(5))).toEqual(at(19));
  });

  it("ne bloque ni une autre adresse ni une autre IP", () => {
    const attempts = [0, 1, 2, 3, 4].map((minute) => failure(minute));
    expect(computeLoginLock(attempts, { email: "autre@example.com", ipAddress: "192.0.2.1" }, at(5))).toBeNull();
  });

  it("une connexion réussie remet le compteur à zéro", () => {
    const attempts = [failure(0), failure(1), failure(2), failure(3), success(4), failure(5)];
    expect(computeLoginLock(attempts, KEY, at(6))).toBeNull();
  });

  it("après un blocage, il faut 5 nouveaux échecs pour bloquer à nouveau", () => {
    const attempts = [...[0, 1, 2, 3, 4].map((minute) => failure(minute)), failure(20), failure(21)];
    expect(computeLoginLock(attempts, KEY, at(22))).toBeNull();
  });
});

describe("getLoginLock, recordLoginAttempt, purgeOldLoginAttempts (base)", () => {
  beforeEach(() => resetFakes());

  it("enregistre les tentatives et détecte le blocage depuis la base", async () => {
    const tx = fakeDb.client as never;
    for (const minute of [0, 1, 2, 3, 4]) {
      await recordLoginAttempt(tx, { ...KEY, succeeded: false }, at(minute));
    }
    expect(fakeDb.loginAttempts).toHaveLength(5);
    expect(fakeDb.loginAttempts[0]).toMatchObject({ ...KEY, succeeded: false, createdAt: at(0) });

    expect(await getLoginLock(tx, KEY, at(5))).toEqual(at(19));
    expect(await getLoginLock(tx, KEY, at(19))).toBeNull();
  });

  it("purge les tentatives de plus de 30 jours, et seulement celles-là", async () => {
    const tx = fakeDb.client as never;
    const day = 24 * 60;
    await recordLoginAttempt(tx, { ...KEY, succeeded: false }, at(-31 * day));
    await recordLoginAttempt(tx, { ...KEY, succeeded: true }, at(-30 * day - 1));
    await recordLoginAttempt(tx, { ...KEY, succeeded: false }, at(-29 * day));

    expect(await purgeOldLoginAttempts(tx, START)).toBe(2);
    expect(fakeDb.loginAttempts.map((attempt) => attempt.createdAt)).toEqual([at(-29 * day)]);
  });
});

describe("clientIpAddress", () => {
  it("prend la première adresse de X-Forwarded-For", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "x-real-ip": "10.0.0.2" });
    expect(clientIpAddress(headers)).toBe("203.0.113.7");
  });

  it("se rabat sur X-Real-IP, puis sur une valeur fixe", () => {
    expect(clientIpAddress(new Headers({ "x-real-ip": " 198.51.100.4 " }))).toBe("198.51.100.4");
    expect(clientIpAddress(new Headers())).toBe(UNKNOWN_IP_ADDRESS);
  });

  it("tronque une valeur anormalement longue", () => {
    expect(clientIpAddress(new Headers({ "x-forwarded-for": "9".repeat(500) }))).toHaveLength(64);
  });
});
