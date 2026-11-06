import { describe, expect, it } from "vitest";

import { LOGIN_MESSAGES, loginFieldErrors, loginSchema, lockedMessage, normalizeEmail } from "./auth";

function errorsFor(input: unknown) {
  const result = loginSchema.safeParse(input);
  if (result.success) throw new Error("Le schéma aurait dû refuser cette saisie.");
  return loginFieldErrors(result.error);
}

describe("loginSchema", () => {
  it("met l'adresse en minuscules et retire les espaces autour (comme le seed)", () => {
    const result = loginSchema.parse({ email: "  Admin@Example.COM ", password: "x" });
    expect(result.email).toBe("admin@example.com");
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("ne rogne jamais le mot de passe", () => {
    expect(loginSchema.parse({ email: "a@example.com", password: "  avec espaces  " }).password).toBe(
      "  avec espaces  ",
    );
  });

  it("champs absents ou vides : messages en français", () => {
    expect(errorsFor({})).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    });
    expect(errorsFor({ email: "   ", password: "" })).toEqual({
      email: LOGIN_MESSAGES.emailRequired,
      password: LOGIN_MESSAGES.passwordRequired,
    });
  });

  it("refuse une adresse invalide ou trop longue", () => {
    expect(errorsFor({ email: "pas-une-adresse", password: "x" }).email).toBe(LOGIN_MESSAGES.emailInvalid);
    const tooLong = `${"a".repeat(250)}@example.com`;
    expect(errorsFor({ email: tooLong, password: "x" }).email).toBe(LOGIN_MESSAGES.emailTooLong);
  });

  it("refuse un mot de passe de plus de 1 024 caractères", () => {
    expect(errorsFor({ email: "a@example.com", password: "x".repeat(1025) }).password).toBe(
      LOGIN_MESSAGES.passwordTooLong,
    );
  });

  it("n'exige pas 12 caractères à la connexion (règle des nouveaux mots de passe seulement)", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "court" }).success).toBe(true);
  });

  it("refuse les valeurs qui ne sont pas du texte (fichier envoyé à la place)", () => {
    const errors = errorsFor({ email: new Blob(["x"]), password: null });
    expect(errors.email).toBe(LOGIN_MESSAGES.emailRequired);
    expect(errors.password).toBe(LOGIN_MESSAGES.passwordRequired);
  });
});

describe("messages", () => {
  it("message neutre unique pour les identifiants refusés", () => {
    expect(LOGIN_MESSAGES.invalidCredentials).toBe("Adresse e-mail ou mot de passe incorrect.");
  });

  it("message de blocage au singulier ou au pluriel", () => {
    expect(lockedMessage(15)).toBe("Trop de tentatives de connexion. Réessayez dans 15 minutes.");
    expect(lockedMessage(1)).toBe("Trop de tentatives de connexion. Réessayez dans 1 minute.");
  });
});
