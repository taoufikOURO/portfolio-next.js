import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EnvError,
  isDevBucketName,
  isLocalDatabaseUrl,
  parseEnv,
  type EnvSource,
} from "./env-schema";

// Valeurs factices uniquement. Les « secrets » ci-dessous servent à vérifier
// qu'aucune valeur ne fuit dans les messages d'erreur.
const SECRET = "secret-de-test-qui-ne-doit-jamais-apparaitre-0123456789";
const DB_PASSWORD = "motdepasse-db-factice";
const LOCAL_DB = `postgresql://postgres:${DB_PASSWORD}@localhost:5432/portfolio`;
const REMOTE_HOST = "db.projet-distant.example.com";
const REMOTE_DB = `postgresql://postgres:${DB_PASSWORD}@${REMOTE_HOST}:5432/postgres`;

function devEnv(overrides: EnvSource = {}): EnvSource {
  return {
    APP_ENV: "development",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: LOCAL_DB,
    DIRECT_URL: LOCAL_DB,
    SESSION_SECRET: SECRET,
    NEXT_PUBLIC_SUPABASE_URL: "https://projet.example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "cle-service-factice",
    SUPABASE_STORAGE_BUCKET_ARTICLES: "dev-articles",
    SUPABASE_STORAGE_BUCKET_PROJECTS: "dev-projets",
    SUPABASE_STORAGE_BUCKET_PROFILE: "dev-profil",
    SUPABASE_STORAGE_BUCKET_STACK: "dev-stack",
    ...overrides,
  };
}

function prodEnv(overrides: EnvSource = {}): EnvSource {
  return devEnv({
    APP_ENV: "production",
    APP_URL: "https://portfolio.example.com",
    DATABASE_URL: REMOTE_DB,
    DIRECT_URL: REMOTE_DB,
    SUPABASE_STORAGE_BUCKET_ARTICLES: "articles",
    SUPABASE_STORAGE_BUCKET_PROJECTS: "projets",
    SUPABASE_STORAGE_BUCKET_PROFILE: "profil",
    SUPABASE_STORAGE_BUCKET_STACK: "stack",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "expediteur@example.com",
    SMTP_PASS: "mot-de-passe-smtp-factice",
    MAIL_FROM: "Portfolio <expediteur@example.com>",
    ...overrides,
  });
}

