/**
 * Modèles des e-mails de l'administration, en français, en texte brut et en
 * HTML simple (styles en ligne, couleurs de la charte).
 *
 * Module pur : ni secret, ni entrée/sortie. Les liens sont construits à partir
 * de `APP_URL`, passé par l'appelant (`lib/mail/send.ts`).
 */

export type MailKind = "email-verification" | "password-reset" | "email-change-notice";

export type RenderedMail = {
  kind: MailKind;
  subject: string;
  text: string;
  html: string;
  /** Lien principal du message (affiché dans la console en développement). */
  link: string;
};

/** Libellés utilisés dans la console et les journaux (jamais le contenu). */
export const MAIL_LABELS: Record<MailKind, string> = {
  "email-verification": "validation d'adresse",
  "password-reset": "réinitialisation du mot de passe",
  "email-change-notice": "notification de changement d'adresse",
};

/** Pages de l'admin visées par les liens (créées aux étapes 7 et 8). */
export const EMAIL_VERIFICATION_PATH = "/admin/verifier-email";
export const PASSWORD_RESET_PATH = "/admin/reinitialiser";
export const SIGN_IN_PATH = "/admin/connexion";

/** Durées de validité annoncées dans les messages (cahier §3.1). */
export const EMAIL_VERIFICATION_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_HOURS = 1;

// Charte graphique (CLAUDE.md) : fond crème, texte bleu-gris (8,87).
const CREAM = "#f4f1de";
const SLATE_BLUE = "#3d405b";

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/**
 * Construit un lien absolu à partir de `APP_URL` (qui peut contenir un chemin
 * de base), d'un chemin de l'admin et de paramètres encodés.
 */
export function buildAppLink(
  appUrl: string,
  path: string,
  params: Record<string, string> = {},
): string {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    throw new Error("APP_URL doit être une URL http(s) valide.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL doit être une URL http(s) valide.");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`;
  url.search = "";
  url.hash = "";
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

/** « taoufik@example.com » devient « t***@example.com ». */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireToken(token: string): string {
  if (token.trim() === "") throw new Error("Le jeton du lien est vide.");
  return token;
}

const FOOTER =
  "Message automatique envoyé par l'administration du portfolio. Merci de ne pas y répondre.";

type Layout = {
  kind: MailKind;
  subject: string;
  /** Paragraphes avant le bouton. */
  intro: string[];
  link: string;
  action: string;
  /** Paragraphes après le bouton. */
  outro: string[];
};

/** Met en forme un message dans ses deux versions (texte brut et HTML). */
function render({ kind, subject, intro, link, action, outro }: Layout): RenderedMail {
  const text = [
    "Bonjour,",
    "",
    ...intro.flatMap((paragraph) => [paragraph, ""]),
    `${action} :`,
    link,
    "",
    ...outro.flatMap((paragraph) => [paragraph, ""]),
    "--",
    FOOTER,
    "",
  ].join("\n");

  const paragraph = (content: string) => `<p style="margin:0 0 16px;">${escapeHtml(content)}</p>`;
  const href = escapeHtml(link);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px 16px;background-color:${CREAM};color:${SLATE_BLUE};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;">
<div style="max-width:560px;margin:0 auto;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(subject)}</h1>
${paragraph("Bonjour,")}
${intro.map(paragraph).join("\n")}
<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;padding:12px 20px;border-radius:6px;background-color:${SLATE_BLUE};color:${CREAM};font-weight:bold;text-decoration:underline;">${escapeHtml(action)}</a></p>
<p style="margin:0 0 16px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${href}" style="color:${SLATE_BLUE};word-break:break-all;">${href}</a></p>
${outro.map(paragraph).join("\n")}
<hr style="margin:24px 0 16px;border:0;border-top:1px solid ${SLATE_BLUE};">
<p style="margin:0;font-size:14px;">${escapeHtml(FOOTER)}</p>
</div>
</body>
</html>
`;

  return { kind, subject, text, html, link };
}

// ---------------------------------------------------------------------------
// Modèles
// ---------------------------------------------------------------------------

/** Lien de validation d'adresse (après création du compte ou changement d'adresse). */
export function renderEmailVerification({ appUrl, token }: { appUrl: string; token: string }) {
  return render({
    kind: "email-verification",
    subject: "Validez votre adresse e-mail",
    intro: [
      "Pour valider cette adresse e-mail comme adresse du compte d'administration du portfolio, ouvrez le lien ci-dessous.",
    ],
    action: "Valider mon adresse",
    link: buildAppLink(appUrl, EMAIL_VERIFICATION_PATH, { token: requireToken(token) }),
    outro: [
      `Ce lien est valable ${EMAIL_VERIFICATION_TTL_HOURS} heures et ne peut servir qu'une seule fois.`,
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : aucune modification ne sera faite.",
    ],
  });
}

/** Lien de réinitialisation du mot de passe (« Mot de passe oublié »). */
export function renderPasswordReset({ appUrl, token }: { appUrl: string; token: string }) {
  return render({
    kind: "password-reset",
    subject: "Réinitialisation de votre mot de passe",
    intro: [
      "Une réinitialisation du mot de passe du compte d'administration du portfolio a été demandée.",
    ],
    action: "Choisir un nouveau mot de passe",
    link: buildAppLink(appUrl, PASSWORD_RESET_PATH, { token: requireToken(token) }),
    outro: [
      `Ce lien est valable ${PASSWORD_RESET_TTL_HOURS} heure et ne peut servir qu'une seule fois. Une fois le nouveau mot de passe enregistré, les autres sessions ouvertes seront fermées.`,
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable.",
    ],
  });
}

/**
 * Notification envoyée à l'ancienne adresse quand un changement d'adresse est
 * demandé. La nouvelle adresse est masquée. Pas de jeton : le lien mène à la
 * page de connexion.
 */
export function renderEmailChangeNotice({
  appUrl,
  newEmail,
}: {
  appUrl: string;
  newEmail: string;
}) {
  return render({
    kind: "email-change-notice",
    subject: "Changement de l'adresse e-mail de votre compte",
    intro: [
      "Un changement de l'adresse e-mail du compte d'administration du portfolio a été demandé.",
      `Nouvelle adresse demandée : ${maskEmail(newEmail)}`,
      "Le changement ne prendra effet qu'après validation depuis la nouvelle adresse. D'ici là, cette adresse reste celle du compte.",
      "Si vous n'êtes pas à l'origine de cette demande, connectez-vous sans attendre et changez votre mot de passe.",
    ],
    action: "Me connecter",
    link: buildAppLink(appUrl, SIGN_IN_PATH),
    outro: [],
  });
}
