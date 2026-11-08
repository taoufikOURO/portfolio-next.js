import "server-only";

import { isValidGitHubUsername } from "@/lib/validation/project";

// Client de l'API GitHub (cahier §3.7) : profil public d'un collaborateur,
// `GET https://api.github.com/users/{username}`.
//
// - délai d'attente de 5 secondes (lecture de la réponse comprise) ;
// - `User-Agent` « portfolio-admin » (exigé par GitHub), sans adresse ;
// - `GITHUB_TOKEN` facultatif (limite de l'API relevée) : passé par l'appelant,
//   jamais journalisé ;
// - un nom d'utilisateur non conforme n'est jamais envoyé ;
// - la réponse est vérifiée avant usage : même identifiant que celui demandé,
//   avatar et profil hébergés sur GitHub, en https.
//
// `fetch` est injectable : les tests passent un faux `fetch` (aucun appel réseau).

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_TIMEOUT_MS = 5000;
export const GITHUB_USER_AGENT = "portfolio-admin";

/** Hôtes acceptés pour l'avatar (`avatar_url`) et pour le profil (`html_url`). */
const AVATAR_HOSTS = ["avatars.githubusercontent.com"];
const PROFILE_HOST = "github.com";
const NAME_MAX_LENGTH = 255;
const URL_MAX_LENGTH = 500;

export type GitHubProfile = {
  /** Identifiant renvoyé par GitHub, en minuscules (égal au nom demandé). */
  login: string;
  /** Nom affiché, ou `null` si le compte n'en a pas. */
  name: string | null;
  avatarUrl: string | null;
  profileUrl: string;
};

export type GitHubFailure = "invalid-username" | "not-found" | "rate-limited" | "timeout" | "invalid-response" | "unavailable";

export type GitHubResult = { ok: true; profile: GitHubProfile } | { ok: false; reason: GitHubFailure };

/** Message enregistré dans `syncError` et affiché en avertissement. */
export const GITHUB_FAILURE_MESSAGES: Record<GitHubFailure, string> = {
  "invalid-username": "Nom d’utilisateur GitHub non conforme : aucune demande envoyée à GitHub.",
  "not-found": "Utilisateur introuvable sur GitHub.",
  "rate-limited": "Limite de l’API GitHub atteinte. Réessayez plus tard.",
  timeout: "GitHub n’a pas répondu dans les 5 secondes.",
  "invalid-response": "Réponse de GitHub inattendue : profil non enregistré.",
  unavailable: "GitHub est injoignable ou a refusé la demande.",
};

export type GitHubOptions = {
  fetch?: typeof fetch;
  token?: string;
  timeoutMs?: number;
};

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true;
  // GitHub répond 403 quand la limite principale ou secondaire est atteinte.
  return (
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after"))
  );
}

function httpsUrlOn(value: unknown, hosts: readonly string[]): URL | null {
  if (typeof value !== "string" || value.length > URL_MAX_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  return hosts.includes(url.hostname) ? url : null;
}

function cleanName(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const name = value
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name === "") return null;
  return [...name].slice(0, NAME_MAX_LENGTH).join("");
}

/**
 * Profil vérifié, ou `null` si la réponse ne correspond pas au compte demandé
 * (autre identifiant, avatar ou profil hors de GitHub, champs mal formés).
 */
export function checkGitHubProfile(body: unknown, username: string): GitHubProfile | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;

  if (typeof data.login !== "string" || data.login.toLowerCase() !== username) return null;

  const profile = httpsUrlOn(data.html_url, [PROFILE_HOST]);
  if (!profile || profile.search || profile.hash) return null;
  if (profile.pathname.replace(/\/$/, "").toLowerCase() !== `/${username}`) return null;

  let avatarUrl: string | null = null;
  if (data.avatar_url !== null && data.avatar_url !== undefined) {
    const avatar = httpsUrlOn(data.avatar_url, AVATAR_HOSTS);
    if (!avatar) return null;
    avatarUrl = avatar.href;
  }

  const name = cleanName(data.name);
  if (name === undefined) return null;

  return { login: username, name, avatarUrl, profileUrl: profile.href };
}

/**
 * Profil public d'un utilisateur GitHub. `username` doit être déjà normalisé
 * (minuscules) : un nom non conforme est refusé sans appel. Ne lève jamais :
 * tout échec est un `reason`.
 */
export async function fetchGitHubUser(username: string, options: GitHubOptions = {}): Promise<GitHubResult> {
  if (!isValidGitHubUsername(username)) return { ok: false, reason: "invalid-username" };

  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? GITHUB_TIMEOUT_MS;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": GITHUB_USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await doFetch(`${GITHUB_API_URL}/users/${encodeURIComponent(username)}`, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (isRateLimited(response)) return { ok: false, reason: "rate-limited" };
    if (!response.ok) return { ok: false, reason: "unavailable" };

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, reason: timedOut ? "timeout" : "invalid-response" };
    }
    const profile = checkGitHubProfile(body, username);
    return profile ? { ok: true, profile } : { ok: false, reason: "invalid-response" };
  } catch {
    return { ok: false, reason: timedOut ? "timeout" : "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
