import net from "node:net";
import tls from "node:tls";

import nodemailer from "nodemailer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMailer,
  MailConfigError,
  MailDeliveryError,
  mailerConfigFromEnv,
  type MailerConfig,
} from "./send";
import type { CreateTransport, OutgoingMail } from "./transport";

// Valeurs factices uniquement : elles servent à vérifier que rien ne fuit.
const APP_URL = "http://localhost:3000";
const TOKEN = "jeton-factice-qui-ne-doit-pas-fuiter-en-production-42";
const RECIPIENT = "destinataire@example.com";
const SMTP_USER = "expediteur-factice@example.com";
const SMTP_PASS = "mot-de-passe-smtp-factice-0000";
const MAIL_FROM = "Portfolio <expediteur-factice@example.com>";
const RESET_LINK = `${APP_URL}/admin/reinitialiser?token=${TOKEN}`;

const SECRETS = [TOKEN, SMTP_USER, SMTP_PASS, RESET_LINK];

function config(overrides: Partial<MailerConfig> = {}): MailerConfig {
  return {
    appEnv: "development",
    appUrl: APP_URL,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: SMTP_USER,
    smtpPass: SMTP_PASS,
    mailFrom: MAIL_FROM,
    ...overrides,
  };
}

/** Journal capturé : tout ce que le module écrit. */
function captureLogger() {
  const lines: string[] = [];
  return {
    lines,
    all: () => lines.join("\n"),
    logger: {
      info: (message: string) => lines.push(message),
      error: (message: string) => lines.push(message),
    },
  };
}

/** Transport qui fait échouer le test s'il est seulement créé. */
const forbiddenTransport: CreateTransport = vi.fn(() => {
  throw new Error("Aucun transport SMTP ne doit être créé ici.");
});

/** Transport de production simulé : enregistre les messages, n'ouvre rien. */
function fakeTransport() {
  const sent: OutgoingMail[] = [];
  const create = vi.fn<CreateTransport>(() => ({
    sendMail: async (mail: OutgoingMail) => {
      sent.push(mail);
      return { messageId: "<factice@example.com>" };
    },
  }));
  return { sent, create };
}

beforeEach(() => {
  vi.mocked(forbiddenTransport).mockClear();
});

describe("APP_ENV=development : aucun envoi", () => {
  it("n'ouvre aucun transport, même avec des identifiants SMTP renseignés", async () => {
    const log = captureLogger();
    const mailer = createMailer(config(), {
      createTransport: forbiddenTransport,
      logger: log.logger,
    });

    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    await mailer.sendEmailVerification({ to: RECIPIENT, token: TOKEN });
    await mailer.sendEmailChangeNotice({ to: RECIPIENT, newEmail: "nouvelle@example.org" });

    expect(forbiddenTransport).not.toHaveBeenCalled();
  });

  it("affiche le lien complet dans la console", async () => {
    const log = captureLogger();
    const mailer = createMailer(config(), { createTransport: forbiddenTransport, logger: log.logger });

    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    await mailer.sendEmailVerification({ to: RECIPIENT, token: TOKEN });

    expect(log.lines).toHaveLength(2);
    expect(log.lines[0]).toContain("aucun e-mail envoyé (réinitialisation du mot de passe)");
    expect(log.lines[0]).toContain(`Lien : ${RESET_LINK}`);
    expect(log.lines[1]).toContain("(validation d'adresse)");
    expect(log.lines[1]).toContain(`Lien : ${APP_URL}/admin/verifier-email?token=${TOKEN}`);
  });

  it("n'affiche ni identifiant ni mot de passe SMTP", async () => {
    const log = captureLogger();
    const mailer = createMailer(config(), { createTransport: forbiddenTransport, logger: log.logger });
    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });

    expect(log.all()).not.toContain(SMTP_USER);
    expect(log.all()).not.toContain(SMTP_PASS);
    expect(log.all()).not.toContain(MAIL_FROM);
  });

  it("n'exige pas les identifiants SMTP", async () => {
    const log = captureLogger();
    const mailer = createMailer(
      config({ smtpUser: undefined, smtpPass: undefined, mailFrom: undefined }),
      { createTransport: forbiddenTransport, logger: log.logger },
    );
    await expect(mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN })).resolves.toBeUndefined();
  });

  it("traite toute valeur autre que « production » comme le développement", async () => {
    const log = captureLogger();
    const mailer = createMailer(config({ appEnv: "staging" as MailerConfig["appEnv"] }), {
      createTransport: forbiddenTransport,
      logger: log.logger,
    });
    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    expect(forbiddenTransport).not.toHaveBeenCalled();
    expect(log.all()).toContain("aucun e-mail envoyé");
  });
});

