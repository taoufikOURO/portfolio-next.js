import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  generateSessionToken,
  hashSessionToken,
  readSignedSessionToken,
  signSessionToken,
} from "./session-cookie";

const SECRET = "secret-de-session-factice-pour-les-tests-0123456789";
const OTHER_SECRET = "un-autre-secret-factice-tout-aussi-long-9876543210";

/** Remplace le caractère à `index` par un autre caractère base64url. */
function alter(value: string, index: number): string {
  const replacement = value[index] === "A" ? "B" : "A";
  return value.slice(0, index) + replacement + value.slice(index + 1);
}

describe("generateSessionToken", () => {
  it("produit 32 octets aléatoires en base64url (43 caractères)", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("ne produit jamais deux fois le même jeton", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateSessionToken));
    expect(tokens.size).toBe(200);
  });
});

describe("signSessionToken / readSignedSessionToken", () => {
  it("relit le jeton d'un cookie correctement signé", () => {
    const token = generateSessionToken();
    const cookie = signSessionToken(token, SECRET);
    expect(cookie).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
    expect(readSignedSessionToken(cookie, SECRET)).toBe(token);
  });

  it("refuse un jeton falsifié (un seul caractère modifié)", () => {
    const token = generateSessionToken();
    const cookie = signSessionToken(token, SECRET);
    for (const index of [0, 21, 42]) {
      expect(readSignedSessionToken(alter(cookie, index), SECRET)).toBeNull();
    }
  });

  it("refuse une signature falsifiée, y compris sur son dernier caractère", () => {
    const cookie = signSessionToken(generateSessionToken(), SECRET);
    for (const index of [44, 60, cookie.length - 1]) {
      expect(readSignedSessionToken(alter(cookie, index), SECRET)).toBeNull();
    }
  });

  it("refuse une signature faite avec un autre secret", () => {
    const cookie = signSessionToken(generateSessionToken(), OTHER_SECRET);
    expect(readSignedSessionToken(cookie, SECRET)).toBeNull();
  });

  it("refuse l'échange de signatures entre deux jetons", () => {
    const [tokenA] = signSessionToken(generateSessionToken(), SECRET).split(".");
    const [, signatureB] = signSessionToken(generateSessionToken(), SECRET).split(".");
    expect(readSignedSessionToken(`${tokenA}.${signatureB}`, SECRET)).toBeNull();
  });

  it.each([
    ["absent", undefined],
    ["vide", ""],
    ["jeton seul, sans signature", generateSessionToken()],
    ["deux points", `${generateSessionToken()}..${"A".repeat(43)}`],
    ["caractères hors base64url", `${"+".repeat(43)}.${"/".repeat(43)}`],
    ["trop long", `${"A".repeat(44)}.${"A".repeat(43)}`],
  ])("refuse un cookie mal formé (%s)", (_label, value) => {
    expect(readSignedSessionToken(value, SECRET)).toBeNull();
  });

  it("refuse tout cookie si le secret est absent ou vide", () => {
    const cookie = signSessionToken(generateSessionToken(), SECRET);
    expect(readSignedSessionToken(cookie, undefined)).toBeNull();
    expect(readSignedSessionToken(cookie, "")).toBeNull();
  });
});

describe("hashSessionToken", () => {
  it("renvoie le SHA-256 hexadécimal du jeton, sans le contenir", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hash);
  });
});
