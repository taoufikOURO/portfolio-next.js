import { describe, expect, it } from "vitest";

import { firstFieldErrors } from "./auth";
import {
  checkLinkUrl,
  createProjectSchema,
  isValidGitHubUsername,
  linkErrorRow,
  needsSlugChangeConfirmation,
  normalizeGitHubUsername,
  parseCollaborators,
  projectInputFromFormData,
  projectValuesFromFormData,
  PROJECT_LIMITS,
  PROJECT_MESSAGES,
  publicationInputFromFormData,
  publicationSchema,
  publishedSlugChangeMessage,
  updateProjectSchema,
} from "./project";

describe("slug d'un projet publié", () => {
  it.each([
    [true, "ancien", "nouveau", false, true],
    [true, "ancien", "nouveau", true, false],
    [true, "ancien", "ancien", false, false],
    [false, "ancien", "nouveau", false, false],
  ])("publié=%s, %s → %s, confirmé=%s : confirmation exigée = %s", (isPublished, currentSlug, nextSlug, confirmed, expected) => {
    expect(needsSlugChangeConfirmation({ isPublished, currentSlug, nextSlug, confirmed })).toBe(expected);
  });

  it("le message indique que l'adresse publique changera, avec l'ancienne et la nouvelle", () => {
    const message = publishedSlugChangeMessage("ancien", "nouveau");
    expect(message).toMatch(/adresse publique/);
    expect(message).toContain("/projets/ancien");
    expect(message).toContain("/projets/nouveau");
  });

  it("la case n'est confirmée que par la valeur « 1 »", () => {
    const parse = (value?: string) => {
      const data = new FormData();
      data.set("id", "00000000-0000-7000-8000-000000000001");
      data.set("title", "Titre");
      data.set("description", "Description.");
      if (value !== undefined) data.set("confirmSlugChange", value);
      const result = updateProjectSchema.safeParse(projectInputFromFormData(data));
      return result.success && result.data.confirmSlugChange;
    };
    expect(parse("1")).toBe(true);
    expect(parse("on")).toBe(false);
    expect(parse(undefined)).toBe(false);
  });
});

const ID = "00000000-0000-7000-8000-000000000001";
const TECH = "00000000-0000-7000-8000-000000000002";

function form(fields: Record<string, string | string[] | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value instanceof File) data.append(name, value);
    else for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

const BASE = { title: "Mon projet", description: "Une description." };

function parseCreate(fields: Record<string, string | string[] | File>) {
  return createProjectSchema.safeParse(projectInputFromFormData(form({ ...BASE, ...fields })));
}

function errorsOf(fields: Record<string, string | string[] | File>) {
  const result = parseCreate(fields);
  if (result.success) throw new Error("Le schéma aurait dû refuser la saisie.");
  return firstFieldErrors<string>(result.error);
}

describe("nom d'utilisateur GitHub", () => {
  it.each(["octocat", "a", "mona-lisa", "a1-b2-c3", "0", "a".repeat(39), `${"a-".repeat(19)}a`])("accepte « %s »", (name) => {
    expect(isValidGitHubUsername(name)).toBe(true);
  });

  it.each([
    ["tiret en début", "-octocat"],
    ["tiret en fin", "octocat-"],
    ["double tiret", "octo--cat"],
    ["40 caractères", "a".repeat(40)],
    ["majuscules (forme non normalisée)", "Octocat"],
    ["tiret seul", "-"],
    ["vide", ""],
    ["espace", "octo cat"],
    ["souligné", "octo_cat"],
    ["point", "octo.cat"],
    ["accent", "élodie"],
    ["arobase", "@octocat"],
    ["barre oblique", "../admin"],
  ])("refuse : %s", (_label, name) => {
    expect(isValidGitHubUsername(name)).toBe(false);
  });

  it("39 caractères acceptés, 40 refusés", () => {
    expect(isValidGitHubUsername("b".repeat(39))).toBe(true);
    expect(isValidGitHubUsername("b".repeat(40))).toBe(false);
  });

  it("majuscules : le nom saisi est enregistré en minuscules (GitHub ne distingue pas la casse)", () => {
    expect(normalizeGitHubUsername("  OctoCat ")).toBe("octocat");
    expect(parseCollaborators("OctoCat\nMONA-LISA")).toEqual({ ok: true, usernames: ["octocat", "mona-lisa"] });
  });
});