describe("APP_ENV=production : envoi réel", () => {
  it("envoie par le transport SMTP, en texte et en HTML", async () => {
    const log = captureLogger();
    const transport = fakeTransport();
    const mailer = createMailer(config({ appEnv: "production" }), {
      createTransport: transport.create,
      logger: log.logger,
    });

    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });

    expect(transport.create).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      user: SMTP_USER,
      pass: SMTP_PASS,
    });
    expect(transport.sent).toHaveLength(1);
    const [mail] = transport.sent;
    expect(mail.from).toBe(MAIL_FROM);
    expect(mail.to).toBe(RECIPIENT);
    expect(mail.subject).toBe("Réinitialisation de votre mot de passe");
    expect(mail.text).toContain(RESET_LINK);
    expect(mail.html).toContain(RESET_LINK);
  });

  it("ne journalise ni lien, ni jeton, ni destinataire, ni identifiant", async () => {
    const log = captureLogger();
    const mailer = createMailer(config({ appEnv: "production" }), {
      createTransport: fakeTransport().create,
      logger: log.logger,
    });

    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    await mailer.sendEmailVerification({ to: RECIPIENT, token: TOKEN });

    expect(log.lines).toEqual([
      "[e-mail] Message envoyé (réinitialisation du mot de passe).",
      "[e-mail] Message envoyé (validation d'adresse).",
    ]);
    for (const secret of [...SECRETS, RECIPIENT, APP_URL]) expect(log.all()).not.toContain(secret);
  });

  it("crée le transport une seule fois", async () => {
    const transport = fakeTransport();
    const mailer = createMailer(config({ appEnv: "production" }), {
      createTransport: transport.create,
      logger: captureLogger().logger,
    });
    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN });
    expect(transport.create).toHaveBeenCalledTimes(1);
    expect(transport.sent).toHaveLength(2);
  });

  it.each([
    ["SMTP_USER", { smtpUser: undefined }],
    ["SMTP_PASS", { smtpPass: undefined }],
    ["MAIL_FROM", { mailFrom: undefined }],
    ["SMTP_USER", { smtpUser: "   " }],
    ["SMTP_PASS", { smtpPass: "" }],
  ] as const)("refuse d'envoyer sans %s, avant toute connexion", async (variable, missing) => {
    const log = captureLogger();
    const mailer = createMailer(config({ appEnv: "production", ...missing }), {
      createTransport: forbiddenTransport,
      logger: log.logger,
    });

    const error = await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN }).catch((e) => e);

    expect(error).toBeInstanceOf(MailConfigError);
    expect((error as MailConfigError).variables).toEqual([variable]);
    expect((error as Error).message).toContain(variable);
    for (const secret of SECRETS) expect((error as Error).message).not.toContain(secret);
    expect(forbiddenTransport).not.toHaveBeenCalled();
    expect(log.lines).toEqual([]);
  });

  it("nomme toutes les variables manquantes, sans leurs valeurs", async () => {
    const mailer = createMailer(
      config({ appEnv: "production", smtpUser: undefined, smtpPass: undefined, mailFrom: undefined }),
      { createTransport: forbiddenTransport, logger: captureLogger().logger },
    );
    await expect(mailer.sendEmailVerification({ to: RECIPIENT, token: TOKEN })).rejects.toThrow(
      "SMTP_USER, SMTP_PASS, MAIL_FROM",
    );
  });

  it("en cas d'échec SMTP, ne journalise que le code d'erreur", async () => {
    const log = captureLogger();
    const smtpError = Object.assign(
      new Error(`Invalid login: 535 ${SMTP_USER} ${SMTP_PASS} ${RESET_LINK}`),
      { code: "EAUTH", responseCode: 535, response: `535 ${SMTP_USER}` },
    );
    const mailer = createMailer(config({ appEnv: "production" }), {
      createTransport: () => ({ sendMail: async () => Promise.reject(smtpError) }),
      logger: log.logger,
    });

    const error = await mailer.sendPasswordReset({ to: RECIPIENT, token: TOKEN }).catch((e) => e);

    expect(error).toBeInstanceOf(MailDeliveryError);
    expect((error as MailDeliveryError).code).toBe("EAUTH, SMTP 535");
    expect((error as Error).message).toBe("L'e-mail n'a pas pu être envoyé.");
    expect(log.lines).toEqual([
      "[e-mail] Échec de l'envoi (réinitialisation du mot de passe) : EAUTH, SMTP 535.",
    ]);
    for (const secret of [...SECRETS, RECIPIENT]) expect(log.all()).not.toContain(secret);
  });
});

