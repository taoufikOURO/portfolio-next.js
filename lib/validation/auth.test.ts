import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  ACCOUNT_MESSAGES,
  changeEmailSchema,
  changePasswordSchema,
  firstFieldErrors,
  forgotPasswordSchema,
  isWellFormedAuthToken,
  LOGIN_MESSAGES,
  loginFieldErrors,
  loginSchema,
  lockedMessage,
  normalizeEmail,
  otherSessionsRevokedMessage,
  passwordLockedMessage,
  resetPasswordSchema,
} from "./auth";

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

// ---------------------------------------------------------------------------
// Étape 8
// ---------------------------------------------------------------------------

const TOKEN = "a".repeat(43);
const TWELVE = "x".repeat(12);

function errorsOf(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("Le schéma aurait dû refuser cette saisie.");
  return firstFieldErrors(result.error);
}

describe("isWellFormedAuthToken", () => {
  it("43 caractères base64url, rien d'autre", () => {
    expect(isWellFormedAuthToken(TOKEN)).toBe(true);
    expect(isWellFormedAuthToken("a".repeat(42))).toBe(false);
    expect(isWellFormedAuthToken("a".repeat(42) + "+")).toBe(false);
    expect(isWellFormedAuthToken(undefined)).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("normalise l'adresse comme à la connexion", () => {
    expect(forgotPasswordSchema.parse({ email: " Admin@Example.com " })).toEqual({ email: "admin@example.com" });
  });
});

describe("resetPasswordSchema", () => {
  it("12 caractères au moins, confirmation identique, jeton bien formé", () => {
    expect(resetPasswordSchema.safeParse({ token: TOKEN, newPassword: TWELVE, confirmation: TWELVE }).success).toBe(true);
    const eleven = "x".repeat(11);
    expect(errorsOf(resetPasswordSchema, { token: TOKEN, newPassword: eleven, confirmation: eleven })).toEqual({
      newPassword: ACCOUNT_MESSAGES.newPasswordTooShort,
    });
    expect(errorsOf(resetPasswordSchema, { token: TOKEN, newPassword: TWELVE, confirmation: "y".repeat(12) })).toEqual({
      confirmation: ACCOUNT_MESSAGES.confirmationMismatch,
    });
    expect(errorsOf(resetPasswordSchema, { token: "abc", newPassword: TWELVE, confirmation: TWELVE })).toEqual({
      token: ACCOUNT_MESSAGES.tokenInvalid,
    });
  });

  it("ne rogne pas le nouveau mot de passe", () => {
    const password = "  douze caractères  ";
    expect(resetPasswordSchema.parse({ token: TOKEN, newPassword: password, confirmation: password }).newPassword).toBe(
      password,
    );
  });

  it("champs vides : messages en français", () => {
    expect(errorsOf(resetPasswordSchema, { token: TOKEN, newPassword: "", confirmation: "" })).toEqual({
      newPassword: ACCOUNT_MESSAGES.newPasswordRequired,
      confirmation: ACCOUNT_MESSAGES.confirmationRequired,
    });
  });
});

describe("changePasswordSchema", () => {
  const valid = { currentPassword: "ancien", newPassword: "nouveau-mot-de-passe", confirmation: "nouveau-mot-de-passe" };

  it("exige le mot de passe actuel", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    expect(errorsOf(changePasswordSchema, { ...valid, currentPassword: "" })).toEqual({
      currentPassword: ACCOUNT_MESSAGES.currentPasswordRequired,
    });
  });

  it("refuse un nouveau mot de passe identique à l'actuel", () => {
    const same = valid.newPassword;
    expect(errorsOf(changePasswordSchema, { currentPassword: same, newPassword: same, confirmation: same })).toEqual({
      newPassword: ACCOUNT_MESSAGES.newPasswordSameAsCurrent,
    });
  });
});

describe("changeEmailSchema", () => {
  it("exige la nouvelle adresse et le mot de passe actuel", () => {
    expect(changeEmailSchema.parse({ newEmail: " Nouvelle@Example.org", currentPassword: "x" })).toEqual({
      newEmail: "nouvelle@example.org",
      currentPassword: "x",
    });
    expect(errorsOf(changeEmailSchema, { newEmail: "", currentPassword: "" })).toEqual({
      newEmail: ACCOUNT_MESSAGES.newEmailRequired,
      currentPassword: ACCOUNT_MESSAGES.currentPasswordRequired,
    });
  });
});

describe("messages de l'étape 8", () => {
  it("sessions fermées, au singulier ou au pluriel", () => {
    expect(otherSessionsRevokedMessage(0)).toBe(ACCOUNT_MESSAGES.noOtherSession);
    expect(otherSessionsRevokedMessage(1)).toBe("1 autre session a été fermée.");
    expect(otherSessionsRevokedMessage(3)).toBe("3 autres sessions ont été fermées.");
  });

  it("blocage après des mots de passe incorrects", () => {
    expect(passwordLockedMessage(15)).toBe(
      "Trop de tentatives avec un mot de passe incorrect. Réessayez dans 15 minutes.",
    );
  });
});