describe("parseCollaborators", () => {
  it("un nom par ligne, lignes vides et espaces ignorés", () => {
    expect(parseCollaborators("octocat\n\n  mona \r\n\r\n")).toEqual({ ok: true, usernames: ["octocat", "mona"] });
    expect(parseCollaborators("")).toEqual({ ok: true, usernames: [] });
  });

  it("doublons de la saisie ignorés, casse comprise, premier ordre conservé", () => {
    expect(parseCollaborators("mona\noctocat\nMona\nOCTOCAT\nmona")).toEqual({ ok: true, usernames: ["mona", "octocat"] });
  });

  it("30 noms distincts acceptés, 31 refusés ; les doublons ne comptent pas", () => {
    const names = Array.from({ length: 31 }, (_, index) => `user${index}`);
    expect(parseCollaborators(names.slice(0, 30).join("\n"))).toMatchObject({ ok: true });
    expect(parseCollaborators([...names.slice(0, 30), ...names.slice(0, 30)].join("\n"))).toMatchObject({ ok: true });
    expect(parseCollaborators(names.join("\n"))).toEqual({ ok: false, message: PROJECT_MESSAGES.collaboratorsTooMany });
  });

  it("cite chaque nom invalide avec sa ligne et la raison", () => {
    const result = parseCollaborators("octocat\n-debut\nfin-\nde--ux\n" + "x".repeat(40));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("« -debut » (ligne 2 : pas de tiret au début)");
    expect(result.message).toContain("« fin- » (ligne 3 : pas de tiret à la fin)");
    expect(result.message).toContain("« de--ux » (ligne 4 : pas deux tirets de suite)");
    expect(result.message).toContain("(ligne 5 : 39 caractères au plus)");
  });

  it("borne l'extrait d'un nom très long", () => {
    const result = parseCollaborators("y".repeat(500));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeLessThan(200);
  });
});

describe("liens", () => {
  it("https:// accepté, enregistré tel que saisi", () => {
    expect(checkLinkUrl(" https://github.com/moi/projet ")).toEqual({ ok: true, url: "https://github.com/moi/projet" });
    expect(checkLinkUrl("https://demo.example.com:8443/app?x=1#a")).toMatchObject({ ok: true });
  });

  it("http:// refusé, jamais réécrit", () => {
    expect(checkLinkUrl("http://example.com")).toEqual({ ok: false, reason: "http" });
    expect(checkLinkUrl("HTTP://example.com")).toEqual({ ok: false, reason: "http" });
  });

  it.each([
    ["sans schéma", "example.com", "scheme"],
    ["javascript:", "javascript:alert(1)", "scheme"],
    ["ftp", "ftp://example.com", "scheme"],
    ["//hôte", "//example.com", "scheme"],
    ["hôte sans point", "https://localhost/", "invalid"],
    ["espace", "https://exa mple.com", "invalid"],
    ["identifiants", "https://moi:secret@example.com", "credentials"],
    ["trop long", `https://example.com/${"a".repeat(PROJECT_LIMITS.linkUrl)}`, "tooLong"],
  ])("%s : refusé", (_label, url, reason) => {
    expect(checkLinkUrl(url)).toEqual({ ok: false, reason });
  });

  it("liens ordonnés comme les lignes du formulaire, lignes vides ignorées", () => {
    const result = parseCreate({
      linkLabel: ["Code source", "", "Démo"],
      linkUrl: ["https://github.com/moi/p", "", "https://demo.example.com"],
    });
    expect(result.success && result.data.links).toEqual([
      { label: "Code source", url: "https://github.com/moi/p" },
      { label: "Démo", url: "https://demo.example.com" },
    ]);
  });

  it("une adresse http:// est refusée avec le rang du lien", () => {
    const errors = errorsOf({ linkLabel: ["Code", "Démo"], linkUrl: ["https://a.example", "http://b.example"] });
    expect(errors.links).toBe("Lien 2 : l’adresse doit commencer par https:// (http:// n’est pas accepté).");
    expect(linkErrorRow(errors.links)).toBe(2);
  });

  it("libellé ou adresse manquant : refusé", () => {
    expect(errorsOf({ linkLabel: [""], linkUrl: ["https://a.example"] }).links).toMatch(/^Lien 1 : saisissez un libellé/);
    expect(errorsOf({ linkLabel: ["Démo"], linkUrl: [""] }).links).toMatch(/^Lien 1 : saisissez l’adresse/);
  });

  it(`${PROJECT_LIMITS.links} liens au plus`, () => {
    const count = PROJECT_LIMITS.links + 1;
    const errors = errorsOf({
      linkLabel: Array.from({ length: count }, (_, index) => `L${index}`),
      linkUrl: Array.from({ length: count }, (_, index) => `https://l${index}.example`),
    });
    expect(errors.links).toBe(PROJECT_MESSAGES.linksTooMany);
    expect(linkErrorRow(errors.links)).toBeNull();
  });

  it("listes de libellés et d'adresses de longueurs différentes : refusées", () => {
    expect(errorsOf({ linkLabel: ["A", "B"], linkUrl: ["https://a.example"] }).links).toBe(PROJECT_MESSAGES.linksInvalid);
  });

  it("valeurs réaffichées : seules les lignes vides de la fin sont retirées (les rangs des erreurs restent justes)", () => {
    const values = projectValuesFromFormData(
      form({ linkLabel: ["", "Démo", "", ""], linkUrl: ["", "http://x.example", "", ""] }),
    );
    expect(values.links).toEqual([
      { label: "", url: "" },
      { label: "Démo", url: "http://x.example" },
    ]);
  });
});

