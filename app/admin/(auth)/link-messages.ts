import type { AuthTokenFailure } from "@/lib/auth/tokens";
import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";

/** Message affiché pour un lien refusé, selon la raison. */
export const LINK_FAILURE_MESSAGES: Record<AuthTokenFailure, string> = {
  invalid: ACCOUNT_MESSAGES.tokenInvalid,
  expired: ACCOUNT_MESSAGES.tokenExpired,
  used: ACCOUNT_MESSAGES.tokenUsed,
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Paramètre `token` de l'URL, s'il est présent une seule fois. */
export function tokenFromSearchParams(params: SearchParams): string | undefined {
  return typeof params.token === "string" ? params.token : undefined;
}

/**
 * Résultat d'un lien utilisé avec succès, passé dans l'URL de la page vers
 * laquelle l'action redirige (`?resultat=…`). Valeurs fixes : seul le message
 * correspondant peut être affiché (aucun texte libre ne vient de l'URL).
 */
export const LINK_RESULT_MESSAGES = {
  "adresse-validee": ACCOUNT_MESSAGES.emailVerified,
  "adresse-modifiee": ACCOUNT_MESSAGES.emailChanged,
  "mot-de-passe-reinitialise": ACCOUNT_MESSAGES.passwordReset,
} as const;

export type LinkResult = keyof typeof LINK_RESULT_MESSAGES;

const RESULT_PARAM = "resultat";

export function linkResultPath(path: string, result: LinkResult): string {
  return `${path}?${new URLSearchParams({ [RESULT_PARAM]: result })}`;
}

/** Message du résultat lu dans l'URL, si la valeur est connue. */
export function linkResultMessage(params: SearchParams, allowed: readonly LinkResult[]): string | undefined {
  const value = params[RESULT_PARAM];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) return undefined;
  return LINK_RESULT_MESSAGES[value as LinkResult];
}
