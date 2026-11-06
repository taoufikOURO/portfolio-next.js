import { describe, expect, it } from "vitest";

import { EnvError, parseSeedEnv, type EnvSource } from "./env-schema";

// Valeurs factices uniquement : elles servent aussi à vérifier qu'aucune
// valeur ne fuit dans les messages d'erreur.
const DB_PASSWORD = "motdepasse-db-factice";
const LOCAL_DB = `postgresql://postgres:${DB_PASSWORD}@localhost:5432/portfolio`;
const REMOTE_HOST = "db.projet-distant.example.com";
const REMOTE_DB = `postgresql://postgres:${DB_PASSWORD}@${REMOTE_HOST}:5432/postgres`;
const ADMIN_PASSWORD = "mot-de-passe-admin-factice";
const SHORT_PASSWORD = "court-11car";

function seedEnv(overrides: EnvSource = {}): EnvSource {
  return {
    APP_ENV: "development",
    DATABASE_URL: LOCAL_DB,
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD,
    ...overrides,
  };
}

/** Exécute `parseSeedEnv` et renvoie l'erreur levée (le test échoue s'il n'y en a pas). */
function seedError(source: EnvSource): EnvError {
  try {
    parseSeedEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error("parseSeedEnv aurait dû lever une EnvError.");
}

describe("parseSeedEnv : configuration valide", () => {
  it("accepte la configuration du seed sans les variables Supabase ni SMTP", () => {
    expect(parseSeedEnv(seedEnv())).toEqual({
      APP_ENV: "development",
      DATABASE_URL: LOCAL_DB,
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD,
    });
  });

  it("met ADMIN_EMAIL en minuscules et retire les espaces autour", () => {
    expect(parseSeedEnv(seedEnv({ ADMIN_EMAIL: "  Admin@Example.COM " })).ADMIN_EMAIL).toBe(
      "admin@example.com",
    );
  });

  it("conserve ADMIN_PASSWORD tel quel, espaces compris", () => {
    const withSpaces = `  ${ADMIN_PASSWORD}  `;
    expect(parseSeedEnv(seedEnv({ ADMIN_PASSWORD: withSpaces })).ADMIN_PASSWORD).toBe(withSpaces);
  });

  it("accepte l'absence d'ADMIN_PASSWORD (retiré de .env après le premier seed)", () => {
    expect(parseSeedEnv(seedEnv({ ADMIN_PASSWORD: undefined })).ADMIN_PASSWORD).toBeUndefined();
    expect(parseSeedEnv(seedEnv({ ADMIN_PASSWORD: "   " })).ADMIN_PASSWORD).toBeUndefined();
  });

  it("accepte une base distante en production", () => {
    expect(parseSeedEnv(seedEnv({ APP_ENV: "production", DATABASE_URL: REMOTE_DB })).DATABASE_URL).toBe(
      REMOTE_DB,
    );
  });
});

describe("parseSeedEnv : refus", () => {
  it("refuse un ADMIN_PASSWORD de moins de 12 caractères, sans l'afficher", () => {
    const error = seedError(seedEnv({ ADMIN_PASSWORD: SHORT_PASSWORD }));
    expect(error.variables).toEqual(["ADMIN_PASSWORD"]);
    expect(error.message).toContain("ADMIN_PASSWORD : doit contenir au moins 12 caractères.");
    expect(error.message).toContain("le seed n'a rien écrit en base");
    expect(error.message).not.toContain(SHORT_PASSWORD);
  });

  it("refuse un ADMIN_EMAIL absent ou invalide, sans l'afficher", () => {
    expect(seedError(seedEnv({ ADMIN_EMAIL: undefined })).message).toContain(
      "ADMIN_EMAIL : variable manquante ou vide.",
    );
    const error = seedError(seedEnv({ ADMIN_EMAIL: "pas-une-adresse" }));
    expect(error.message).toContain("ADMIN_EMAIL : doit être une adresse e-mail valide.");
    expect(error.message).not.toContain("pas-une-adresse");
  });

  it("refuse une base non locale en développement, sans afficher l'URL", () => {
    const error = seedError(seedEnv({ DATABASE_URL: REMOTE_DB }));
    expect(error.variables).toEqual(["DATABASE_URL"]);
    expect(error.message).toContain("DATABASE_URL : doit pointer vers une base locale");
    expect(error.message).not.toContain(REMOTE_HOST);
    expect(error.message).not.toContain(DB_PASSWORD);
  });

  it("exige APP_ENV et DATABASE_URL", () => {
    const error = seedError(seedEnv({ APP_ENV: undefined, DATABASE_URL: undefined }));
    expect(error.variables).toEqual(["APP_ENV", "DATABASE_URL"]);
  });

  it("ne renvoie jamais le mot de passe dans un message, même avec d'autres erreurs", () => {
    const error = seedError(
      seedEnv({ APP_ENV: "staging", ADMIN_EMAIL: undefined, ADMIN_PASSWORD: SHORT_PASSWORD }),
    );
    expect(error.variables).toEqual(["APP_ENV", "ADMIN_EMAIL", "ADMIN_PASSWORD"]);
    expect(error.message).not.toContain(SHORT_PASSWORD);
  });
});