describe("slug", () => {
  it("généré depuis le titre si le champ est vide", () => {
    const result = parseCreate({ title: "Café & Croissants 2024", slug: "  " });
    expect(result.success && result.data.slug).toBe("cafe-croissants-2024");
  });

  it("modifiable : un slug saisi est conservé", () => {
    const result = parseCreate({ slug: "autre-adresse" });
    expect(result.success && result.data.slug).toBe("autre-adresse");
  });

  it.each(["Mon-Projet", "mon projet", "mon--projet", "-mon", "café", "a".repeat(81)])(
    "slug saisi non conforme « %s » : refusé, pas réécrit",
    (slug) => {
      expect(errorsOf({ slug }).slug).toBe(PROJECT_MESSAGES.slugInvalid);
    },
  );

  it("titre sans lettre latine ni chiffre et slug vide : refusé", () => {
    expect(errorsOf({ title: "東京", slug: "" }).slug).toBe(PROJECT_MESSAGES.slugUngenerable);
  });
});

describe("autres champs", () => {
  it("date au mois près, stockée au 1er du mois en UTC ; vide → null", () => {
    const result = parseCreate({ date: "2024-06" });
    expect(result.success && result.data.date?.toISOString()).toBe("2024-06-01T00:00:00.000Z");
    const empty = parseCreate({ date: "" });
    expect(empty.success && empty.data.date).toBeNull();
    expect(errorsOf({ date: "2024-13" }).date).toBe(PROJECT_MESSAGES.dateInvalid);
    expect(errorsOf({ date: "2024-06-15" }).date).toBe(PROJECT_MESSAGES.dateInvalid);
  });

  it("titre et description obligatoires", () => {
    const errors = errorsOf({ title: "  ", description: "" });
    expect(errors.title).toBe(PROJECT_MESSAGES.titleRequired);
    expect(errors.description).toBe(PROJECT_MESSAGES.descriptionRequired);
  });

  it("technologies : identifiants UUID, doublons retirés", () => {
    const result = parseCreate({ technologyIds: [TECH, TECH] });
    expect(result.success && result.data.technologyIds).toEqual([TECH]);
    expect(errorsOf({ technologyIds: ["pas-un-uuid"] }).technologyIds).toBe(PROJECT_MESSAGES.technologiesInvalid);
  });

  it("image facultative : champ vide → null", () => {
    const result = parseCreate({ image: new File([], "") });
    expect(result.success && result.data.image).toBeNull();
  });

  it("collaborateurs invalides : refus avant tout appel (schéma)", () => {
    expect(errorsOf({ collaborators: "octocat\n-x" }).collaborators).toMatch(/« -x »/);
  });
});

describe("statut : jamais modifié par le formulaire", () => {
  it("isPublished envoyé avec le formulaire n'est ni lu ni gardé", () => {
    const data = form({ ...BASE, isPublished: "true" });
    expect(projectInputFromFormData(data)).not.toHaveProperty("isPublished");
    const created = createProjectSchema.safeParse({ ...projectInputFromFormData(data), isPublished: true });
    expect(created.success && created.data).not.toHaveProperty("isPublished");
    const updated = updateProjectSchema.safeParse({ ...projectInputFromFormData(data), id: ID, isPublished: true });
    expect(updated.success && updated.data).not.toHaveProperty("isPublished");
  });

  it("publicationSchema exige la confirmation et le statut demandé", () => {
    const parse = (fields: Record<string, string>) =>
      publicationSchema.safeParse(publicationInputFromFormData(form(fields)));
    expect(parse({ id: ID, publish: "1", confirmed: "1" })).toMatchObject({ success: true, data: { id: ID, publish: true } });
    expect(parse({ id: ID, publish: "0", confirmed: "1" })).toMatchObject({ success: true, data: { publish: false } });
    expect(parse({ id: ID, publish: "1" }).success).toBe(false);
    expect(parse({ id: ID, publish: "1", confirmed: "oui" }).success).toBe(false);
    expect(parse({ id: ID, confirmed: "1" }).success).toBe(false);
    expect(parse({ id: ID, publish: "true", confirmed: "1" }).success).toBe(false);
    expect(parse({ id: "x", publish: "1", confirmed: "1" }).success).toBe(false);
  });
});
