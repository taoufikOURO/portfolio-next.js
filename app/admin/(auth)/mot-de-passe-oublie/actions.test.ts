import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";
import {
  fakeDb,
  fakeId,
  mailbox,
  pendingAfterCallbacks,
  resetFakes,
  runAfterCallbacks,
} from "@/test/fakes";

import { requestPasswordResetAction } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("@/lib/mail/send", async () => (await import("@/test/fakes")).fakeMail);
vi.mock("next/server", async () => ({ after: (await import("@/test/fakes")).fakeAfter }));

const EMAIL = "admin@example.com";

beforeEach(() => {
  resetFakes();
  fakeDb.admins.push({ id: fakeId(), email: EMAIL, passwordHash: "x", emailVerifiedAt: null });
});

function submit(email: string) {
  const data = new FormData();
  data.set("email", email);
  return requestPasswordResetAction(null, data);
}

describe("requestPasswordResetAction", () => {
  it("même message pour une adresse connue et pour une adresse inconnue", async () => {
    const known = await submit(EMAIL);
    const unknown = await submit("inconnue@example.com");

    expect(known).toEqual({
      ok: true,
      message: ACCOUNT_MESSAGES.resetRequested,
      fieldErrors: {},
      values: { email: EMAIL },
    });
    expect(unknown).toEqual({ ...known, values: { email: "inconnue@example.com" } });
    expect(ACCOUNT_MESSAGES.resetRequested).toBe(
      "Si cette adresse est celle du compte d'administration, un lien de réinitialisation vient d'y être envoyé. Il est valable 1 heure.",
    );
  });

  it("adresse connue : l'e-mail part après la réponse, avec un lien valide", async () => {
    await submit("  ADMIN@example.com ");

    // Ni base ni envoi pendant l'action : le temps de réponse ne dépend pas du compte.
    expect(fakeDb.authTokens).toHaveLength(0);
    expect(mailbox.sent).toHaveLength(0);
    expect(pendingAfterCallbacks()).toBe(1);
    await runAfterCallbacks();

    expect(mailbox.sent).toEqual([{ type: "password-reset", to: EMAIL, token: expect.any(String) }]);
    expect(fakeDb.authTokens).toHaveLength(1);
  });

  it("adresse inconnue : même travail prévu après la réponse, qui n'écrit rien et n'envoie rien", async () => {
    await submit("inconnue@example.com");
    expect(pendingAfterCallbacks()).toBe(1);
    await runAfterCallbacks();
    expect(fakeDb.authTokens).toHaveLength(0);
    expect(mailbox.sent).toHaveLength(0);
  });

  it("deuxième demande dans la minute : même message, aucun nouvel envoi", async () => {
    await submit(EMAIL);
    await runAfterCallbacks();
    const second = await submit(EMAIL);
    await runAfterCallbacks();
    expect(second?.message).toBe(ACCOUNT_MESSAGES.resetRequested);
    expect(mailbox.sent).toHaveLength(1);
  });

  it("échec de l'envoi : journalisé (nom de l'erreur seulement), sans effet sur la réponse", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await submit(EMAIL);
    mailbox.failNext = true;
    await runAfterCallbacks();
    expect(errors).toHaveBeenCalledWith("Mot de passe oublié : erreur inattendue (Error).");
    errors.mockRestore();
  });

  it("adresse invalide : erreur liée au champ, aucun accès à la base", async () => {
    const state = await submit("pas-une-adresse");
    expect(state).toEqual({
      ok: false,
      message: ACCOUNT_MESSAGES.formInvalid,
      fieldErrors: { email: "Saisissez une adresse e-mail valide, par exemple nom@exemple.fr." },
      values: { email: "pas-une-adresse" },
    });
    expect(fakeDb.authTokens).toHaveLength(0);
  });
});
