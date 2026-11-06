import { describe, expect, it } from "vitest";

import {
  assertPasswordPolicy,
  hashPassword,
  PASSWORD_MIN_LENGTH,
  PasswordPolicyError,
  verifyPassword,
} from "./password";
import { isPasswordLongEnough, passwordLength } from "./password-policy";

// Valeurs factices uniquement.
const VALID = "mot-de-passe-de-test-factice";
const TOO_SHORT = "court-11car"; // 11 caractères

describe("règle de longueur", () => {
  it("fixe le minimum à 12 caractères", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });

  it("refuse 11 caractères et accepte 12", () => {
    expect(TOO_SHORT).toHaveLength(11);
    expect(isPasswordLongEnough(TOO_SHORT)).toBe(false);
    expect(isPasswordLongEnough(`${TOO_SHORT}x`)).toBe(true);
  });

  it("refuse une chaîne vide", () => {
    expect(isPasswordLongEnough("")).toBe(false);
  });

  it("compte les caractères, pas les unités UTF-16", () => {
    // 11 caractères dont un hors du plan de base (2 unités UTF-16) : 12 en `.length`.
    const elevenWithEmoji = "motdepasse\u{1F512}";
    expect(elevenWithEmoji.length).toBe(12);
    expect(passwordLength(elevenWithEmoji)).toBe(11);
    expect(isPasswordLongEnough(elevenWithEmoji)).toBe(false);
  });

  it("compte les lettres accentuées comme un caractère", () => {
    expect(passwordLength("éàèùçôîâêëïü")).toBe(12);
    expect(isPasswordLongEnough("éàèùçôîâêëïü")).toBe(true);
  });

  it("assertPasswordPolicy lève une PasswordPolicyError sans répéter le mot de passe", () => {
    expect(() => assertPasswordPolicy(VALID)).not.toThrow();

    let caught: unknown;
    try {
      assertPasswordPolicy(TOO_SHORT);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PasswordPolicyError);
    const message = (caught as Error).message;
    expect(message).toBe("Mot de passe refusé : il doit contenir au moins 12 caractères.");
    expect(message).not.toContain(TOO_SHORT);
  });
});

describe("hashPassword", () => {
  it("produit un hash argon2id au format PHC, avec les paramètres attendus", async () => {
    const passwordHash = await hashPassword(VALID);
    expect(passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
  });

  it("ne contient jamais le mot de passe en clair", async () => {
    const passwordHash = await hashPassword(VALID);
    expect(passwordHash).not.toContain(VALID);
  });

  it("utilise un sel aléatoire : deux hachages du même mot de passe diffèrent", async () => {
    const [first, second] = await Promise.all([hashPassword(VALID), hashPassword(VALID)]);
    expect(first).not.toBe(second);
  });

  it("refuse un mot de passe de moins de 12 caractères", async () => {
    await expect(hashPassword(TOO_SHORT)).rejects.toBeInstanceOf(PasswordPolicyError);
    await expect(hashPassword("")).rejects.toBeInstanceOf(PasswordPolicyError);
  });
});

describe("verifyPassword", () => {
  it("accepte le bon mot de passe", async () => {
    const passwordHash = await hashPassword(VALID);
    await expect(verifyPassword(VALID, passwordHash)).resolves.toBe(true);
  });

  it("refuse un mauvais mot de passe, même proche", async () => {
    const passwordHash = await hashPassword(VALID);
    await expect(verifyPassword(`${VALID}x`, passwordHash)).resolves.toBe(false);
    await expect(verifyPassword(VALID.toUpperCase(), passwordHash)).resolves.toBe(false);
    await expect(verifyPassword("", passwordHash)).resolves.toBe(false);
  });

  it("renvoie false pour un hash illisible, sans lever d'exception", async () => {
    await expect(verifyPassword(VALID, "pas-un-hash")).resolves.toBe(false);
    await expect(verifyPassword(VALID, "")).resolves.toBe(false);
  });
});