/** Exécute `parseEnv` et renvoie l'erreur levée (le test échoue s'il n'y en a pas). */
function envError(source: EnvSource): EnvError {
  try {
    parseEnv(source);
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error("parseEnv aurait dû refuser cette configuration");
}

function expectNoValueLeak(error: EnvError, source: EnvSource) {
  for (const value of Object.values(source)) {
    // Les valeurs courtes et non sensibles (« development », « 587 »…) peuvent
    // coïncider avec un mot du message : on ne contrôle que les valeurs longues.
    if (value && value.length >= 12) expect(error.message).not.toContain(value);
  }
  expect(error.message).not.toContain(DB_PASSWORD);
  expect(error.message).not.toContain(SECRET);
}

describe("parseEnv : configuration valide", () => {
  it("accepte une configuration de développement complète", () => {
    const env = parseEnv(devEnv());
    expect(env.APP_ENV).toBe("development");
    expect(env.DATABASE_URL).toBe(LOCAL_DB);
    expect(env.SUPABASE_STORAGE_BUCKET_STACK).toBe("dev-stack");
  });

  it("accepte une configuration de production complète (base distante, buckets sans préfixe)", () => {
    const env = parseEnv(prodEnv());
    expect(env.APP_ENV).toBe("production");
    expect(env.SMTP_PORT).toBe(587);
  });

  it("ignore les espaces autour des valeurs", () => {
    expect(parseEnv(devEnv({ APP_ENV: "  development  " })).APP_ENV).toBe("development");
  });
});

describe("parseEnv : variable manquante", () => {
  const required = [
    "APP_ENV",
    "APP_URL",
    "DATABASE_URL",
    "DIRECT_URL",
    "SESSION_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET_ARTICLES",
    "SUPABASE_STORAGE_BUCKET_PROJECTS",
    "SUPABASE_STORAGE_BUCKET_PROFILE",
    "SUPABASE_STORAGE_BUCKET_STACK",
  ];

  it.each(required)("refuse de démarrer sans %s, en la nommant", (name) => {
    const source = devEnv({ [name]: undefined });
    const error = envError(source);

    expect(error.variables).toContain(name);
    expect(error.message).toContain("Configuration invalide");
    expect(error.message).toContain(`${name} : variable manquante ou vide.`);
    expectNoValueLeak(error, source);
  });

  it("traite une valeur vide ou faite d'espaces comme absente", () => {
    expect(envError(devEnv({ SESSION_SECRET: "" })).variables).toEqual(["SESSION_SECRET"]);
    expect(envError(devEnv({ SESSION_SECRET: "   " })).variables).toEqual(["SESSION_SECRET"]);
  });

  it("liste toutes les variables manquantes en une fois", () => {
    const error = envError(devEnv({ DATABASE_URL: undefined, SESSION_SECRET: undefined }));
    expect(error.variables).toEqual(expect.arrayContaining(["DATABASE_URL", "SESSION_SECRET"]));
  });

  it("exige les variables SMTP en production", () => {
    const source = prodEnv({ SMTP_PASS: undefined, MAIL_FROM: undefined });
    const error = envError(source);
    expect(error.variables).toEqual(["SMTP_PASS", "MAIL_FROM"]);
    expect(error.message).toContain("SMTP_PASS : variable obligatoire quand APP_ENV=production.");
    expectNoValueLeak(error, source);
  });

  it("n'exige pas les variables SMTP en développement", () => {
    expect(() => parseEnv(devEnv())).not.toThrow();
  });
});

describe("parseEnv : valeur invalide", () => {
  it("refuse un APP_ENV inconnu", () => {
    expect(envError(devEnv({ APP_ENV: "staging" })).variables).toEqual(["APP_ENV"]);
  });

  it("refuse un SESSION_SECRET de moins de 32 caractères sans l'afficher", () => {
    const source = devEnv({ SESSION_SECRET: "trop-court-mais-secret" });
    const error = envError(source);
    expect(error.variables).toEqual(["SESSION_SECRET"]);
    expect(error.message).toContain("au moins 32 caractères");
    expect(error.message).not.toContain("trop-court-mais-secret");
  });

  it("refuse une DATABASE_URL qui n'est pas une URL PostgreSQL", () => {
    const source = devEnv({ DATABASE_URL: "mysql://root:secret-mysql@localhost/portfolio" });
    const error = envError(source);
    expect(error.variables).toEqual(["DATABASE_URL"]);
    expectNoValueLeak(error, source);
  });
});

describe("garde-fou : base locale obligatoire en développement", () => {
  it.each(["DATABASE_URL", "DIRECT_URL"])("refuse %s vers un hôte distant", (name) => {
    const source = devEnv({ [name]: REMOTE_DB });
    const error = envError(source);

    expect(error.variables).toEqual([name]);
    expect(error.message).toContain("doit pointer vers une base locale");
    expect(error.message).not.toContain(REMOTE_HOST);
    expectNoValueLeak(error, source);
  });

  it("refuse une URL Supabase (pooler) en développement", () => {
    const pooler = "postgresql://postgres.ref:factice@aws-0-eu-west-3.pooler.supabase.com:6543/postgres";
    expect(envError(devEnv({ DATABASE_URL: pooler })).variables).toEqual(["DATABASE_URL"]);
  });

  it.each([
    ["localhost", "postgresql://u:p@localhost:5432/portfolio"],
    ["127.0.0.1", "postgresql://u:p@127.0.0.1:5432/portfolio"],
    ["::1", "postgresql://u:p@[::1]:5432/portfolio"],
    ["LOCALHOST (casse)", "postgres://u:p@LOCALHOST/portfolio"],
  ])("accepte %s", (_label, url) => {
    expect(isLocalDatabaseUrl(url)).toBe(true);
    expect(() => parseEnv(devEnv({ DATABASE_URL: url, DIRECT_URL: url }))).not.toThrow();
  });

  it.each([
    ["hôte distant", REMOTE_DB],
    ["hôte absent (repli sur PGHOST ou un socket)", "postgresql:///portfolio"],
    ["paramètre ?host= distant", `postgresql://u:p@localhost/portfolio?host=${REMOTE_HOST}`],
    ["sous-domaine trompeur", "postgresql://u:p@localhost.example.com/portfolio"],
    ["plusieurs hôtes", `postgresql://u:p@localhost,${REMOTE_HOST}/portfolio`],
    ["autre adresse IP", "postgresql://u:p@10.0.0.5/portfolio"],
    ["autre protocole", "mysql://u:p@localhost/portfolio"],
    ["texte quelconque", "pas une url"],
  ])("isLocalDatabaseUrl refuse : %s", (_label, url) => {
    expect(isLocalDatabaseUrl(url)).toBe(false);
  });

  it("n'applique pas ce garde-fou en production", () => {
    expect(() => parseEnv(prodEnv())).not.toThrow();
  });
});

describe("garde-fou : buckets préfixés dev- en développement", () => {
  it.each([
    "SUPABASE_STORAGE_BUCKET_ARTICLES",
    "SUPABASE_STORAGE_BUCKET_PROJECTS",
    "SUPABASE_STORAGE_BUCKET_PROFILE",
    "SUPABASE_STORAGE_BUCKET_STACK",
  ])("refuse %s sans préfixe dev-", (name) => {
    const error = envError(devEnv({ [name]: "articles" }));
    expect(error.variables).toEqual([name]);
    expect(error.message).toContain(`${name} : doit commencer par « dev- »`);
  });

  it.each([
    ["articles", false],
    ["Dev-articles", false],
    ["devarticles", false],
    ["dev_articles", false],
    ["dev-", false],
    ["dev-articles", true],
  ])("isDevBucketName(%s) vaut %s", (name, expected) => {
    expect(isDevBucketName(name)).toBe(expected);
  });

  it("signale chaque bucket fautif", () => {
    const error = envError(
      devEnv({ SUPABASE_STORAGE_BUCKET_PROFILE: "profil", SUPABASE_STORAGE_BUCKET_STACK: "stack" }),
    );
    expect(error.variables).toEqual(["SUPABASE_STORAGE_BUCKET_PROFILE", "SUPABASE_STORAGE_BUCKET_STACK"]);
  });

  it("n'applique pas ce garde-fou en production", () => {
    expect(parseEnv(prodEnv()).SUPABASE_STORAGE_BUCKET_ARTICLES).toBe("articles");
  });
});

describe("lib/env.ts : validation au démarrage", () => {
  afterEach(() => {
    vi.resetModules();
  });

  function stubEnv(source: EnvSource) {
    for (const [key, value] of Object.entries(source)) vi.stubEnv(key, value);
  }

  it("expose les variables validées", async () => {
    stubEnv(devEnv());
    const { env } = await import("./env");
    expect(env.APP_ENV).toBe("development");
  });

  it("refuse de démarrer si une variable obligatoire manque", async () => {
    stubEnv(devEnv({ DATABASE_URL: undefined }));
    await expect(import("./env")).rejects.toThrow(/DATABASE_URL : variable manquante ou vide\./);
  });

  it("refuse de démarrer si la base n'est pas locale en développement", async () => {
    stubEnv(devEnv({ DIRECT_URL: REMOTE_DB }));
    const error: unknown = await import("./env").then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("DIRECT_URL : doit pointer vers une base locale");
    expect(message).not.toContain(REMOTE_HOST);
    expect(message).not.toContain(DB_PASSWORD);
  });
});
