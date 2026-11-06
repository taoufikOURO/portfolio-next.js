import "server-only";

import { z } from "zod";

import type { Env } from "../env-schema";
import {
  MAIL_LABELS,
  renderEmailChangeNotice,
  renderEmailVerification,
  renderPasswordReset,
  type RenderedMail,
} from "./templates";
import {
  createSmtpTransport,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  type CreateTransport,
  type MailTransport,
  type SmtpSettings,
} from "./transport";

/**
 * Envoi des e-mails selon `APP_ENV` :
 * - `development` : aucun transport créé, aucune connexion SMTP ; le lien
 *   complet est affiché dans la console du serveur (seule exception à la règle
 *   « aucun lien dans les journaux », voulue par le cahier §3.2) ;
 * - `production` : envoi réel par SMTP. Les journaux ne contiennent que le
 *   type de message et, en cas d'échec, le code d'erreur : jamais le
 *   destinataire, le lien, les identifiants ni le message d'erreur brut.
 */

export type MailerConfig = {
  appEnv: "development" | "production";
  appUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  mailFrom?: string;
};

export type MailLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type MailerDependencies = {
  createTransport?: CreateTransport;
  logger?: MailLogger;
};

/** Configuration SMTP incomplète en production. Nomme les variables, jamais leurs valeurs. */
export class MailConfigError extends Error {
  readonly variables: string[];

  constructor(variables: string[]) {
    super(
      `Envoi d'e-mail impossible : ${variables.join(", ")} manquant(s) ou vide(s) (obligatoire(s) quand APP_ENV=production).`,
    );
    this.name = "MailConfigError";
    this.variables = variables;
  }
}

/** Échec de l'envoi SMTP. Le message reste générique ; seul le code d'erreur est conservé. */
export class MailDeliveryError extends Error {
  readonly code?: string;

  constructor(code?: string) {
    super("L'e-mail n'a pas pu être envoyé.");
    this.name = "MailDeliveryError";
    this.code = code;
  }
}

export function mailerConfigFromEnv(
  env: Pick<
    Env,
    "APP_ENV" | "APP_URL" | "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS" | "MAIL_FROM"
  >,
): MailerConfig {
  return {
    appEnv: env.APP_ENV,
    appUrl: env.APP_URL,
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    smtpUser: env.SMTP_USER,
    smtpPass: env.SMTP_PASS,
    mailFrom: env.MAIL_FROM,
  };
}

const recipientSchema = z.email();

function parseRecipient(to: string): string {
  const result = recipientSchema.safeParse(to.trim());
  // L'adresse n'est pas reprise dans le message d'erreur.
  if (!result.success) throw new Error("Adresse e-mail du destinataire invalide.");
  return result.data;
}

const isBlank = (value: string | undefined) => value === undefined || value.trim() === "";

function requireSmtp(config: MailerConfig): SmtpSettings & { from: string } {
  const missing = [
    isBlank(config.smtpUser) && "SMTP_USER",
    isBlank(config.smtpPass) && "SMTP_PASS",
    isBlank(config.mailFrom) && "MAIL_FROM",
  ].filter((name): name is string => typeof name === "string");
  if (missing.length > 0) throw new MailConfigError(missing);

  return {
    host: isBlank(config.smtpHost) ? DEFAULT_SMTP_HOST : config.smtpHost!.trim(),
    port: config.smtpPort ?? DEFAULT_SMTP_PORT,
    user: config.smtpUser!.trim(),
    // Le mot de passe n'est jamais rogné.
    pass: config.smtpPass!,
    from: config.mailFrom!.trim(),
  };
}

/** Résumé sûr d'une erreur SMTP : code et code de réponse uniquement. */
function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { code, responseCode } = error as { code?: unknown; responseCode?: unknown };
  const parts = [
    typeof code === "string" && /^[A-Z][A-Z0-9_]*$/.test(code) ? code : undefined,
    typeof responseCode === "number" ? `SMTP ${responseCode}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export type Mailer = ReturnType<typeof createMailer>;

export function createMailer(config: MailerConfig, dependencies: MailerDependencies = {}) {
  const { createTransport = createSmtpTransport, logger = console } = dependencies;
  let transport: MailTransport | undefined;

  async function deliver(to: string, mail: RenderedMail): Promise<void> {
    const recipient = parseRecipient(to);
    const label = MAIL_LABELS[mail.kind];

    // Seule la valeur exacte « production » déclenche un envoi réel.
    if (config.appEnv !== "production") {
      logger.info(
        [
          `[e-mail] APP_ENV=${config.appEnv} : aucun e-mail envoyé (${label}).`,
          `  Destinataire : ${recipient}`,
          `  Lien : ${mail.link}`,
        ].join("\n"),
      );
      return;
    }

    const { from, ...smtp } = requireSmtp(config);
    transport ??= createTransport(smtp);
    try {
      await transport.sendMail({
        from,
        to: recipient,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (error) {
      const code = errorCode(error);
      logger.error(`[e-mail] Échec de l'envoi (${label})${code ? ` : ${code}` : ""}.`);
      throw new MailDeliveryError(code);
    }
    logger.info(`[e-mail] Message envoyé (${label}).`);
  }

  return {
    sendEmailVerification: ({ to, token }: { to: string; token: string }) =>
      deliver(to, renderEmailVerification({ appUrl: config.appUrl, token })),

    sendPasswordReset: ({ to, token }: { to: string; token: string }) =>
      deliver(to, renderPasswordReset({ appUrl: config.appUrl, token })),

    /** `to` : ancienne adresse ; `newEmail` : adresse demandée (masquée dans le message). */
    sendEmailChangeNotice: ({ to, newEmail }: { to: string; newEmail: string }) =>
      deliver(to, renderEmailChangeNotice({ appUrl: config.appUrl, newEmail })),
  };
}

// ---------------------------------------------------------------------------
// Instance de l'application
// ---------------------------------------------------------------------------

let appMailer: Mailer | undefined;

/**
 * `lib/env` est chargé au premier envoi, pas à l'import : importer ce module ne
 * valide donc pas toute la configuration (tests, pages qui n'envoient rien).
 */
async function getAppMailer(): Promise<Mailer> {
  if (!appMailer) {
    const { env } = await import("../env");
    appMailer = createMailer(mailerConfigFromEnv(env));
  }
  return appMailer;
}

export async function sendEmailVerification(input: { to: string; token: string }) {
  return (await getAppMailer()).sendEmailVerification(input);
}

export async function sendPasswordReset(input: { to: string; token: string }) {
  return (await getAppMailer()).sendPasswordReset(input);
}

export async function sendEmailChangeNotice(input: { to: string; newEmail: string }) {
  return (await getAppMailer()).sendEmailChangeNotice(input);
}
