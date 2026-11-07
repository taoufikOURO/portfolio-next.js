import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import {
  AUTH_TOKEN_RESEND_COOLDOWN_MS,
  AUTH_TOKEN_RETENTION_MS,
  AUTH_TOKEN_TTL_MS,
  consumeAuthToken,
  generateAuthToken,
  hashAuthToken,
  inspectAuthToken,
  issueAuthToken,
  issuedRecently,
} from "./tokens";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const START = new Date("2026-11-06T10:00:00.000Z");
const client = fakeDb.client as never;

function at(offsetMs: number): Date {
  return new Date(START.getTime() + offsetMs);
}

let adminId: string;

beforeEach(() => {
  resetFakes();
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: null });
});

afterEach(() => {
  vi.useRealTimers();
});

function issueReset(now = START) {
  return issueAuthToken(
    client,
    { adminId, type: "PASSWORD_RESET", targetEmail: "admin@example.com" },
    now,
  );
}

function issueVerification(now = START, targetEmail = "admin@example.com") {
  return issueAuthToken(
    client,
    { adminId, type: "EMAIL_VERIFICATION", targetEmail, supersede: { targetEmail } },
    now,
  );
}

/** Change un caractère du jeton (reste bien formé). */
function tamper(token: string): string {
  const last = token.at(-1) === "A" ? "B" : "A";
  return `${token.slice(0, -1)}${last}`;
}

