import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, resetFakes } from "@/test/fakes";

import {
  changePassword,
  getPendingEmailChange,
  requestEmailChange,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "./account";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const START = new Date("2026-11-06T10:00:00.000Z");
const EMAIL = "admin@example.com";
const NEW_EMAIL = "nouvelle@example.org";
const PASSWORD = "mot-de-passe-actuel-factice";
const NEW_PASSWORD = "nouveau-mot-de-passe-factice";
const IP = "203.0.113.7";

let passwordHash: string;
let adminId: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  resetFakes();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: EMAIL, passwordHash, emailVerifiedAt: null });
});

afterEach(() => {
  vi.useRealTimers();
});

function admin() {
  return fakeDb.admins[0];
}

function later(offsetMs: number) {
  vi.setSystemTime(new Date(START.getTime() + offsetMs));
}

function emailChange(overrides: Partial<Parameters<typeof requestEmailChange>[0]> = {}) {
  return requestEmailChange({
    adminId,
    currentEmail: EMAIL,
    newEmail: NEW_EMAIL,
    currentPassword: PASSWORD,
    ipAddress: IP,
    ...overrides,
  });
}

describe("requestPasswordReset (mot de passe oublié)", () => {
  it("adresse inconnue : rien à envoyer, rien d'écrit", async () => {
    expect(await requestPasswordReset("inconnue@example.com")).toBeNull();
    expect(fakeDb.authTokens).toHaveLength(0);
  });

  it("adresse connue : un lien d'une heure, envoyé à l'adresse du compte", async () => {
    const mail = await requestPasswordReset(EMAIL);
    expect(mail).toEqual({ to: EMAIL, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
    expect(fakeDb.authTokens).toEqual([
      expect.objectContaining({ type: "PASSWORD_RESET", targetEmail: EMAIL, expiresAt: new Date(START.getTime() + HOUR) }),
    ]);
  });

  it("au plus un envoi par minute (les demandes suivantes ne font rien)", async () => {
    const first = await requestPasswordReset(EMAIL);
    later(MINUTE - 1);
    expect(await requestPasswordReset(EMAIL)).toBeNull();
    later(MINUTE);
    const second = await requestPasswordReset(EMAIL);
    expect(second).not.toBeNull();
    // Le nouveau lien remplace l'ancien.
    expect(await resetPassword(first!.token, NEW_PASSWORD)).toEqual({ status: "invalid" });
  });
});

describe("resetPassword (lien de réinitialisation)", () => {
  it("remplace le mot de passe et révoque toutes les sessions", async () => {
    await createSession(adminId);
    await createSession(adminId);
    const { token } = (await requestPasswordReset(EMAIL))!;

    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({ status: "success", revokedSessions: 2 });
    expect(await verifyPassword(NEW_PASSWORD, admin().passwordHash)).toBe(true);
    expect(await verifyPassword(PASSWORD, admin().passwordHash)).toBe(false);
    expect(fakeDb.sessions).toHaveLength(0);
  });

  it("usage unique : le même lien est refusé ensuite, le mot de passe ne change plus", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;
    await resetPassword(token, NEW_PASSWORD);
    const hashAfterFirstUse = admin().passwordHash;

    expect(await resetPassword(token, "un-autre-mot-de-passe")).toEqual({ status: "used" });
    expect(admin().passwordHash).toBe(hashAfterFirstUse);
  });

  it("expiré après une heure : refusé, mot de passe inchangé", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;
    later(HOUR);
    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({ status: "expired" });
    expect(admin().passwordHash).toBe(passwordHash);
  });

  it("lien modifié : refusé, mot de passe inchangé", async () => {
    const { token } = (await requestPasswordReset(EMAIL))!;
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(await resetPassword(tampered, NEW_PASSWORD)).toEqual({ status: "invalid" });
    expect(admin().passwordHash).toBe(passwordHash);
    expect(fakeDb.authTokens[0].usedAt).toBeNull();
  });

  it("lien envoyé à une ancienne adresse : refusé (supprimé quand l'adresse change)", async () => {
    const reset = (await requestPasswordReset(EMAIL))!;
    const change = await emailChange();
    if (change.status !== "issued") throw new Error("Demande refusée.");
    await verifyEmail(change.token);

    expect(await resetPassword(reset.token, NEW_PASSWORD)).toEqual({ status: "invalid" });
    expect(admin().passwordHash).toBe(passwordHash);
  });
});

