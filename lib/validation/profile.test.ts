import { describe, expect, it } from "vitest";

import {
  decideResumeChange,
  normalizeProfileUrl,
  photoSchema,
  profileDetailsSchema,
  PROFILE_LIMITS,
  PROFILE_MESSAGES,
  resumeSchema,
  type ResumeInput,
} from "./profile";

const pdf = () => new File([new Uint8Array([37, 80, 68, 70])], "cv.pdf", { type: "application/pdf" });

const details = (overrides: Record<string, unknown> = {}) => ({
  firstName: "Taoufik",
  lastName: "Exemple",
  email: "contact@example.com",
  jobTitle: "Développeur",
  bio: "",
  about: "",
  githubUrl: "",
  linkedinUrl: "",
  ...overrides,
});

describe("normalizeProfileUrl", () => {
  it("ajoute https:// quand il manque", () => {
    expect(normalizeProfileUrl("github.com/exemple")).toEqual({ ok: true, url: "https://github.com/exemple" });
    expect(normalizeProfileUrl("www.linkedin.com/in/exemple")).toEqual({
      ok: true,
      url: "https://www.linkedin.com/in/exemple",
    });
    expect(normalizeProfileUrl("//github.com/exemple")).toEqual({ ok: true, url: "https://github.com/exemple" });
  });

  it("garde une adresse déjà en https et rogne les espaces autour", () => {
    expect(normalizeProfileUrl("  https://github.com/exemple  ")).toEqual({
      ok: true,
      url: "https://github.com/exemple",
    });
  });

  it("traite un champ vide comme non renseigné", () => {
    expect(normalizeProfileUrl("   ")).toEqual({ ok: true, url: null });
  });

  it("refuse http:// avec un message dédié, sans le réécrire", () => {
    expect(normalizeProfileUrl("http://github.com/exemple")).toEqual({ ok: false, reason: "not-https" });
  });

  it("refuse les autres schémas, les espaces, les identifiants, les ports et les hôtes sans point", () => {
    for (const value of [
      "javascript:alert(1)",
      "mailto:a@b.fr",
      "ftp://github.com/x",
      "data:text/html,x",
      "https://github.com/a b",
      "https://nom:mdp@github.com/x",
      "https://github.com:8443/x",
      "https://localhost/x",
      "https://github./x",
      "https://",
      "pas une url",
    ]) {
      expect(normalizeProfileUrl(value), value).toEqual({ ok: false, reason: "invalid" });
    }
  });
});

