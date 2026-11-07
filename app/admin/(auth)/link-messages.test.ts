import { describe, expect, it } from "vitest";

import { ACCOUNT_MESSAGES } from "@/lib/validation/auth";

import { linkResultMessage, linkResultPath, tokenFromSearchParams } from "./link-messages";

describe("résultat d'un lien passé dans l'URL", () => {
  it("chemin de redirection : paramètre encodé", () => {
    expect(linkResultPath("/admin/connexion", "mot-de-passe-reinitialise")).toBe(
      "/admin/connexion?resultat=mot-de-passe-reinitialise",
    );
  });

  it("seules les valeurs prévues pour la page donnent un message (aucun texte libre)", () => {
    expect(linkResultMessage({ resultat: "adresse-validee" }, ["adresse-validee"])).toBe(
      ACCOUNT_MESSAGES.emailVerified,
    );
    expect(linkResultMessage({ resultat: "mot-de-passe-reinitialise" }, ["adresse-validee"])).toBeUndefined();
    expect(linkResultMessage({ resultat: "<script>" }, ["adresse-validee"])).toBeUndefined();
    expect(linkResultMessage({ resultat: ["adresse-validee", "x"] }, ["adresse-validee"])).toBeUndefined();
    expect(linkResultMessage({}, ["adresse-validee"])).toBeUndefined();
  });

  it("jeton : une seule valeur textuelle", () => {
    expect(tokenFromSearchParams({ token: "abc" })).toBe("abc");
    expect(tokenFromSearchParams({ token: ["a", "b"] })).toBeUndefined();
    expect(tokenFromSearchParams({})).toBeUndefined();
  });
});
