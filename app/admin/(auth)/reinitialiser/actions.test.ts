import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { requestPasswordReset } from "@/lib/auth/account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";
import { fakeDb, fakeId, fakeRequest, RedirectError, resetFakes } from "@/test/fakes";

import { resetPasswordAction } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

const EMAIL = "admin@example.com";
const NEW_PASSWORD = "nouveau-mot-de-passe-factice";

let passwordHash: string;
let adminId: string;

beforeAll(async () => {
  passwordHash = await hashPassword("ancien-mot-de-passe-factice");
});

beforeEach(() => {
  resetFakes();
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: EMAIL, passwordHash, emailVerifiedAt: null });
});

/** Appelle l'action ; renvoie l'URL de redirection (succès) ou l'état (échec). */
async function submit(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  try {
    return await resetPasswordAction(null, data);
  } catch (error) {
    if (error instanceof RedirectError) return { redirectedTo: error.url };
    throw error;
  }
}

describe("resetPasswordAction", () => {
  it("succès : mot de passe remplacé, toutes les sessions révoquées, cookie de ce navigateur effacé", async () => {
    const { cookieValue } = await createSession(adminId);
    await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);
    const { token } = (await requestPasswordReset(EMAIL))!;

    const result = await submit({ token, newPassword: NEW_PASSWORD, confirmation: NEW_PASSWORD });

    // Retour à la connexion, qui affiche le succès.
    expect(result).toEqual({ redirectedTo: "/admin/connexion?resultat=mot-de-passe-reinitialise" });
    expect(await verifyPassword(NEW_PASSWORD, fakeDb.admins[0].passwordHash)).toBe(true);
    // Pas de session conservée : l'action ne le précise pas (personne n'est forcément connecté).
    expect(fakeDb.sessions).toHaveLength(0);
    expect(fakeRequest.setCookies).toEqual([
      { name: "admin_session", value: "", options: expect.objectContaining({ maxAge: 0, path: "/admin" }) },
    ]);
  });

  it("lien déjà utilisé : refusé avec un message explicite", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;
    await submit({ token, newPassword: NEW_PASSWORD, confirmation: NEW_PASSWORD });

    const second = await submit({ token, newPassword: "un-autre-mot-de-passe", confirmation: "un-autre-mot-de-passe" });
    expect(second).toMatchObject({ ok: false, message: ACCOUNT_MESSAGES.tokenUsed });
    expect(await verifyPassword(NEW_PASSWORD, fakeDb.admins[0].passwordHash)).toBe(true);
  });

  it("lien modifié ou mal formé : refusé sans toucher au mot de passe", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    for (const value of [tampered, "abc"]) {
      const state = await submit({ token: value, newPassword: NEW_PASSWORD, confirmation: NEW_PASSWORD });
      expect(state).toMatchObject({ ok: false, message: ACCOUNT_MESSAGES.tokenInvalid });
    }
    expect(fakeDb.admins[0].passwordHash).toBe(passwordHash);
  });

  it("mot de passe trop court ou confirmation différente : erreurs par champ, lien intact", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;

    expect(await submit({ token, newPassword: "court", confirmation: "court" })).toMatchObject({
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: { newPassword: ACCOUNT_MESSAGES.newPasswordTooShort },
    });
    expect(await submit({ token, newPassword: NEW_PASSWORD, confirmation: `${NEW_PASSWORD}x` })).toMatchObject({
      fieldErrors: { confirmation: ACCOUNT_MESSAGES.confirmationMismatch },
    });
    expect(fakeDb.authTokens[0].usedAt).toBeNull();
  });
});
