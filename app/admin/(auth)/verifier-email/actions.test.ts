import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestEmailChange, resendEmailVerification } from "@/lib/auth/account";
import { hashPassword } from "@/lib/auth/password";
import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";
import { fakeDb, fakeId, RedirectError, resetFakes, revalidatedPaths } from "@/test/fakes";

import { verifyEmailAction } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

const EMAIL = "admin@example.com";
const PASSWORD = "mot-de-passe-actuel-factice";
let adminId: string;

beforeEach(async () => {
  resetFakes();
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: EMAIL, passwordHash: await hashPassword(PASSWORD), emailVerifiedAt: null });
});

/** Appelle l'action ; renvoie l'URL de redirection (succès) ou l'état (échec). */
async function submit(token: string) {
  const data = new FormData();
  data.set("token", token);
  try {
    return await verifyEmailAction(null, data);
  } catch (error) {
    if (error instanceof RedirectError) return { redirectedTo: error.url };
    throw error;
  }
}

async function verificationToken() {
  const result = await resendEmailVerification(adminId);
  if (result.status !== "issued") throw new Error("Lien non émis.");
  return result.token;
}

describe("verifyEmailAction", () => {
  it("valide l'adresse et rafraîchit l'administration (bannière, barre latérale)", async () => {
    const result = await submit(await verificationToken());

    // Page sans jeton : rendue avec le jeton utilisé, elle afficherait « déjà utilisé ».
    expect(result).toEqual({ redirectedTo: "/admin/verifier-email?resultat=adresse-validee" });
    expect(fakeDb.admins[0].emailVerifiedAt).toBeInstanceOf(Date);
    expect(revalidatedPaths).toEqual(["/admin (layout)"]);
  });

  it("changement d'adresse : la nouvelle adresse n'est prise en compte qu'à ce moment", async () => {
    const change = await requestEmailChange({
      adminId,
      currentEmail: EMAIL,
      newEmail: "nouvelle@example.org",
      currentPassword: PASSWORD,
      ipAddress: "203.0.113.7",
    });
    if (change.status !== "issued") throw new Error("Demande refusée.");
    expect(fakeDb.admins[0].email).toBe(EMAIL);

    expect(await submit(change.token)).toEqual({
      redirectedTo: "/admin/verifier-email?resultat=adresse-modifiee",
    });
    expect(fakeDb.admins[0].email).toBe("nouvelle@example.org");
  });

  it("usage unique : le second clic est refusé", async () => {
    const token = await verificationToken();
    await submit(token);
    expect(await submit(token)).toEqual({ ok: false, message: ACCOUNT_MESSAGES.tokenUsed, fieldErrors: {} });
  });

  it("lien modifié ou mal formé : refusé, adresse non validée", async () => {
    const token = await verificationToken();
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(await submit(tampered)).toEqual({ ok: false, message: ACCOUNT_MESSAGES.tokenInvalid, fieldErrors: {} });
    expect(await submit("pas-un-jeton")).toEqual({ ok: false, message: ACCOUNT_MESSAGES.tokenInvalid, fieldErrors: {} });
    expect(fakeDb.admins[0].emailVerifiedAt).toBeNull();
    expect(revalidatedPaths).toEqual([]);
  });
});
