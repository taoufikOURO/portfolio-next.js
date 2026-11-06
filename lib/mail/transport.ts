import "server-only";

import nodemailer from "nodemailer";

/**
 * Transport SMTP (Gmail, mot de passe d'application).
 *
 * N'est appelé que par `lib/mail/send.ts`, et seulement quand
 * `APP_ENV=production` : en développement, aucun transport n'est créé.
 * Créer le transport n'ouvre aucune connexion ; elle n'est ouverte qu'au
 * premier envoi.
 */

/** Serveur et port imposés par le cahier des charges (§3.2). */
export const DEFAULT_SMTP_HOST = "smtp.gmail.com";
export const DEFAULT_SMTP_PORT = 587;

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

/** Message déjà rendu, prêt à partir. */
export type OutgoingMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Ce dont `send.ts` a besoin : un envoi, rien d'autre (remplaçable en test). */
export type MailTransport = {
  sendMail(mail: OutgoingMail): Promise<unknown>;
};

export type CreateTransport = (settings: SmtpSettings) => MailTransport;

export const createSmtpTransport: CreateTransport = ({ host, port, user, pass }) =>
  nodemailer.createTransport({
    host,
    port,
    // Port 587 : connexion en clair puis STARTTLS, obligatoire (jamais d'envoi
    // non chiffré, même si le serveur n'annonce pas STARTTLS).
    secure: false,
    requireTLS: true,
    tls: { minVersion: "TLSv1.2", servername: host },
    auth: { user, pass },
    // Jamais de journal SMTP : la commande AUTH contient les identifiants
    // (en base64) et le corps du message contient les liens.
    logger: false,
    debug: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