describe("validation de l'adresse actuelle", () => {
  it("le lien marque l'adresse validée, une seule fois", async () => {
    const sent = await resendEmailVerification(adminId);
    if (sent.status !== "issued") throw new Error("Lien non émis.");
    expect(sent.to).toBe(EMAIL);

    later(MINUTE);
    expect(await verifyEmail(sent.token)).toEqual({ status: "verified", email: EMAIL });
    expect(admin().emailVerifiedAt).toEqual(new Date(START.getTime() + MINUTE));
    expect(await verifyEmail(sent.token)).toEqual({ status: "used" });
  });

  it("expiré après 24 heures : refusé, adresse toujours non validée", async () => {
    const sent = await resendEmailVerification(adminId);
    if (sent.status !== "issued") throw new Error("Lien non émis.");
    later(24 * HOUR);
    expect(await verifyEmail(sent.token)).toEqual({ status: "expired" });
    expect(admin().emailVerifiedAt).toBeNull();
  });

  it("« Renvoyer le lien » : au plus un par minute, le nouveau remplace l'ancien", async () => {
    const first = await resendEmailVerification(adminId);
    expect(await resendEmailVerification(adminId)).toEqual({ status: "cooldown" });
    later(MINUTE);
    const second = await resendEmailVerification(adminId);
    if (first.status !== "issued" || second.status !== "issued") throw new Error("Lien non émis.");

    expect(await verifyEmail(first.token)).toEqual({ status: "invalid" });
    expect(await verifyEmail(second.token)).toEqual({ status: "verified", email: EMAIL });
  });

  it("adresse déjà validée : rien n'est envoyé", async () => {
    admin().emailVerifiedAt = START;
    expect(await resendEmailVerification(adminId)).toEqual({ status: "already-verified" });
    expect(fakeDb.authTokens).toHaveLength(0);
  });
});

