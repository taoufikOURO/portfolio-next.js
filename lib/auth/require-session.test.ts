import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb, fakeId, fakeRequest, RedirectError, resetFakes } from "@/test/fakes";

import { requireSession } from "./require-session";
import { createSession, revokeSession } from "./session";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-11-06T10:00:00.000Z");

let adminId: string;

beforeEach(() => {
  resetFakes();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: null });
});

afterEach(() => {
  vi.useRealTimers();
});

async function redirectOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
}

describe("requireSession", () => {
  it("renvoie la session quand le cookie est valide", async () => {
    const { cookieValue, session } = await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);
    await expect(requireSession()).resolves.toMatchObject({ id: session.id, email: "admin@example.com" });
  });

  it("sans cookie : redirige vers la connexion", async () => {
    expect(await redirectOf(requireSession())).toBe("/admin/connexion");
  });

  it("session révoquée : redirige vers la connexion", async () => {
    const { cookieValue, session } = await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);
    await revokeSession(session.id);
    expect(await redirectOf(requireSession())).toBe("/admin/connexion");
  });

  it("session expirée : redirige vers la connexion", async () => {
    const { cookieValue } = await createSession(adminId);
    fakeRequest.cookies.set("admin_session", cookieValue);
    vi.setSystemTime(new Date(START.getTime() + 8 * DAY));
    expect(await redirectOf(requireSession())).toBe("/admin/connexion");
  });
});
