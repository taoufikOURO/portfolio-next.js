import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyEmail } from "@/lib/auth/account";
import { createSession } from "@/lib/auth/session";
import { generateSessionToken, signSessionToken } from "@/lib/auth/session-cookie";
import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";
import {
  fakeDb,
  fakeId,
  fakeRequest,
  mailbox,
  RedirectError,
  resetFakes,
  revalidatedPaths,
  TEST_SESSION_SECRET,
} from "@/test/fakes";

import { logout, resendVerification } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));
vi.mock("@/lib/mail/send", async () => (await import("@/test/fakes")).fakeMail);

let adminId: string;

beforeEach(() => {
  resetFakes();
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: null });
});

async function callLogout(): Promise<string> {
  try {
    await logout();
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("logout aurait dû rediriger.");
}

describe("logout", () => {
  it("supprime la session en base, efface le cookie et renvoie à la connexion", async () => {
    const { cookieValue } = await createSession(adminId);
    const other = await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);

    expect(await callLogout()).toBe("/admin/connexion");

    expect(fakeDb.sessions.map((session) => session.id)).toEqual([other.session.id]);
    expect(fakeRequest.setCookies).toEqual([
      {
        name: "admin_session",
        value: "",
        options: expect.objectContaining({ path: "/admin", maxAge: 0, httpOnly: true, sameSite: "strict" }),
      },
    ]);
  });

  it("appel direct sans cookie : refusé (redirection), rien n'est modifié", async () => {
    await createSession(adminId);

    expect(await callLogout()).toBe("/admin/connexion");
    expect(fakeDb.sessions).toHaveLength(1);
    expect(fakeRequest.setCookies).toHaveLength(0);
  });

  it("cookie bien signé mais session révoquée (proxy contourné) : refusé, rien n'est modifié", async () => {
    await createSession(adminId);
    // Signature valide : `proxy.ts` laisserait passer ce cookie.
    fakeRequest.cookies.set("admin_session", signSessionToken(generateSessionToken(), TEST_SESSION_SECRET));

    expect(await callLogout()).toBe("/admin/connexion");
    expect(fakeDb.sessions).toHaveLength(1);
    expect(fakeRequest.setCookies).toHaveLength(0);
  });
});

describe("resendVerification (« Renvoyer le lien » de la bannière)", () => {
  async function signIn() {
    const { cookieValue } = await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);
  }

  it("envoie un nouveau lien à l'adresse du compte, qui la valide", async () => {
    await signIn();

    expect(await resendVerification()).toEqual({
      ok: true,
      message: ACCOUNT_MESSAGES.verificationSent,
      fieldErrors: {},
    });
    expect(mailbox.sent).toEqual([
      { type: "email-verification", to: "admin@example.com", token: expect.any(String) },
    ]);

    const [mail] = mailbox.sent;
    if (mail.type !== "email-verification") throw new Error("Lien absent.");
    expect(await verifyEmail(mail.token)).toEqual({ status: "verified", email: "admin@example.com" });
  });

  it("deuxième clic dans la minute : refusé avec un message, aucun envoi", async () => {
    await signIn();
    await resendVerification();
    expect(await resendVerification()).toEqual({
      ok: false,
      message: ACCOUNT_MESSAGES.verificationCooldown,
      fieldErrors: {},
    });
    expect(mailbox.sent).toHaveLength(1);
  });

  it("adresse déjà validée : rien n'est envoyé, l'affichage est rafraîchi (la bannière disparaît)", async () => {
    fakeDb.admins[0].emailVerifiedAt = new Date();
    await signIn();
    expect(await resendVerification()).toMatchObject({ ok: true, message: ACCOUNT_MESSAGES.alreadyVerified });
    expect(mailbox.sent).toHaveLength(0);
    expect(revalidatedPaths).toEqual(["/admin (layout)"]);
  });

  it("échec de l'envoi : message d'erreur explicite", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await signIn();
    mailbox.failNext = true;
    expect(await resendVerification()).toMatchObject({ ok: false, message: ACCOUNT_MESSAGES.mailFailed });
    errors.mockRestore();
  });

  it("sans session valide : refusé (redirection), aucun lien créé", async () => {
    let url: string | undefined;
    try {
      await resendVerification();
    } catch (error) {
      if (error instanceof RedirectError) url = error.url;
      else throw error;
    }
    expect(url).toBe("/admin/connexion");
    expect(fakeDb.authTokens).toHaveLength(0);
  });
});
