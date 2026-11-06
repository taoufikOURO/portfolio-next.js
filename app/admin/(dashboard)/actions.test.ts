import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { generateSessionToken, signSessionToken } from "@/lib/auth/session-cookie";
import { fakeDb, fakeId, fakeRequest, RedirectError, resetFakes, TEST_SESSION_SECRET } from "@/test/fakes";

import { logout } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

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
