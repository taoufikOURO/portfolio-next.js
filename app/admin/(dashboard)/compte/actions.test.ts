import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyEmail } from "@/lib/auth/account";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  ACCOUNT_MESSAGES,
  emailChangeRequestedMessage,
  otherSessionsRevokedMessage,
} from "@/lib/validation/auth";
import { fakeDb, fakeId, fakeRequest, mailbox, RedirectError, resetFakes } from "@/test/fakes";

import { changePasswordAction, requestEmailChangeAction, revokeOtherSessionsAction } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("@/lib/mail/send", async () => (await import("@/test/fakes")).fakeMail);
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

const EMAIL = "admin@example.com";
const NEW_EMAIL = "nouvelle@example.org";
const PASSWORD = "mot-de-passe-actuel-factice";
const NEW_PASSWORD = "nouveau-mot-de-passe-factice";

let passwordHash: string;
let adminId: string;
let currentSessionId: string;
let otherSessionId: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(async () => {
  resetFakes();
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: EMAIL, passwordHash, emailVerifiedAt: new Date() });
  const current = await createSession(adminId);
  const other = await createSession(adminId);
  currentSessionId = current.session.id;
  otherSessionId = other.session.id;
  fakeRequest.cookies.set("admin_session", current.cookieValue);
  fakeRequest.headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("L'action aurait dû rediriger.");
}

describe("requestEmailChangeAction", () => {
  it("envoie le lien à la nouvelle adresse et la notification à l'ancienne, sans changer l'adresse", async () => {
    const state = await requestEmailChangeAction(null, form({ newEmail: NEW_EMAIL, currentPassword: PASSWORD }));

    expect(state).toEqual({ ok: true, message: emailChangeRequestedMessage(NEW_EMAIL), fieldErrors: {} });
    expect(mailbox.sent).toEqual([
      { type: "email-verification", to: NEW_EMAIL, token: expect.any(String) },
      { type: "email-change-notice", to: EMAIL, newEmail: NEW_EMAIL },
    ]);
    expect(fakeDb.admins[0].email).toBe(EMAIL);

    // L'adresse ne change qu'au clic sur le lien reçu à la nouvelle adresse.
    const [verification] = mailbox.sent;
    if (verification.type !== "email-verification") throw new Error("Lien absent.");
    await verifyEmail(verification.token);
    expect(fakeDb.admins[0].email).toBe(NEW_EMAIL);
  });

  it("mauvais mot de passe actuel : erreur sur le champ, aucun e-mail, adresse conservée dans le formulaire", async () => {
    const state = await requestEmailChangeAction(
      null,
      form({ newEmail: NEW_EMAIL, currentPassword: "mauvais-mot-de-passe" }),
    );
    expect(state).toEqual({
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: { currentPassword: ACCOUNT_MESSAGES.currentPasswordWrong },
      values: { newEmail: NEW_EMAIL },
    });
    expect(mailbox.sent).toHaveLength(0);
    expect(fakeDb.authTokens).toHaveLength(0);
  });

  it("mot de passe actuel absent : refusé par le schéma", async () => {
    const state = await requestEmailChangeAction(null, form({ newEmail: NEW_EMAIL, currentPassword: "" }));
    expect(state?.fieldErrors).toEqual({ currentPassword: ACCOUNT_MESSAGES.currentPasswordRequired });
  });

  it("adresse identique à l'actuelle : erreur sur le champ", async () => {
    const state = await requestEmailChangeAction(null, form({ newEmail: " Admin@Example.com", currentPassword: PASSWORD }));
    expect(state?.fieldErrors).toEqual({ newEmail: ACCOUNT_MESSAGES.newEmailSameAsCurrent });
    expect(mailbox.sent).toHaveLength(0);
  });

  it("échec d'un envoi : message d'erreur explicite", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    mailbox.failNext = true;
    const state = await requestEmailChangeAction(null, form({ newEmail: NEW_EMAIL, currentPassword: PASSWORD }));
    expect(state).toMatchObject({ ok: false, message: ACCOUNT_MESSAGES.mailFailed });
    errors.mockRestore();
  });

  it("sans session valide : refusé avant toute écriture", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(requestEmailChangeAction(null, form({ newEmail: NEW_EMAIL, currentPassword: PASSWORD })))).toBe(
      "/admin/connexion",
    );
    expect(fakeDb.authTokens).toHaveLength(0);
    expect(mailbox.sent).toHaveLength(0);
  });
});

describe("changePasswordAction", () => {
  const valid = { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmation: NEW_PASSWORD };

  it("succès : autres sessions révoquées, session courante conservée", async () => {
    const state = await changePasswordAction(null, form(valid));

    expect(state).toEqual({ ok: true, message: ACCOUNT_MESSAGES.passwordChanged, fieldErrors: {} });
    expect(fakeDb.sessions.map((session) => session.id)).toEqual([currentSessionId]);
    expect(fakeDb.sessions.some((session) => session.id === otherSessionId)).toBe(false);
    expect(await verifyPassword(NEW_PASSWORD, fakeDb.admins[0].passwordHash)).toBe(true);
    // Le cookie de la session courante n'est pas touché.
    expect(fakeRequest.setCookies).toHaveLength(0);
  });

  it("refuse un mauvais mot de passe actuel : rien ne change", async () => {
    const state = await changePasswordAction(null, form({ ...valid, currentPassword: "mauvais-mot-de-passe" }));

    expect(state).toEqual({
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: { currentPassword: ACCOUNT_MESSAGES.currentPasswordWrong },
    });
    expect(fakeDb.admins[0].passwordHash).toBe(passwordHash);
    expect(fakeDb.sessions).toHaveLength(2);
  });

  it("nouveau mot de passe identique, trop court ou mal confirmé : erreurs par champ", async () => {
    expect((await changePasswordAction(null, form({ ...valid, newPassword: PASSWORD, confirmation: PASSWORD })))?.fieldErrors).toEqual({
      newPassword: ACCOUNT_MESSAGES.newPasswordSameAsCurrent,
    });
    expect((await changePasswordAction(null, form({ ...valid, newPassword: "court", confirmation: "court" })))?.fieldErrors).toEqual({
      newPassword: ACCOUNT_MESSAGES.newPasswordTooShort,
    });
    expect((await changePasswordAction(null, form({ ...valid, confirmation: "autre-chose-encore" })))?.fieldErrors).toEqual({
      confirmation: ACCOUNT_MESSAGES.confirmationMismatch,
    });
    expect(fakeDb.admins[0].passwordHash).toBe(passwordHash);
  });

  it("sans session valide : refusé avant toute écriture", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(changePasswordAction(null, form(valid)))).toBe("/admin/connexion");
    expect(fakeDb.admins[0].passwordHash).toBe(passwordHash);
  });
});

describe("revokeOtherSessionsAction", () => {
  it("ferme toutes les autres sessions, garde celle-ci", async () => {
    expect(await revokeOtherSessionsAction()).toEqual({
      ok: true,
      message: otherSessionsRevokedMessage(1),
      fieldErrors: {},
    });
    expect(fakeDb.sessions.map((session) => session.id)).toEqual([currentSessionId]);
    expect(await revokeOtherSessionsAction()).toMatchObject({ message: ACCOUNT_MESSAGES.noOtherSession });
  });

  it("sans session valide : refusé, aucune session supprimée", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(revokeOtherSessionsAction())).toBe("/admin/connexion");
    expect(fakeDb.sessions).toHaveLength(2);
  });
});
