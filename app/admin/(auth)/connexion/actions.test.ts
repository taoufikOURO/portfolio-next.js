import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { readSignedSessionToken, hashSessionToken } from "@/lib/auth/session-cookie";
import { LOGIN_MESSAGES } from "@/lib/validation/auth";
import {
  fakeDb,
  fakeId,
  fakeRequest,
  RedirectError,
  resetFakes,
  testEnv,
  TEST_SESSION_SECRET,
} from "@/test/fakes";

import { login } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

const EMAIL = "admin@example.com";
const PASSWORD = "mot-de-passe-factice-de-test";

let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  resetFakes();
  fakeDb.admins.push({ id: fakeId(), email: EMAIL, passwordHash, emailVerifiedAt: null });
  fakeRequest.headers = new Headers({
    "x-forwarded-for": "203.0.113.7",
    "user-agent": "Navigateur de test",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

/** Appelle l'action ; renvoie l'URL de redirection, ou l'état renvoyé. */
async function submit(fields: Record<string, string>) {
  try {
    return { state: await login(null, form(fields)) };
  } catch (error) {
    if (error instanceof RedirectError) return { redirectedTo: error.url };
    throw error;
  }
}

describe("login : succès", () => {
  it("ouvre une session, pose le cookie et redirige vers /admin", async () => {
    const result = await submit({ email: EMAIL, password: PASSWORD });

    expect(result).toEqual({ redirectedTo: "/admin" });
    expect(fakeDb.sessions).toHaveLength(1);
    expect(fakeDb.sessions[0]).toMatchObject({ ipAddress: "203.0.113.7", userAgent: "Navigateur de test" });

    expect(fakeRequest.setCookies).toHaveLength(1);
    const [cookie] = fakeRequest.setCookies;
    expect(cookie.name).toBe("admin_session");
    expect(cookie.options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/admin",
      maxAge: 30 * 24 * 60 * 60,
    });
    // Le cookie porte un jeton signé dont seul le hash est en base.
    const token = readSignedSessionToken(cookie.value, TEST_SESSION_SECRET);
    expect(token).not.toBeNull();
    expect(fakeDb.sessions[0].tokenHash).toBe(hashSessionToken(token!));
  });

  it("cookie Secure en production", async () => {
    testEnv.APP_ENV = "production";
    await submit({ email: EMAIL, password: PASSWORD });
    expect(fakeRequest.setCookies[0].options).toMatchObject({ secure: true, httpOnly: true, sameSite: "strict" });
  });

  it("accepte l'adresse saisie avec des majuscules et des espaces", async () => {
    expect(await submit({ email: "  ADMIN@Example.com ", password: PASSWORD })).toEqual({
      redirectedTo: "/admin",
    });
    expect(fakeDb.loginAttempts[0].email).toBe(EMAIL);
  });
});

describe("login : refus", () => {
  it("saisie invalide : erreurs par champ, aucun accès à la base", async () => {
    const result = await submit({ email: "pas-une-adresse", password: "" });
    expect(result).toEqual({
      state: {
        ok: false,
        message: LOGIN_MESSAGES.formInvalid,
        fieldErrors: {
          email: LOGIN_MESSAGES.emailInvalid,
          password: LOGIN_MESSAGES.passwordRequired,
        },
        values: { email: "pas-une-adresse" },
      },
    });
    expect(fakeDb.loginAttempts).toHaveLength(0);
    expect(fakeDb.calls.executeRaw).toHaveLength(0);
  });

  it("message neutre : identique pour une adresse inconnue et un mauvais mot de passe", async () => {
    const wrongPassword = await submit({ email: EMAIL, password: "pas-le-bon-mot" });
    const unknownEmail = await submit({ email: EMAIL.replace("admin", "inconnu"), password: PASSWORD });

    const expected = {
      ok: false,
      message: "Adresse e-mail ou mot de passe incorrect.",
      fieldErrors: {},
    };
    expect(wrongPassword.state).toMatchObject(expected);
    expect(unknownEmail.state).toMatchObject(expected);
    // Seule différence : l'adresse saisie, renvoyée pour réafficher le champ.
    expect({ ...wrongPassword.state, values: null }).toEqual({ ...unknownEmail.state, values: null });
    expect(fakeRequest.setCookies).toHaveLength(0);
    expect(fakeDb.sessions).toHaveLength(0);
  });

  it("6e tentative après 5 échecs : refus pendant 15 minutes, même avec le bon mot de passe", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submit({ email: EMAIL, password: "mauvais" })).state?.message).toBe(
        LOGIN_MESSAGES.invalidCredentials,
      );
    }
    const sixth = await submit({ email: EMAIL, password: PASSWORD });
    expect(sixth.state).toMatchObject({
      ok: false,
      message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    });
    expect(fakeDb.sessions).toHaveLength(0);
    expect(fakeRequest.setCookies).toHaveLength(0);
  });

  it("le message de blocage est le même pour une adresse inconnue", async () => {
    const unknown = "inconnu@example.com";
    for (let attempt = 0; attempt < 5; attempt += 1) await submit({ email: unknown, password: "mauvais" });
    // Autre IP : seul le blocage par adresse s'applique.
    fakeRequest.headers = new Headers({ "x-forwarded-for": "198.51.100.1" });
    expect((await submit({ email: unknown, password: "mauvais" })).state?.message).toBe(
      "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    );
  });

  it("erreur inattendue : message générique, journal sans adresse ni mot de passe", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fakeDb.client, "$transaction").mockRejectedValueOnce(
      new Error(`échec de connexion pour ${EMAIL} avec ${PASSWORD}`),
    );

    const result = await submit({ email: EMAIL, password: PASSWORD });
    expect(result.state).toMatchObject({ ok: false, message: LOGIN_MESSAGES.unexpected });

    const logged = consoleError.mock.calls.flat().join(" ");
    expect(logged).toContain("erreur inattendue");
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain(PASSWORD);
  });
});