describe("generateAuthToken / hashAuthToken", () => {
  it("32 octets aléatoires en base64url (43 caractères), différents à chaque appel", () => {
    const tokens = new Set(Array.from({ length: 50 }, generateAuthToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hash SHA-256 en hexadécimal, stable", () => {
    expect(hashAuthToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("issueAuthToken", () => {
  it("n'enregistre que le hash : le jeton en clair n'est nulle part en base", async () => {
    const { token } = await issueReset();

    expect(fakeDb.authTokens).toHaveLength(1);
    const [row] = fakeDb.authTokens;
    expect(row.tokenHash).toBe(hashAuthToken(token));
    expect(JSON.stringify(fakeDb.authTokens)).not.toContain(token);
    expect(row).toMatchObject({ adminId, type: "PASSWORD_RESET", usedAt: null, createdAt: START });
  });

  it("durées : 24 heures pour la validation d'adresse, 1 heure pour la réinitialisation", async () => {
    expect(AUTH_TOKEN_TTL_MS).toEqual({ EMAIL_VERIFICATION: 24 * HOUR, PASSWORD_RESET: HOUR });
    expect((await issueVerification()).expiresAt).toEqual(at(24 * HOUR));
    expect((await issueReset()).expiresAt).toEqual(at(HOUR));
  });

  it("un nouveau lien remplace le précédent inutilisé de même nature (l'ancien est refusé)", async () => {
    const first = await issueReset();
    const second = await issueReset(at(5 * MINUTE));

    expect(fakeDb.authTokens).toHaveLength(1);
    expect((await inspectAuthToken(client, first.token, "PASSWORD_RESET", at(6 * MINUTE))).status).toBe("invalid");
    expect((await inspectAuthToken(client, second.token, "PASSWORD_RESET", at(6 * MINUTE))).status).toBe("valid");
  });

  it("ne remplace pas les jetons d'une autre nature", async () => {
    await issueVerification();
    await issueReset();
    await issueVerification(START, "nouvelle@example.com");
    expect(fakeDb.authTokens.map((row) => [row.type, row.targetEmail])).toEqual([
      ["EMAIL_VERIFICATION", "admin@example.com"],
      ["PASSWORD_RESET", "admin@example.com"],
      ["EMAIL_VERIFICATION", "nouvelle@example.com"],
    ]);
  });

  it("purge les jetons expirés depuis plus de 7 jours, garde les plus récents", async () => {
    await issueReset();
    await issueVerification();
    // Le jeton de réinitialisation a expiré à START + 1 h.
    await issueVerification(at(HOUR + AUTH_TOKEN_RETENTION_MS + 1), "autre@example.com");

    expect(fakeDb.authTokens.map((row) => row.type)).toEqual(["EMAIL_VERIFICATION", "EMAIL_VERIFICATION"]);
  });
});

describe("inspectAuthToken", () => {
  it("lien valide jusqu'à la dernière milliseconde, expiré à l'échéance", async () => {
    const { token } = await issueReset();

    const valid = await inspectAuthToken(client, token, "PASSWORD_RESET", at(HOUR - 1));
    expect(valid).toEqual({
      status: "valid",
      token: expect.objectContaining({ adminId, type: "PASSWORD_RESET", targetEmail: "admin@example.com" }),
    });
    expect((await inspectAuthToken(client, token, "PASSWORD_RESET", at(HOUR))).status).toBe("expired");
  });

  it("validation d'adresse : valable 24 heures, pas une de plus", async () => {
    const { token } = await issueVerification();
    expect((await inspectAuthToken(client, token, "EMAIL_VERIFICATION", at(24 * HOUR - 1))).status).toBe("valid");
    expect((await inspectAuthToken(client, token, "EMAIL_VERIFICATION", at(24 * HOUR))).status).toBe("expired");
  });

  it("ne consomme pas le lien (ouvrir la page ne change rien)", async () => {
    const { token } = await issueReset();
    await inspectAuthToken(client, token, "PASSWORD_RESET", START);
    await inspectAuthToken(client, token, "PASSWORD_RESET", START);
    expect(fakeDb.authTokens[0].usedAt).toBeNull();
  });

  it("lien déjà utilisé : la page l'indique (« déjà utilisé »), même avant l'échéance", async () => {
    const { token } = await issueReset();
    await consumeAuthToken(client, token, "PASSWORD_RESET", START);
    expect((await inspectAuthToken(client, token, "PASSWORD_RESET", at(MINUTE))).status).toBe("used");
  });

  it("lien modifié d'un seul caractère : refusé", async () => {
    const { token } = await issueReset();
    expect((await inspectAuthToken(client, tamper(token), "PASSWORD_RESET", START)).status).toBe("invalid");
  });

  it.each([
    ["absent", undefined],
    ["vide", ""],
    ["tronqué", "abc"],
    ["trop long", "a".repeat(44)],
    ["caractères interdits", `${"a".repeat(42)}=`],
    ["pas du texte", 42],
  ])("jeton mal formé (%s) : refusé sans requête en base", async (_label, value) => {
    expect((await inspectAuthToken(client, value, "PASSWORD_RESET", START)).status).toBe("invalid");
    expect(fakeDb.calls.authTokenFindUnique).toBe(0);
  });

  it("jeton d'un autre type : refusé comme inconnu", async () => {
    const { token } = await issueReset();
    expect((await inspectAuthToken(client, token, "EMAIL_VERIFICATION", START)).status).toBe("invalid");
  });
});

describe("consumeAuthToken", () => {
  it("usage unique : le premier usage réussit, le second est refusé", async () => {
    const { token } = await issueReset();

    expect((await consumeAuthToken(client, token, "PASSWORD_RESET", at(MINUTE))).status).toBe("valid");
    expect(fakeDb.authTokens[0].usedAt).toEqual(at(MINUTE));
    expect((await consumeAuthToken(client, token, "PASSWORD_RESET", at(2 * MINUTE))).status).toBe("used");
    expect(fakeDb.authTokens[0].usedAt).toEqual(at(MINUTE));
  });

  it("deux usages simultanés : un seul réussit", async () => {
    const { token } = await issueReset();
    const results = await Promise.all([
      consumeAuthToken(client, token, "PASSWORD_RESET", at(MINUTE)),
      consumeAuthToken(client, token, "PASSWORD_RESET", at(MINUTE)),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["used", "valid"]);
  });

  it("lien expiré : refusé et non consommé", async () => {
    const { token } = await issueReset();
    expect((await consumeAuthToken(client, token, "PASSWORD_RESET", at(HOUR))).status).toBe("expired");
    expect(fakeDb.authTokens[0].usedAt).toBeNull();
  });

  it("lien modifié : refusé, le vrai lien reste utilisable", async () => {
    const { token } = await issueReset();
    expect((await consumeAuthToken(client, tamper(token), "PASSWORD_RESET", START)).status).toBe("invalid");
    expect((await consumeAuthToken(client, token, "PASSWORD_RESET", START)).status).toBe("valid");
  });
});

describe("issuedRecently", () => {
  it("vrai pendant une minute après l'émission, faux ensuite", async () => {
    await issueReset();
    const scope = { adminId, type: "PASSWORD_RESET" as const };
    expect(AUTH_TOKEN_RESEND_COOLDOWN_MS).toBe(MINUTE);
    expect(await issuedRecently(client, scope, at(MINUTE - 1))).toBe(true);
    expect(await issuedRecently(client, scope, at(MINUTE))).toBe(false);
  });

  it("un lien déjà utilisé ne bloque pas un nouvel envoi", async () => {
    const { token } = await issueReset();
    await consumeAuthToken(client, token, "PASSWORD_RESET", START);
    expect(await issuedRecently(client, { adminId, type: "PASSWORD_RESET" }, START)).toBe(false);
  });
});
