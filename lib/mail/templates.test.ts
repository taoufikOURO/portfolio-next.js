import { describe, expect, it } from "vitest";

import {
  buildAppLink,
  escapeHtml,
  maskEmail,
  renderEmailChangeNotice,
  renderEmailVerification,
  renderPasswordReset,
  type RenderedMail,
} from "./templates";

const APP_URL = "https://portfolio.example.com";
const TOKEN = "jeton_factice-0123456789abcdefABCDEF";

/** Le lien doit figurer dans le texte brut et dans le HTML (lien cliquable et texte). */
function expectLinkEverywhere(mail: RenderedMail, link: string) {
  expect(mail.link).toBe(link);
  expect(mail.text).toContain(link);
  expect(mail.html).toContain(`href="${escapeHtml(link)}"`);
  expect(mail.html.split(escapeHtml(link)).length - 1).toBeGreaterThanOrEqual(3);
}

/** Points communs aux trois modèles. */
function expectFrenchLayout(mail: RenderedMail) {
  expect(mail.text.startsWith("Bonjour,\n")).toBe(true);
  expect(mail.text).toContain("Merci de ne pas y répondre.");
  expect(mail.text).not.toMatch(/<[a-z!/]/i);
  expect(mail.html).toContain('<html lang="fr">');
  expect(mail.html).toContain('<meta charset="utf-8">');
  expect(mail.html).toContain(`<title>${escapeHtml(mail.subject)}</title>`);
  expect(mail.html).toContain("Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur");
  // Couleurs de la charte uniquement : crème et bleu-gris.
  const colors = new Set([...mail.html.matchAll(/#([0-9a-f]{6})\b/gi)].map((m) => m[1].toLowerCase()));
  expect([...colors].sort()).toEqual(["3d405b", "f4f1de"]);
}

describe("modèle : validation d'adresse", () => {
  const mail = renderEmailVerification({ appUrl: APP_URL, token: TOKEN });

  it("contient le lien complet vers /admin/verifier-email, construit sur APP_URL", () => {
    expectLinkEverywhere(mail, `${APP_URL}/admin/verifier-email?token=${TOKEN}`);
  });

  it("est rédigé en français et annonce une validité de 24 heures", () => {
    expect(mail.kind).toBe("email-verification");
    expect(mail.subject).toBe("Validez votre adresse e-mail");
    expect(mail.text).toContain("Valider mon adresse :");
    expect(mail.text).toContain("valable 24 heures");
    expect(mail.text).toContain("une seule fois");
    expect(mail.html).toContain("valable 24 heures");
    expectFrenchLayout(mail);
  });
});

describe("modèle : réinitialisation du mot de passe", () => {
  const mail = renderPasswordReset({ appUrl: APP_URL, token: TOKEN });

  it("contient le lien complet vers /admin/reinitialiser, construit sur APP_URL", () => {
    expectLinkEverywhere(mail, `${APP_URL}/admin/reinitialiser?token=${TOKEN}`);
  });

  it("est rédigé en français et annonce une validité d'une heure", () => {
    expect(mail.kind).toBe("password-reset");
    expect(mail.subject).toBe("Réinitialisation de votre mot de passe");
    expect(mail.text).toContain("Choisir un nouveau mot de passe :");
    expect(mail.text).toContain("valable 1 heure");
    expect(mail.text).toContain("votre mot de passe actuel reste valable");
    expectFrenchLayout(mail);
  });
});

describe("modèle : notification à l'ancienne adresse", () => {
  const mail = renderEmailChangeNotice({ appUrl: APP_URL, newEmail: "nouvelle.adresse@example.org" });

  it("renvoie vers la page de connexion, sans jeton", () => {
    expectLinkEverywhere(mail, `${APP_URL}/admin/connexion`);
    expect(mail.text).not.toContain("token");
    expect(mail.html).not.toContain("token");
  });

  it("masque la nouvelle adresse et explique que le changement n'est pas encore effectif", () => {
    expect(mail.kind).toBe("email-change-notice");
    expect(mail.subject).toBe("Changement de l'adresse e-mail de votre compte");
    expect(mail.text).toContain("Nouvelle adresse demandée : n***@example.org");
    expect(mail.text).not.toContain("nouvelle.adresse@");
    expect(mail.html).not.toContain("nouvelle.adresse@");
    expect(mail.text).toContain("ne prendra effet qu'après validation");
    expect(mail.text).toContain("Me connecter :");
    expectFrenchLayout(mail);
  });
});

describe("construction des liens", () => {
  it("ignore la barre oblique finale d'APP_URL et conserve un chemin de base", () => {
    expect(buildAppLink("http://localhost:3000/", "/admin/connexion")).toBe(
      "http://localhost:3000/admin/connexion",
    );
    expect(buildAppLink("https://example.com/base/", "/admin/connexion")).toBe(
      "https://example.com/base/admin/connexion",
    );
  });

  it("ignore une requête ou une ancre présentes dans APP_URL", () => {
    expect(buildAppLink("https://example.com/?a=1#x", "/admin/connexion")).toBe(
      "https://example.com/admin/connexion",
    );
  });

  it("encode les paramètres", () => {
    expect(buildAppLink(APP_URL, "/admin/reinitialiser", { token: "a b&c=d" })).toBe(
      `${APP_URL}/admin/reinitialiser?token=a+b%26c%3Dd`,
    );
  });

  it("refuse une APP_URL invalide ou non http(s), et un jeton vide", () => {
    expect(() => buildAppLink("pas une url", "/admin")).toThrow("APP_URL");
    expect(() => buildAppLink("ftp://example.com", "/admin")).toThrow("APP_URL");
    expect(() => renderPasswordReset({ appUrl: APP_URL, token: "  " })).toThrow("jeton");
  });
});

describe("échappement et masquage", () => {
  it("échappe le HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("n'injecte jamais de balise venant de l'adresse saisie", () => {
    const mail = renderEmailChangeNotice({ appUrl: APP_URL, newEmail: "<b>@example.org" });
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain("&lt;***@example.org");
  });

  it("masque l'adresse en gardant la première lettre et le domaine", () => {
    expect(maskEmail("taoufik@example.com")).toBe("t***@example.com");
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail("sans-arobase")).toBe("***");
  });
});
