// Envoi de test réel des trois modèles d'e-mail (validation d'adresse,
// réinitialisation du mot de passe, notification de changement d'adresse).
//
// Lancement : `pnpm mail:test`, soit
//   node --env-file=.env --conditions=react-server \
//     --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
//     --import ./scripts/ts-resolve-hook.mjs scripts/send-test-mail.ts
//
// - Les trois messages sont envoyés à ADMIN_EMAIL, avec l'objet préfixé par
//   « [Test] » et un jeton factice : les liens ne mènent à rien d'utilisable.
// - Ce script passe en production pour lui seul (envoi réel par SMTP) : le
//   `APP_ENV` de `.env` n'est ni lu pour décider, ni modifié.
// - La console n'affiche ni adresse, ni lien, ni identifiant : seulement le type
//   de chaque message et son résultat (ou le code d'erreur SMTP).
//
// Exécuté par Node 24 hors de Next.js (E33, E42) : imports relatifs sans
// extension (hook de résolution), pas d'alias `@/`. `--conditions=react-server`
// neutralise `import "server-only"` des modules de `lib/mail/`. Comme le seed,
// il ne charge pas `lib/env.ts` : il ne dépend ni de Supabase ni de la base.

import {
  createMailer,
  MailConfigError,
  MailDeliveryError,
  type MailerConfig,
} from "../lib/mail/send";
import { createSmtpTransport, type CreateTransport } from "../lib/mail/transport";

const SUBJECT_PREFIX = "[Test] ";
const FAKE_TOKEN = "jeton-factice-ne-mene-nulle-part";
const FAKE_NEW_EMAIL = "nouvelle.adresse@example.com";

/** Valeur d'une variable, rognée ; `undefined` si absente ou vide. */
function variable(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

function fail(message: string): never {
  console.error(`[mail:test] ${message}`);
  process.exit(1);
}

const adminEmail = variable("ADMIN_EMAIL");
const appUrl = variable("APP_URL");
if (adminEmail === undefined) fail("ADMIN_EMAIL manquant ou vide : aucun message envoyé.");
if (appUrl === undefined) fail("APP_URL manquant ou vide : aucun message envoyé.");

const rawPort = variable("SMTP_PORT");
const smtpPort = rawPort === undefined ? undefined : Number(rawPort);
if (smtpPort !== undefined && !(Number.isInteger(smtpPort) && smtpPort >= 1 && smtpPort <= 65535)) {
  fail("SMTP_PORT doit être un numéro de port : aucun message envoyé.");
}

// Production pour ce script seulement. Les identifiants viennent de `.env` ; le
// mot de passe n'est pas rogné (ses espaces font partie de la valeur).
const config: MailerConfig = {
  appEnv: "production",
  appUrl,
  smtpHost: variable("SMTP_HOST"),
  smtpPort,
  smtpUser: variable("SMTP_USER"),
  smtpPass: process.env.SMTP_PASS,
  mailFrom: variable("MAIL_FROM"),
};

// Même transport que l'application, avec l'objet préfixé par « [Test] ».
const createTransport: CreateTransport = (settings) => {
  const transport = createSmtpTransport(settings);
  return {
    sendMail: (mail) => transport.sendMail({ ...mail, subject: `${SUBJECT_PREFIX}${mail.subject}` }),
  };
};

// Journaux de `lib/mail/` repris tels quels : ils ne contiennent ni destinataire,
// ni lien, ni identifiant (E41).
const mailer = createMailer(config, { createTransport });

const messages = [
  { label: "validation d'adresse", send: () => mailer.sendEmailVerification({ to: adminEmail, token: FAKE_TOKEN }) },
  { label: "réinitialisation du mot de passe", send: () => mailer.sendPasswordReset({ to: adminEmail, token: FAKE_TOKEN }) },
  {
    label: "notification de changement d'adresse",
    send: () => mailer.sendEmailChangeNotice({ to: adminEmail, newEmail: FAKE_NEW_EMAIL }),
  },
];

let failures = 0;
for (const message of messages) {
  try {
    await message.send();
  } catch (error) {
    failures += 1;
    if (error instanceof MailConfigError) {
      // Nomme les variables manquantes, jamais leurs valeurs.
      console.error(`[mail:test] ${error.message}`);
      process.exit(1);
    }
    if (!(error instanceof MailDeliveryError)) {
      // Message brut non repris : il pourrait contenir une adresse ou un identifiant.
      console.error(`[mail:test] Échec inattendu (${message.label}).`);
    }
    // Pour MailDeliveryError, `lib/mail/send.ts` a déjà journalisé le code d'erreur.
  }
}

if (failures > 0) {
  console.error(`[mail:test] ${failures} message(s) sur ${messages.length} non envoyé(s).`);
  process.exit(1);
}
console.log(`[mail:test] ${messages.length} messages envoyés à ADMIN_EMAIL. Vérifiez la boîte de réception (et les courriers indésirables).`);