describe("profileDetailsSchema : GitHub et LinkedIn", () => {
  it("ajoute https:// et enregistre l'adresse complète", () => {
    const parsed = profileDetailsSchema.parse(
      details({ githubUrl: "github.com/exemple", linkedinUrl: "linkedin.com/in/exemple" }),
    );
    expect(parsed.githubUrl).toBe("https://github.com/exemple");
    expect(parsed.linkedinUrl).toBe("https://linkedin.com/in/exemple");
  });

  it("accepte un sous-domaine du réseau", () => {
    expect(profileDetailsSchema.parse(details({ linkedinUrl: "fr.linkedin.com/in/exemple" })).linkedinUrl).toBe(
      "https://fr.linkedin.com/in/exemple",
    );
  });

  it("enregistre null pour un lien laissé vide", () => {
    const parsed = profileDetailsSchema.parse(details());
    expect(parsed.githubUrl).toBeNull();
    expect(parsed.linkedinUrl).toBeNull();
  });

  it("refuse une adresse invalide, un autre site, un domaine déguisé et une adresse sans compte", () => {
    for (const value of [
      "pas une url",
      "javascript:alert(1)",
      "https://exemple.fr/exemple",
      "https://github.com.exemple.fr/exemple",
      "https://exemplegithub.com/exemple",
      "https://github.com",
      "https://github.com/",
    ]) {
      const result = profileDetailsSchema.safeParse(details({ githubUrl: value }));
      expect(result.success, value).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(["githubUrl"]);
    }
  });

  it("refuse l'adresse LinkedIn d'un autre site et celle de GitHub, avec le bon message", () => {
    const result = profileDetailsSchema.safeParse(details({ linkedinUrl: "https://github.com/exemple" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe(PROFILE_MESSAGES.linkedinInvalid);
  });

  it("refuse http:// avec le message « doit commencer par https:// »", () => {
    const result = profileDetailsSchema.safeParse(details({ githubUrl: "http://github.com/exemple" }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe(PROFILE_MESSAGES.urlNotHttps);
  });

  it("refuse une adresse trop longue", () => {
    const long = `https://github.com/${"a".repeat(PROFILE_LIMITS.url)}`;
    const result = profileDetailsSchema.safeParse(details({ githubUrl: long }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe(PROFILE_MESSAGES.urlTooLong);
  });
});

describe("profileDetailsSchema : identité", () => {
  it("nettoie les noms et met l'e-mail en minuscules", () => {
    const parsed = profileDetailsSchema.parse(
      details({ firstName: "  Taoufik  ", lastName: "Ouro​-Bang'na", email: " Contact@Example.COM " }),
    );
    expect(parsed.firstName).toBe("Taoufik");
    expect(parsed.lastName).toBe("Ouro-Bang'na");
    expect(parsed.email).toBe("contact@example.com");
  });

  it("exige prénom, nom, e-mail valide et titre", () => {
    const result = profileDetailsSchema.safeParse(details({ firstName: " ", lastName: "", email: "x", jobTitle: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
      expect(messages).toMatchObject({
        firstName: PROFILE_MESSAGES.firstNameRequired,
        lastName: PROFILE_MESSAGES.lastNameRequired,
        email: PROFILE_MESSAGES.emailInvalid,
        jobTitle: PROFILE_MESSAGES.jobTitleRequired,
      });
    }
  });

  it("limite la bio et le texte « À propos », et conserve les retours à la ligne", () => {
    expect(profileDetailsSchema.safeParse(details({ bio: "a".repeat(PROFILE_LIMITS.bio + 1) })).success).toBe(false);
    expect(profileDetailsSchema.safeParse(details({ about: "a".repeat(PROFILE_LIMITS.about + 1) })).success).toBe(false);
    expect(profileDetailsSchema.parse(details({ about: "un\r\ndeux\u0000" })).about).toBe("un\ndeux");
  });

  it("accepte une bio et un « À propos » absents", () => {
    const { bio, about, ...rest } = details();
    void bio;
    void about;
    const parsed = profileDetailsSchema.parse(rest);
    expect(parsed.bio).toBe("");
    expect(parsed.about).toBe("");
  });
});

describe("photoSchema", () => {
  const png = new File([new Uint8Array([1])], "photo.png", { type: "image/png" });

  it("exige un fichier réellement choisi (un champ vide arrive comme un fichier de 0 octet)", () => {
    expect(photoSchema.safeParse({ slot: "photo", file: png }).success).toBe(true);
    expect(photoSchema.safeParse({ slot: "photo", file: new File([], "") }).success).toBe(false);
    expect(photoSchema.safeParse({ slot: "photo", file: null }).success).toBe(false);
  });

  it("n'accepte que les deux emplacements prévus", () => {
    expect(photoSchema.safeParse({ slot: "cutout", file: png }).success).toBe(true);
    expect(photoSchema.safeParse({ slot: "../autre", file: png }).success).toBe(false);
    expect(photoSchema.safeParse({ slot: null, file: png }).success).toBe(false);
  });
});

describe("resumeSchema : un lien OU un PDF, jamais les deux", () => {
  const parse = (value: { resumeUrl?: unknown; resumeFile?: unknown; removePdf?: boolean }) =>
    resumeSchema.safeParse({ resumeUrl: "", resumeFile: null, removePdf: false, ...value });

  it("accepte un lien seul, et ajoute https://", () => {
    const result = parse({ resumeUrl: "exemple.fr/cv.pdf" });
    expect(result.success && result.data.resumeUrl).toBe("https://exemple.fr/cv.pdf");
  });

  it("accepte un PDF seul", () => {
    const result = parse({ resumeFile: pdf() });
    expect(result.success && result.data.resumeFile).toBeInstanceOf(File);
    expect(result.success && result.data.resumeUrl).toBeNull();
  });

  it("refuse un lien et un PDF ensemble, avec le message sous le champ fichier", () => {
    const result = parse({ resumeUrl: "https://exemple.fr/cv.pdf", resumeFile: pdf() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].path).toEqual(["resumeFile"]);
      expect(result.error.issues[0].message).toBe(PROFILE_MESSAGES.resumeBoth);
    }
  });

  it("traite un fichier de 0 octet (champ vide) comme aucun fichier : le lien seul reste valide", () => {
    expect(parse({ resumeUrl: "https://exemple.fr/cv.pdf", resumeFile: new File([], "") }).success).toBe(true);
  });

  it("accepte de ne rien renseigner", () => {
    const result = parse({});
    expect(result.success && result.data.resumeUrl).toBeNull();
    expect(result.success && result.data.resumeFile).toBeNull();
  });

  it("refuse un lien invalide, http:// et javascript:", () => {
    expect(parse({ resumeUrl: "pas une url" }).success).toBe(false);
    expect(parse({ resumeUrl: "http://exemple.fr/cv.pdf" }).success).toBe(false);
    expect(parse({ resumeUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("refuse « supprimer le PDF » avec un lien ou un fichier", () => {
    for (const other of [{ resumeUrl: "https://exemple.fr/cv.pdf" }, { resumeFile: pdf() }]) {
      const result = parse({ removePdf: true, ...other });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(["removePdf"]);
    }
    expect(parse({ removePdf: true }).success).toBe(true);
  });
});

describe("decideResumeChange", () => {
  const input = (overrides: Partial<ResumeInput> = {}): ResumeInput => ({
    resumeUrl: null,
    resumeFile: null,
    removePdf: false,
    ...overrides,
  });
  const none = { resumeUrl: null, resumePath: null };
  const withLink = { resumeUrl: "https://exemple.fr/cv.pdf", resumePath: null };
  const withPdf = { resumeUrl: null, resumePath: "a.pdf" };

  it("un fichier choisi remplace tout", () => {
    const file = pdf();
    for (const current of [none, withLink, withPdf]) {
      expect(decideResumeChange(input({ resumeFile: file }), current)).toEqual({ kind: "pdf", file });
    }
  });

  it("un lien saisi remplace tout, PDF compris", () => {
    for (const current of [none, withLink, withPdf]) {
      expect(decideResumeChange(input({ resumeUrl: "https://autre.fr/cv" }), current)).toEqual({
        kind: "link",
        url: "https://autre.fr/cv",
      });
    }
  });

  it("« supprimer le PDF » vide le CV", () => {
    expect(decideResumeChange(input({ removePdf: true }), withPdf)).toEqual({ kind: "clear" });
  });

  it("un champ du lien vidé efface le lien actuel", () => {
    expect(decideResumeChange(input(), withLink)).toEqual({ kind: "clear" });
  });

  it("sans rien renseigner, un PDF enregistré est conservé, et l'absence de CV reste telle quelle", () => {
    expect(decideResumeChange(input(), withPdf)).toEqual({ kind: "keep" });
    expect(decideResumeChange(input(), none)).toEqual({ kind: "keep" });
  });
});
