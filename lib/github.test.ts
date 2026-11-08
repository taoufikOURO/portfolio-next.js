import { afterEach, describe, expect, it, vi } from "vitest";

import { NETWORK_FORBIDDEN_MESSAGE } from "@/test/no-network";

import {
  checkGitHubProfile,
  fetchGitHubUser,
  GITHUB_FAILURE_MESSAGES,
  GITHUB_TIMEOUT_MS,
  GITHUB_USER_AGENT,
} from "./github";

type Call = { url: string; init: RequestInit };

/** Faux `fetch` qui renvoie toujours `response` et note les appels. */
function fakeFetch(response: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return response();
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

const OCTOCAT = {
  login: "octocat",
  id: 583231,
  name: "The Octocat",
  avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
  html_url: "https://github.com/octocat",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("aucun appel réseau pendant les tests", () => {
  it("le fetch global lève une erreur", () => {
    expect(() => fetch("https://api.github.com/users/octocat")).toThrow(NETWORK_FORBIDDEN_MESSAGE);
  });

  it("sans faux fetch, fetchGitHubUser échoue sans atteindre le réseau", async () => {
    expect(await fetchGitHubUser("octocat")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("fetchGitHubUser : succès", () => {
  it("renvoie le nom, l'avatar et le profil vérifiés", async () => {
    const { fetch, calls } = fakeFetch(() => json(OCTOCAT));
    const result = await fetchGitHubUser("octocat", { fetch });
    expect(result).toEqual({
      ok: true,
      profile: {
        login: "octocat",
        name: "The Octocat",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        profileUrl: "https://github.com/octocat",
      },
    });
    expect(calls).toHaveLength(1);
  });

  it("appelle GET https://api.github.com/users/{username} avec le User-Agent « portfolio-admin »", async () => {
    const { fetch, calls } = fakeFetch(() => json(OCTOCAT));
    await fetchGitHubUser("octocat", { fetch });
    const [{ url, init }] = calls;
    expect(url).toBe("https://api.github.com/users/octocat");
    expect(init.method).toBe("GET");
    const headers = init.headers as Record<string, string>;
    expect(GITHUB_USER_AGENT).toBe("portfolio-admin");
    expect(headers["User-Agent"]).toBe("portfolio-admin");
    expect(headers.Accept).toBe("application/vnd.github+json");
    expect(headers.Authorization).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
  });

  it("ajoute GITHUB_TOKEN en en-tête Authorization s'il est fourni", async () => {
    const { fetch, calls } = fakeFetch(() => json(OCTOCAT));
    await fetchGitHubUser("octocat", { fetch, token: "jeton-factice" });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer jeton-factice");
  });

  it("accepte un compte sans nom ni avatar, et un identifiant renvoyé avec une autre casse", async () => {
    const { fetch } = fakeFetch(() =>
      json({ ...OCTOCAT, login: "OctoCat", name: null, avatar_url: null, html_url: "https://github.com/OctoCat" }),
    );
    expect(await fetchGitHubUser("octocat", { fetch })).toEqual({
      ok: true,
      profile: { login: "octocat", name: null, avatarUrl: null, profileUrl: "https://github.com/OctoCat" },
    });
  });

  it("nettoie le nom (caractères invisibles, espaces) et le borne à 255 caractères", async () => {
    const { fetch } = fakeFetch(() => json({ ...OCTOCAT, name: `  Mona​   ${"L".repeat(400)}\u0007 ` }));
    const result = await fetchGitHubUser("octocat", { fetch });
    expect(result.ok && result.profile.name?.startsWith("Mona L")).toBe(true);
    expect(result.ok && [...(result.profile.name ?? "")].length).toBe(255);
  });
});

describe("fetchGitHubUser : échecs", () => {
  it("404 : utilisateur introuvable", async () => {
    const { fetch } = fakeFetch(() => json({ message: "Not Found" }, { status: 404 }));
    expect(await fetchGitHubUser("inconnu", { fetch })).toEqual({ ok: false, reason: "not-found" });
  });

  it.each([
    ["403 et x-ratelimit-remaining = 0", 403, { "x-ratelimit-remaining": "0" }],
    ["403 et retry-after (limite secondaire)", 403, { "retry-after": "60" }],
    ["429", 429, {}],
  ])("limite d'API (%s)", async (_label, status, headers) => {
    const { fetch } = fakeFetch(() => json({ message: "API rate limit exceeded" }, { status, headers }));
    expect(await fetchGitHubUser("octocat", { fetch })).toEqual({ ok: false, reason: "rate-limited" });
  });

  it("403 sans indication de limite, 500 : GitHub indisponible", async () => {
    for (const status of [403, 500, 502]) {
      const { fetch } = fakeFetch(() => json({}, { status }));
      expect(await fetchGitHubUser("octocat", { fetch })).toEqual({ ok: false, reason: "unavailable" });
    }
  });

  it("erreur réseau : GitHub indisponible", async () => {
    const fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof globalThis.fetch;
    expect(await fetchGitHubUser("octocat", { fetch })).toEqual({ ok: false, reason: "unavailable" });
  });

  it(`délai dépassé : la requête est interrompue au bout de ${GITHUB_TIMEOUT_MS} ms`, async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetch = ((_input: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((_, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Interrompu", "AbortError")));
      });
    }) as typeof globalThis.fetch;

    let settled = false;
    const pending = fetchGitHubUser("octocat", { fetch }).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(GITHUB_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    expect(signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ ok: false, reason: "timeout" });
    expect(signal?.aborted).toBe(true);
    expect(GITHUB_TIMEOUT_MS).toBe(5000);
  });

  it("délai dépassé pendant la lecture de la réponse", async () => {
    vi.useFakeTimers();
    const fetch = ((_input: string, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener("abort", () => controller.error(new DOMException("Interrompu", "AbortError")));
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    }) as typeof globalThis.fetch;

    const pending = fetchGitHubUser("octocat", { fetch });
    await vi.advanceTimersByTimeAsync(GITHUB_TIMEOUT_MS);
    expect(await pending).toEqual({ ok: false, reason: "timeout" });
  });

  it("la minuterie est arrêtée après une réponse (aucune interruption tardive)", async () => {
    vi.useFakeTimers();
    const { fetch } = fakeFetch(() => json(OCTOCAT));
    await fetchGitHubUser("octocat", { fetch });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("fetchGitHubUser : réponse incohérente", () => {
  it.each([
    ["autre identifiant", { ...OCTOCAT, login: "mallory" }],
    ["identifiant absent", { ...OCTOCAT, login: undefined }],
    ["avatar hors de GitHub", { ...OCTOCAT, avatar_url: "https://evil.example/avatar.png" }],
    ["avatar sur un hôte qui imite GitHub", { ...OCTOCAT, avatar_url: "https://avatars.githubusercontent.com.evil.example/a.png" }],
    ["avatar en http", { ...OCTOCAT, avatar_url: "http://avatars.githubusercontent.com/u/1" }],
    ["avatar javascript:", { ...OCTOCAT, avatar_url: "javascript:alert(1)" }],
    ["avatar avec identifiants", { ...OCTOCAT, avatar_url: "https://a:b@avatars.githubusercontent.com/u/1" }],
    ["profil hors de GitHub", { ...OCTOCAT, html_url: "https://gitlab.com/octocat" }],
    ["profil d'un autre compte", { ...OCTOCAT, html_url: "https://github.com/mallory" }],
    ["profil sur un sous-domaine", { ...OCTOCAT, html_url: "https://gist.github.com/octocat" }],
    ["profil en http", { ...OCTOCAT, html_url: "http://github.com/octocat" }],
    ["profil avec paramètres", { ...OCTOCAT, html_url: "https://github.com/octocat?tab=x" }],
    ["profil absent", { ...OCTOCAT, html_url: undefined }],
    ["nom qui n'est pas un texte", { ...OCTOCAT, name: { first: "Mona" } }],
    ["tableau", [OCTOCAT]],
    ["null", null],
  ])("%s : refusée", async (_label, body) => {
    const { fetch } = fakeFetch(() => json(body));
    expect(await fetchGitHubUser("octocat", { fetch })).toEqual({ ok: false, reason: "invalid-response" });
  });

  it("corps qui n'est pas du JSON : refusé", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>", { status: 200 }));
    expect(await fetchGitHubUser("octocat", { fetch })).toEqual({ ok: false, reason: "invalid-response" });
  });

  it("checkGitHubProfile accepte la barre oblique finale du profil", () => {
    expect(checkGitHubProfile({ ...OCTOCAT, html_url: "https://github.com/octocat/" }, "octocat")?.login).toBe("octocat");
  });
});

describe("fetchGitHubUser : nom non conforme jamais envoyé", () => {
  it.each(["-octocat", "octocat-", "octo--cat", "a".repeat(40), "Octocat", "octo cat", "octo_cat", "../admin", ""])(
    "« %s » : refusé sans appel",
    async (username) => {
      const { fetch, calls } = fakeFetch(() => json(OCTOCAT));
      expect(await fetchGitHubUser(username, { fetch })).toEqual({ ok: false, reason: "invalid-username" });
      expect(calls).toHaveLength(0);
    },
  );

  it("un nom de 39 caractères est envoyé", async () => {
    const username = "a".repeat(39);
    const { fetch, calls } = fakeFetch(() =>
      json({ ...OCTOCAT, login: username, html_url: `https://github.com/${username}` }),
    );
    expect((await fetchGitHubUser(username, { fetch })).ok).toBe(true);
    expect(calls).toHaveLength(1);
  });
});

describe("messages d'échec", () => {
  it("chaque échec a un message en français, sans le jeton", () => {
    for (const message of Object.values(GITHUB_FAILURE_MESSAGES)) {
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(/token|jeton/i);
    }
  });
});