describe("changement d'adresse", () => {
  it("la nouvelle adresse n'est pas prise en compte avant le clic sur le lien", async () => {
    admin().emailVerifiedAt = START;
    const result = await emailChange();

    expect(result).toEqual({
      status: "issued",
      token: expect.any(String),
      newEmail: NEW_EMAIL,
      previousEmail: EMAIL,
    });
    expect(admin().email).toBe(EMAIL);
    expect(admin().emailVerifiedAt).toEqual(START);
    expect(fakeDb.authTokens).toEqual([
      expect.objectContaining({ type: "EMAIL_VERIFICATION", targetEmail: NEW_EMAIL, usedAt: null }),
    ]);
    expect(await getPendingEmailChange(adminId, EMAIL)).toEqual({
      targetEmail: NEW_EMAIL,
      expiresAt: new Date(START.getTime() + 24 * HOUR),
    });
  });

  it("après le clic : nouvelle adresse, validée ; les autres liens sont supprimés", async () => {
    const verification = await resendEmailVerification(adminId);
    const reset = await requestPasswordReset(EMAIL);
    const change = await emailChange();
    if (change.status !== "issued" || verification.status !== "issued") throw new Error("Lien non émis.");

    later(MINUTE);
    expect(await verifyEmail(change.token)).toEqual({ status: "changed", email: NEW_EMAIL, previousEmail: EMAIL });
    expect(admin().email).toBe(NEW_EMAIL);
    expect(admin().emailVerifiedAt).toEqual(new Date(START.getTime() + MINUTE));
    expect(await getPendingEmailChange(adminId, NEW_EMAIL)).toBeNull();

    // Un ancien lien de validation ne ramène pas l'ancienne adresse.
    expect(await verifyEmail(verification.token)).toEqual({ status: "invalid" });
    expect(admin().email).toBe(NEW_EMAIL);
    expect(await resetPassword(reset!.token, NEW_PASSWORD)).toEqual({ status: "invalid" });
  });

  it("lien de changement expiré : l'adresse ne change pas", async () => {
    const change = await emailChange();
    if (change.status !== "issued") throw new Error("Lien non émis.");
    later(24 * HOUR);
    expect(await verifyEmail(change.token)).toEqual({ status: "expired" });
    expect(admin().email).toBe(EMAIL);
    expect(await getPendingEmailChange(adminId, EMAIL)).toBeNull();
  });

  it("une nouvelle demande remplace la précédente, sans toucher à la validation de l'adresse actuelle", async () => {
    const verification = await resendEmailVerification(adminId);
    const first = await emailChange();
    const second = await emailChange({ newEmail: "autre@example.org" });
    if (first.status !== "issued" || second.status !== "issued" || verification.status !== "issued") {
      throw new Error("Lien non émis.");
    }

    expect(await verifyEmail(first.token)).toEqual({ status: "invalid" });
    expect(admin().email).toBe(EMAIL);
    expect(await getPendingEmailChange(adminId, EMAIL)).toMatchObject({ targetEmail: "autre@example.org" });
    expect(fakeDb.authTokens.some((row) => row.targetEmail === EMAIL && row.usedAt === null)).toBe(true);
  });

  it("exige le mot de passe actuel : un mauvais mot de passe est refusé, rien n'est créé", async () => {
    expect(await emailChange({ currentPassword: "mauvais-mot-de-passe" })).toEqual({ status: "wrong-password" });
    expect(fakeDb.authTokens).toHaveLength(0);
    // Compté comme un échec de connexion (même limitation, E47).
    expect(fakeDb.loginAttempts).toEqual([expect.objectContaining({ email: EMAIL, succeeded: false })]);
  });

  it("même adresse que l'actuelle : refusée sans vérifier le mot de passe", async () => {
    expect(await emailChange({ newEmail: EMAIL })).toEqual({ status: "same-email" });
    expect(fakeDb.loginAttempts).toHaveLength(0);
  });

  it("adresse déjà utilisée par un autre compte : refusée", async () => {
    fakeDb.admins.push({ id: fakeId(), email: NEW_EMAIL, passwordHash: "x", emailVerifiedAt: null });
    expect(await emailChange()).toEqual({ status: "unavailable" });
    expect(fakeDb.authTokens).toHaveLength(0);
  });

  it("après 5 mauvais mots de passe : blocage, même avec le bon", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await emailChange({ currentPassword: "mauvais-mot-de-passe" });
    }
    expect(await emailChange()).toEqual({ status: "locked", lockedUntil: new Date(START.getTime() + 15 * MINUTE) });
    expect(fakeDb.authTokens).toHaveLength(0);
  });
});

describe("changePassword (page « Compte »)", () => {
  async function sessions() {
    const current = await createSession(adminId);
    const other = await createSession(adminId);
    const otherAdmin = fakeId();
    fakeDb.admins.push({ id: otherAdmin, email: "autre@example.com", passwordHash: "x", emailVerifiedAt: null });
    const unrelated = await createSession(otherAdmin);
    return { current: current.session.id, other: other.session.id, unrelated: unrelated.session.id };
  }

  function change(sessionId: string, currentPassword = PASSWORD) {
    return changePassword({
      adminId,
      email: EMAIL,
      sessionId,
      currentPassword,
      newPassword: NEW_PASSWORD,
      ipAddress: IP,
    });
  }

  it("révoque les autres sessions et garde la session courante", async () => {
    const ids = await sessions();

    expect(await change(ids.current)).toEqual({ status: "changed", revokedSessions: 1 });
    expect(await verifyPassword(NEW_PASSWORD, admin().passwordHash)).toBe(true);
    expect(fakeDb.sessions.map((session) => session.id).sort()).toEqual([ids.current, ids.unrelated].sort());
  });

  it("refuse un mauvais mot de passe actuel : rien ne change", async () => {
    const ids = await sessions();

    expect(await change(ids.current, "mauvais-mot-de-passe")).toEqual({ status: "wrong-password" });
    expect(admin().passwordHash).toBe(passwordHash);
    expect(fakeDb.sessions).toHaveLength(3);
  });

  it("supprime les liens de réinitialisation en attente", async () => {
    const ids = await sessions();
    const reset = (await requestPasswordReset(EMAIL))!;
    await change(ids.current);
    expect(await resetPassword(reset.token, "encore-un-autre-mot-de-passe")).toEqual({ status: "invalid" });
  });
});