describe("destinataire", () => {
  it.each(["pas-une-adresse", "a@example.com\r\nBcc: autre@example.com", ""])(
    "refuse une adresse invalide (%j) sans la recopier",
    async (to) => {
      const log = captureLogger();
      const mailer = createMailer(config({ appEnv: "production" }), {
        createTransport: forbiddenTransport,
        logger: log.logger,
      });
      const error = await mailer.sendPasswordReset({ to, token: TOKEN }).catch((e) => e);
      expect((error as Error).message).toBe("Adresse e-mail du destinataire invalide.");
      if (to !== "") expect((error as Error).message).not.toContain(to);
      expect(forbiddenTransport).not.toHaveBeenCalled();
    },
  );
});

describe("mailerConfigFromEnv", () => {
  it("reprend les variables validées par lib/env", () => {
    expect(
      mailerConfigFromEnv({
        APP_ENV: "production",
        APP_URL,
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: 587,
        SMTP_USER,
        SMTP_PASS,
        MAIL_FROM,
      }),
    ).toEqual(config({ appEnv: "production" }));
  });
});

// ---------------------------------------------------------------------------
// Câblage réel : fonctions exportées, lib/env et vrai module nodemailer
// ---------------------------------------------------------------------------

function stubAppEnv(appEnv: "development" | "production") {
  const values: Record<string, string> = {
    APP_ENV: appEnv,
    APP_URL,
    DATABASE_URL: "postgresql://postgres:factice@localhost:5432/portfolio",
    DIRECT_URL: "postgresql://postgres:factice@localhost:5432/portfolio",
    SESSION_SECRET: "secret-de-session-factice-de-plus-de-32-caracteres",
    NEXT_PUBLIC_SUPABASE_URL: "https://projet.example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "cle-service-factice",
    SUPABASE_STORAGE_BUCKET_ARTICLES: "dev-articles",
    SUPABASE_STORAGE_BUCKET_PROJECTS: "dev-projets",
    SUPABASE_STORAGE_BUCKET_PROFILE: "dev-profil",
    SUPABASE_STORAGE_BUCKET_STACK: "dev-stack",
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "587",
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
}

describe("câblage de l'application (send.ts → lib/env → transport.ts → nodemailer)", () => {
  let socketConnect: ReturnType<typeof vi.spyOn>;
  let tlsConnect: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    // Toute ouverture de socket fait échouer le test.
    socketConnect = vi.spyOn(net.Socket.prototype, "connect").mockImplementation(() => {
      throw new Error("Connexion réseau interdite dans ce test.");
    });
    tlsConnect = vi.spyOn(tls, "connect").mockImplementation(() => {
      throw new Error("Connexion TLS interdite dans ce test.");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("development : nodemailer n'est jamais appelé, aucun socket ouvert, lien dans la console", async () => {
    stubAppEnv("development");
    const createTransport = vi.spyOn(nodemailer, "createTransport").mockImplementation(() => {
      throw new Error("nodemailer.createTransport ne doit pas être appelé en développement.");
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendPasswordReset } = await import("./send");
    await sendPasswordReset({ to: RECIPIENT, token: TOKEN });

    expect(createTransport).not.toHaveBeenCalled();
    expect(socketConnect).not.toHaveBeenCalled();
    expect(tlsConnect).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toContain(`Lien : ${RESET_LINK}`);
  });

  it("production : Gmail sur le port 587 en STARTTLS obligatoire, sans journal SMTP", async () => {
    stubAppEnv("production");
    const sendMail = vi.fn(async () => ({ messageId: "<factice@example.com>" }));
    const createTransport = vi
      .spyOn(nodemailer, "createTransport")
      .mockImplementation((() => ({ sendMail })) as unknown as typeof nodemailer.createTransport);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendEmailVerification } = await import("./send");
    await sendEmailVerification({ to: RECIPIENT, token: TOKEN });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport.mock.calls[0][0]).toMatchObject({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      logger: false,
      debug: false,
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(socketConnect).not.toHaveBeenCalled();
    expect(info.mock.calls.flat().join("\n")).toBe("[e-mail] Message envoyé (validation d'adresse).");
  });
});
