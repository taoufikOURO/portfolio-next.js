import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateSessionToken, signSessionToken } from "@/lib/auth/session-cookie";

import { config, proxy } from "./proxy";

const SECRET = "secret-de-session-factice-pour-les-tests-0123456789";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) headers.set("cookie", `admin_session=${cookie}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** `NextResponse.next()` est signalé par l'en-tête `x-middleware-next`. */
function passes(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it.each(["/admin", "/admin/formations", "/admin/articles/123/modifier", "/admin/demo", "/admin/xyz"])(
    "sans cookie, %s redirige vers /admin/connexion",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/connexion");
    },
  );

  it.each(["/admin/connexion", "/admin/connexion/"])("laisse passer la page de connexion (%s)", (path) => {
    expect(passes(proxy(request(path)))).toBe(true);
  });

  it.each([
    ["illisible", "n-importe-quoi"],
    ["signé avec un autre secret", signSessionToken(generateSessionToken(), "autre-secret-factice-0123456789-abcdef")],
  ])("cookie %s : redirection", (_label, cookie) => {
    expect(proxy(request("/admin", cookie)).status).toBe(307);
  });

  it("cookie bien signé : laisse passer (la session est vérifiée ensuite côté serveur)", () => {
    const cookie = signSessionToken(generateSessionToken(), SECRET);
    expect(passes(proxy(request("/admin/formations", cookie)))).toBe(true);
  });

  it("SESSION_SECRET absent : tout est refusé", () => {
    const cookie = signSessionToken(generateSessionToken(), SECRET);
    vi.stubEnv("SESSION_SECRET", "");
    expect(proxy(request("/admin", cookie)).status).toBe(307);
  });

  it("ne s'applique qu'à /admin et à ses sous-pages", () => {
    expect(config.matcher).toEqual(["/admin", "/admin/:path*"]);
  });
});
