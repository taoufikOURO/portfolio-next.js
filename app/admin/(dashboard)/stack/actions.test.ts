import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { FILE_MESSAGES, isObjectPath } from "@/lib/storage/rules";
import {
  duplicateTechnologyMessage,
  normalizeTechnologyName,
  technologyInUseMessage,
  TECHNOLOGY_MESSAGES,
} from "@/lib/validation/technology";
import {
  fakeDb,
  fakeId,
  fakeRequest,
  fakeStorage,
  RedirectError,
  resetFakes,
  revalidatedPaths,
} from "@/test/fakes";

import {
  createTechnologyAction,
  deleteTechnologyAction,
  moveTechnologyAction,
  updateTechnologyAction,
} from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("@/lib/storage/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/client")>()),
  getStorageContext: () => fakeStorageContext(),
}));
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));

// Phase 2 (E64) : pages publiques qui affichent la stack (projets, compétences, accueil).
const PUBLIC_STACK_PATHS = ["/projets", "/(site)/projets/[slug] (page)", "/competences", "/"];
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

// `vi.mock` est remonté avant les imports : le contexte est lu au moment de l'appel.
function fakeStorageContext() {
  return fakeStorage.context;
}

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const WEBP = Uint8Array.from(Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"));
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

const pngFile = (name = "icone.png") => new File([PNG], name, { type: "image/png" });
const webpFile = (name = "icone.webp") => new File([WEBP], name, { type: "image/webp" });
const svgFile = (name = "icone.svg", content = SVG) => new File([content], name, { type: "image/svg+xml" });

beforeEach(async () => {
  resetFakes();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: new Date() });
  const { cookieValue } = await createSession(adminId);
  fakeRequest.cookies.set("admin_session", cookieValue);
});

afterEach(() => vi.restoreAllMocks());

function form(fields: Record<string, string | string[] | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value instanceof File) data.append(name, value);
    else for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectError) return error.url;
    throw error;
  }
  throw new Error("L'action aurait dû rediriger.");
}

/** Technologie avec un vrai fichier dans le faux bucket `dev-stack`. */
function addTechnology(name: string, position: number, extension = "png") {
  const iconPath = `${crypto.randomUUID()}.${extension}`;
  fakeStorage.files.set(`dev-stack/${iconPath}`, PNG);
  const technology = { id: fakeId(), name, normalizedName: normalizeTechnologyName(name), iconPath, position };
  fakeDb.technologies.push(technology);
  return technology;
}

function addProject(title: string, position = 0, technologyIds: string[] = []) {
  const project = { id: fakeId(), title, position };
  fakeDb.projects.push(project);
  for (const technologyId of technologyIds) fakeDb.projectTechnologies.push({ projectId: project.id, technologyId });
  return project;
}

const storedPaths = () => [...fakeStorage.files.keys()].sort();

describe("session exigée", () => {
  it("chaque action redirige vers la connexion sans session, sans rien écrire", async () => {
    fakeRequest.cookies.clear();
    const technology = addTechnology("React", 0);
    const before = storedPaths();

    expect(await expectRedirect(createTechnologyAction(null, form({ name: "Vue", icon: pngFile() })))).toBe(
      "/admin/connexion",
    );
    expect(
      await expectRedirect(updateTechnologyAction(null, form({ id: technology.id, name: "Vue", icon: pngFile() }))),
    ).toBe("/admin/connexion");
    expect(
      await expectRedirect(moveTechnologyAction(null, form({ id: technology.id, direction: "down" }))),
    ).toBe("/admin/connexion");
    expect(
      await expectRedirect(deleteTechnologyAction(null, form({ id: technology.id, confirmed: "1" }))),
    ).toBe("/admin/connexion");

    expect(fakeDb.technologies).toEqual([technology]);
    expect(storedPaths()).toEqual(before);
  });
});

describe("createTechnologyAction", () => {
  it.each([
    ["PNG", pngFile, "png"],
    ["WebP", webpFile, "webp"],
    ["SVG", svgFile, "svg"],
  ] as const)("crée avec une icône %s : fichier dans dev-stack, chemin en base", async (_label, makeFile, extension) => {
    const url = await expectRedirect(createTechnologyAction(null, form({ name: "  Next.js ", icon: makeFile() })));

    expect(url).toBe("/admin/stack?resultat=creee");
    expect(fakeDb.technologies).toHaveLength(1);
    const [technology] = fakeDb.technologies;
    expect(technology).toMatchObject({ name: "Next.js", normalizedName: "next.js", position: 0 });
    expect(isObjectPath(technology.iconPath)).toBe(true);
    expect(technology.iconPath.endsWith(`.${extension}`)).toBe(true);
    // Le fichier est dans le bucket de développement, sous le chemin enregistré, sans le nom d'origine.
    expect(storedPaths()).toEqual([`dev-stack/${technology.iconPath}`]);
    expect(technology.iconPath).not.toMatch(/icone/);
    expect(revalidatedPaths).toEqual(["/admin/stack (layout)", ...PUBLIC_STACK_PATHS]);
  });

  it("ajoute en dernière position", async () => {
    addTechnology("React", 0);
    addTechnology("Vue", 1);
    await expectRedirect(createTechnologyAction(null, form({ name: "Svelte", icon: pngFile() })));
    expect(fakeDb.technologies.at(-1)).toMatchObject({ name: "Svelte", position: 2 });
  });

  it.each(["développement web", "DEVELOPPEMENT WEB", "  Developpement  web ", "Développement Web", "Developpement Web"])(
    "refuse le doublon %j sans envoyer le fichier",
    async (name) => {
      addTechnology("Développement Web", 0);
      const before = storedPaths();

      const state = await createTechnologyAction(null, form({ name, icon: pngFile() }));

      expect(state).toEqual({
        ok: false,
        message: TECHNOLOGY_MESSAGES.formInvalid,
        fieldErrors: { name: duplicateTechnologyMessage("Développement Web") },
        values: { name },
      });
      expect(fakeDb.technologies).toHaveLength(1);
      expect(storedPaths()).toEqual(before);
    },
  );

  it("refuse un nom vide et l'absence d'icône (validation serveur, sans JavaScript)", async () => {
    const state = await createTechnologyAction(null, form({ name: "   " }));
    expect(state).toMatchObject({
      ok: false,
      fieldErrors: { name: TECHNOLOGY_MESSAGES.nameRequired, icon: TECHNOLOGY_MESSAGES.iconRequired },
    });
    expect(fakeDb.technologies).toHaveLength(0);
    expect(storedPaths()).toEqual([]);
  });

  it("refuse un champ fichier laissé vide (fichier de 0 octet)", async () => {
    const state = await createTechnologyAction(null, form({ name: "React", icon: new File([], "") }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { icon: TECHNOLOGY_MESSAGES.iconRequired } });
    expect(state?.values).toEqual({ name: "React" });
    expect(fakeDb.technologies).toHaveLength(0);
  });

  it.each([
    ["faux PNG (texte renommé)", () => new File(["du texte, pas une image"], "faux.png", { type: "image/png" }), FILE_MESSAGES.wrongType("icon")],
    ["JPG, format non prévu pour une icône", () => new File([Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1)], "photo.jpg", { type: "image/jpeg" }), FILE_MESSAGES.wrongType("icon")],
    ["PNG de plus de 1 Mo", () => new File([new Uint8Array(1024 * 1024 + 1)], "gros.png", { type: "image/png" }), FILE_MESSAGES.tooLargeForKind("icon")],
    ["SVG de plus de 1 Mo", () => new File([`<svg xmlns="http://www.w3.org/2000/svg">${" ".repeat(1024 * 1024)}</svg>`], "gros.svg", { type: "image/svg+xml" }), FILE_MESSAGES.tooLargeForKind("icon")],
    ["SVG avec un script", () => svgFile("script.svg", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), FILE_MESSAGES.svgScript],
  ] as const)("refuse %s : rien en base, rien dans le bucket", async (_label, makeFile, message) => {
    const state = await createTechnologyAction(null, form({ name: "React", icon: makeFile() }));

    expect(state).toEqual({
      ok: false,
      message: TECHNOLOGY_MESSAGES.formInvalid,
      fieldErrors: { icon: message },
      values: { name: "React" },
    });
    expect(fakeDb.technologies).toHaveLength(0);
    expect(storedPaths()).toEqual([]);
  });

  it("n'accepte que le type réel du contenu, pas l'extension ni le type annoncé", async () => {
    // Un SVG envoyé sous le nom « icone.png » est enregistré comme SVG.
    await expectRedirect(
      createTechnologyAction(null, form({ name: "React", icon: new File([SVG], "icone.png", { type: "image/png" }) })),
    );
    expect(fakeDb.technologies[0].iconPath.endsWith(".svg")).toBe(true);
  });

  it("enregistrement refusé par la base (création simultanée) : fichier supprimé, doublon signalé", async () => {
    const findUnique = vi.spyOn(fakeDb.client.technology, "findUnique");
    addTechnology("React", 0);
    const before = storedPaths();
    // Les deux lectures du doublon (avant l'envoi, puis dans la transaction) ne voient pas encore
    // la technologie créée en parallèle ; la contrainte d'unicité de la base tranche.
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const state = await createTechnologyAction(null, form({ name: "react", icon: pngFile() }));

    expect(state).toMatchObject({ ok: false, fieldErrors: { name: duplicateTechnologyMessage("React") } });
    expect(fakeDb.technologies).toHaveLength(1);
    expect(storedPaths()).toEqual(before);
  });

  it("erreur imprévue pendant l'enregistrement : message neutre, fichier supprimé", async () => {
    const create = vi.spyOn(fakeDb.client.technology, "create").mockRejectedValueOnce(new Error("secret interne"));

    const state = await createTechnologyAction(null, form({ name: "React", icon: pngFile() }));

    expect(state).toEqual({
      ok: false,
      message: TECHNOLOGY_MESSAGES.unexpected,
      fieldErrors: {},
      values: { name: "React" },
    });
    expect(JSON.stringify(state)).not.toContain("secret");
    expect(storedPaths()).toEqual([]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("envoi refusé par Supabase : message d'envoi, rien en base", async () => {
    fakeStorage.failUpload = "bucket indisponible";
    const state = await createTechnologyAction(null, form({ name: "React", icon: pngFile() }));

    expect(state).toMatchObject({ ok: false, fieldErrors: { icon: expect.stringContaining("envoi du fichier a échoué") } });
    expect(JSON.stringify(state)).not.toContain("indisponible");
    expect(fakeDb.technologies).toHaveLength(0);
  });

  it("n'écrit jamais hors d'un bucket dev-* en développement", async () => {
    fakeStorage.context.config.buckets.stack = "stack";
    try {
      const state = await createTechnologyAction(null, form({ name: "React", icon: pngFile() }));
      expect(state).toMatchObject({ ok: false, message: TECHNOLOGY_MESSAGES.unexpected });
      expect(fakeDb.technologies).toHaveLength(0);
      expect(storedPaths()).toEqual([]);
    } finally {
      fakeStorage.context.config.buckets.stack = "dev-stack";
    }
  });
});

describe("updateTechnologyAction", () => {
  it("remplace l'icône : le nouveau fichier est enregistré, l'ancien supprimé", async () => {
    const react = addTechnology("React", 0);
    const oldKey = `dev-stack/${react.iconPath}`;
    expect(fakeStorage.files.has(oldKey)).toBe(true);

    const url = await expectRedirect(
      updateTechnologyAction(null, form({ id: react.id, name: "React", icon: webpFile() })),
    );

    expect(url).toBe("/admin/stack?resultat=modifiee");
    expect(react.iconPath.endsWith(".webp")).toBe(true);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);
    expect(fakeStorage.files.has(oldKey)).toBe(false);
  });

  it("remplacement par un SVG puis par un PNG : un seul fichier reste à chaque fois", async () => {
    const react = addTechnology("React", 0);
    await expectRedirect(updateTechnologyAction(null, form({ id: react.id, name: "React", icon: svgFile() })));
    expect(react.iconPath.endsWith(".svg")).toBe(true);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);

    await expectRedirect(updateTechnologyAction(null, form({ id: react.id, name: "React", icon: pngFile() })));
    expect(react.iconPath.endsWith(".png")).toBe(true);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);
  });

  it("sans nouveau fichier : nom modifié, icône et fichier conservés", async () => {
    const react = addTechnology("react", 0);
    const before = { path: react.iconPath, files: storedPaths() };

    const url = await expectRedirect(
      updateTechnologyAction(null, form({ id: react.id, name: "React", icon: new File([], "") })),
    );

    expect(url).toBe("/admin/stack?resultat=modifiee");
    expect(react).toMatchObject({ name: "React", iconPath: before.path });
    expect(storedPaths()).toEqual(before.files);
  });

  it("sans champ fichier du tout : même résultat", async () => {
    const react = addTechnology("react", 0);
    await expectRedirect(updateTechnologyAction(null, form({ id: react.id, name: "React" })));
    expect(react.name).toBe("React");
    expect(storedPaths()).toHaveLength(1);
  });

  it("garde l'ordre", async () => {
    addTechnology("A", 0);
    const b = addTechnology("B", 1);
    addTechnology("C", 2);
    await expectRedirect(updateTechnologyAction(null, form({ id: b.id, name: "B2", icon: pngFile() })));
    expect(fakeDb.technologies.map((technology) => [technology.name, technology.position])).toEqual([
      ["A", 0],
      ["B2", 1],
      ["C", 2],
    ]);
  });

  it("fichier refusé : ancien fichier et ancien chemin conservés, rien de nouveau envoyé", async () => {
    const react = addTechnology("React", 0);
    const before = { path: react.iconPath, files: storedPaths() };

    const state = await updateTechnologyAction(
      null,
      form({ id: react.id, name: "React 2", icon: new File(["pas une image"], "faux.png", { type: "image/png" }) }),
    );

    expect(state).toMatchObject({ ok: false, fieldErrors: { icon: FILE_MESSAGES.wrongType("icon") }, values: { name: "React 2" } });
    expect(react).toMatchObject({ name: "React", iconPath: before.path });
    expect(storedPaths()).toEqual(before.files);
  });

  it("enregistrement impossible : nouveau fichier supprimé, ancien conservé", async () => {
    const react = addTechnology("React", 0);
    const before = { path: react.iconPath, files: storedPaths() };
    vi.spyOn(fakeDb.client.technology, "update").mockRejectedValueOnce(new Error("panne"));

    const state = await updateTechnologyAction(null, form({ id: react.id, name: "React", icon: pngFile() }));

    expect(state).toMatchObject({ ok: false, message: TECHNOLOGY_MESSAGES.unexpected });
    expect(react.iconPath).toBe(before.path);
    expect(storedPaths()).toEqual(before.files);
  });

  it("suppression de l'ancien fichier refusée : le remplacement reste valide", async () => {
    const react = addTechnology("React", 0);
    const oldKey = `dev-stack/${react.iconPath}`;
    fakeStorage.failRemove = "panne de suppression";

    const url = await expectRedirect(updateTechnologyAction(null, form({ id: react.id, name: "React", icon: webpFile() })));

    // Remplacement valide, mais avertissement : l'ancien fichier n'a pas pu être supprimé (E52).
    expect(url).toBe("/admin/stack?resultat=modifiee-ancienne-icone");
    expect(react.iconPath.endsWith(".webp")).toBe(true);
    // Le nouveau est enregistré ; l'ancien reste dans le bucket, et l'erreur est journalisée.
    expect(fakeStorage.files.has(oldKey)).toBe(true);
    expect(fakeStorage.files.has(`dev-stack/${react.iconPath}`)).toBe(true);
    expect(fakeStorage.errors.join("\n")).toContain("suppression refusée");
  });

  it.each(["vue", "VUE", " Vue "])("refuse de prendre le nom d'une autre technologie (%j), sans envoyer le fichier", async (name) => {
    addTechnology("Vue", 0);
    const react = addTechnology("React", 1);
    const before = storedPaths();

    const state = await updateTechnologyAction(null, form({ id: react.id, name, icon: pngFile() }));

    expect(state).toMatchObject({ ok: false, fieldErrors: { name: duplicateTechnologyMessage("Vue") } });
    expect(react.name).toBe("React");
    expect(storedPaths()).toEqual(before);
  });

  it("technologie introuvable ou identifiant mal formé : aucun envoi", async () => {
    const missing = await updateTechnologyAction(null, form({ id: fakeId(), name: "React", icon: pngFile() }));
    expect(missing).toMatchObject({ ok: false, message: TECHNOLOGY_MESSAGES.notFound });
    const malformed = await updateTechnologyAction(null, form({ id: "pas-un-uuid", name: "React", icon: pngFile() }));
    expect(malformed).toMatchObject({ ok: false, message: TECHNOLOGY_MESSAGES.notFound });
    expect(storedPaths()).toEqual([]);
  });

  it("technologie supprimée pendant l'envoi : nouveau fichier supprimé", async () => {
    const react = addTechnology("React", 0);
    const update = vi.spyOn(fakeDb.client.technology, "update");
    update.mockImplementationOnce(async () => {
      fakeDb.technologies.length = 0;
      throw Object.assign(new Error("introuvable"), { code: "P2025" });
    });

    const state = await updateTechnologyAction(null, form({ id: react.id, name: "React", icon: pngFile() }));

    expect(state).toMatchObject({ ok: false, message: TECHNOLOGY_MESSAGES.notFound });
    expect(fakeStorage.files.has(`dev-stack/${react.iconPath}`)).toBe(true);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);
  });
});

describe("moveTechnologyAction", () => {
  it("monte et descend, ordre enregistré", async () => {
    const a = addTechnology("A", 0);
    const b = addTechnology("B", 1);
    const c = addTechnology("C", 2);

    const up = await moveTechnologyAction(null, form({ id: c.id, direction: "up" }));
    expect(up).toMatchObject({ ok: true, direction: "up", position: 2, total: 3 });
    expect([a, b, c].map((technology) => technology.position)).toEqual([0, 2, 1]);

    const down = await moveTechnologyAction(null, form({ id: a.id, direction: "down" }));
    expect(down).toMatchObject({ ok: true, direction: "down", position: 2, total: 3 });
    expect([a, b, c].map((technology) => technology.position)).toEqual([1, 2, 0]);
    expect(revalidatedPaths).toEqual(["/admin/stack (layout)", ...PUBLIC_STACK_PATHS, "/admin/stack (layout)", ...PUBLIC_STACK_PATHS]);
  });

  it("refuse en bout de liste", async () => {
    const a = addTechnology("A", 0);
    addTechnology("B", 1);
    const state = await moveTechnologyAction(null, form({ id: a.id, direction: "up" }));
    expect(state).toMatchObject({ ok: false, direction: "up", message: "« A » est déjà en première position." });
    expect(a.position).toBe(0);
  });

  it("refuse une direction ou un identifiant invalide, et une technologie disparue", async () => {
    const a = addTechnology("A", 0);
    expect(await moveTechnologyAction(null, form({ id: a.id, direction: "left" }))).toMatchObject({
      ok: false,
      message: TECHNOLOGY_MESSAGES.moveInvalid,
    });
    expect(await moveTechnologyAction(null, form({ id: "x", direction: "up" }))).toMatchObject({ ok: false });
    expect(await moveTechnologyAction(null, form({ id: fakeId(), direction: "up" }))).toMatchObject({
      ok: false,
      message: TECHNOLOGY_MESSAGES.notFound,
    });
  });
});

describe("deleteTechnologyAction", () => {
  it("supprime une technologie inutilisée", async () => {
    const react = addTechnology("React", 0);
    const url = await expectRedirect(deleteTechnologyAction(null, form({ id: react.id })));
    expect(url).toBe("/admin/stack?resultat=supprimee");
    expect(fakeDb.technologies).toHaveLength(0);
    expect(revalidatedPaths).toEqual(["/admin/stack (layout)", ...PUBLIC_STACK_PATHS]);
  });

  it("supprime aussi le fichier d'icône du bucket (E52)", async () => {
    const react = addTechnology("React", 0);
    const vue = addTechnology("Vue", 1);

    await expectRedirect(deleteTechnologyAction(null, form({ id: react.id })));

    expect(storedPaths()).toEqual([`dev-stack/${vue.iconPath}`]);
  });

  it("technologie importée sans icône (E68) : supprimée sans avertissement, bucket intact", async () => {
    const vue = addTechnology("Vue", 1);
    const imported = { id: fakeId(), name: "Importée", normalizedName: normalizeTechnologyName("Importée"), iconPath: "", position: 0 };
    fakeDb.technologies.push(imported);

    const url = await expectRedirect(deleteTechnologyAction(null, form({ id: imported.id })));

    expect(url).toBe("/admin/stack?resultat=supprimee");
    expect(storedPaths()).toEqual([`dev-stack/${vue.iconPath}`]);
  });

  it("supprime le fichier d'icône après une suppression confirmée avec projets", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);

    const url = await expectRedirect(
      deleteTechnologyAction(null, form({ id: react.id, confirmed: "1", projectIds: [portfolio.id] })),
    );

    expect(url).toBe("/admin/stack?resultat=supprimee-detachee");
    expect(storedPaths()).toEqual([]);
  });

  it("garde le fichier d'icône tant que la technologie n'est pas supprimée (refus, technologie inconnue)", async () => {
    const react = addTechnology("React", 0);
    addProject("Portfolio", 0, [react.id]);

    await deleteTechnologyAction(null, form({ id: react.id }));
    await deleteTechnologyAction(null, form({ id: fakeId() }));

    expect(fakeDb.technologies).toHaveLength(1);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);
  });

  it("fichier d'icône impossible à supprimer : la technologie est supprimée, avec avertissement", async () => {
    const react = addTechnology("React", 0);
    fakeStorage.failRemove = "panne de suppression";

    const url = await expectRedirect(deleteTechnologyAction(null, form({ id: react.id })));

    expect(url).toBe("/admin/stack?resultat=supprimee-icone-conservee");
    expect(fakeDb.technologies).toHaveLength(0);
    expect(storedPaths()).toEqual([`dev-stack/${react.iconPath}`]);
    expect(fakeStorage.errors.join("\n")).toContain("suppression refusée");
  });

  it("fichier d'icône impossible à supprimer, avec projets détachés : avertissement dédié", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);
    fakeStorage.failRemove = "panne de suppression";

    const url = await expectRedirect(
      deleteTechnologyAction(null, form({ id: react.id, confirmed: "1", projectIds: [portfolio.id] })),
    );

    expect(url).toBe("/admin/stack?resultat=supprimee-detachee-icone-conservee");
    expect(fakeDb.technologies).toHaveLength(0);
  });

  it("n'annule pas la suppression si le bucket est refusé par le garde-fou (hors dev-*)", async () => {
    const react = addTechnology("React", 0);
    fakeStorage.context.config.buckets.stack = "stack";
    try {
      const url = await expectRedirect(deleteTechnologyAction(null, form({ id: react.id })));
      expect(url).toBe("/admin/stack?resultat=supprimee-icone-conservee");
      expect(fakeDb.technologies).toHaveLength(0);
    } finally {
      fakeStorage.context.config.buckets.stack = "dev-stack";
    }
  });

  it("bloque une technologie utilisée sans confirmation, avec la liste des projets", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);
    const blog = addProject("Blog", 1, [react.id]);

    const state = await deleteTechnologyAction(null, form({ id: react.id }));

    expect(state).toEqual({
      ok: false,
      message: technologyInUseMessage(2),
      fieldErrors: {},
      projects: [
        { id: portfolio.id, title: "Portfolio" },
        { id: blog.id, title: "Blog" },
      ],
    });
    expect(fakeDb.technologies).toHaveLength(1);
    expect(fakeDb.projectTechnologies).toHaveLength(2);
  });

  it("une confirmation vide ne suffit pas", async () => {
    const react = addTechnology("React", 0);
    addProject("Portfolio", 0, [react.id]);
    const state = await deleteTechnologyAction(null, form({ id: react.id, confirmed: "1" }));
    expect(state).toMatchObject({ ok: false, message: technologyInUseMessage(1) });
    expect(fakeDb.technologies).toHaveLength(1);
  });

  it("la liste des projets sans `confirmed=1` n'est pas une confirmation", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);
    const state = await deleteTechnologyAction(null, form({ id: react.id, projectIds: [portfolio.id] }));
    expect(state).toMatchObject({ ok: false, message: technologyInUseMessage(1) });
    expect(fakeDb.technologies).toHaveLength(1);
    expect(fakeDb.projectTechnologies).toHaveLength(1);
  });

  it("supprime après confirmation, détache les liens, garde les projets", async () => {
    const react = addTechnology("React", 0);
    const vue = addTechnology("Vue", 1);
    const portfolio = addProject("Portfolio", 0, [react.id, vue.id]);
    const blog = addProject("Blog", 1, [react.id]);

    const url = await expectRedirect(
      deleteTechnologyAction(null, form({ id: react.id, confirmed: "1", projectIds: [portfolio.id, blog.id] })),
    );

    expect(url).toBe("/admin/stack?resultat=supprimee-detachee");
    expect(fakeDb.technologies.map((technology) => technology.name)).toEqual(["Vue"]);
    expect(fakeDb.projectTechnologies).toEqual([{ projectId: portfolio.id, technologyId: vue.id }]);
    expect(fakeDb.projects).toHaveLength(2);
  });

  it("projet rattaché pendant la confirmation : refus avec la nouvelle liste, puis suppression à la seconde confirmation", async () => {
    const react = addTechnology("React", 0);
    const portfolio = addProject("Portfolio", 0, [react.id]);
    const late = addProject("Tardif", 1, [react.id]);

    const refused = await deleteTechnologyAction(
      null,
      form({ id: react.id, confirmed: "1", projectIds: [portfolio.id] }),
    );
    expect(refused).toMatchObject({
      ok: false,
      message: technologyInUseMessage(2),
      projects: [
        { id: portfolio.id, title: "Portfolio" },
        { id: late.id, title: "Tardif" },
      ],
    });
    expect(fakeDb.technologies).toHaveLength(1);

    const url = await expectRedirect(
      deleteTechnologyAction(null, form({ id: react.id, confirmed: "1", projectIds: [portfolio.id, late.id] })),
    );
    expect(url).toBe("/admin/stack?resultat=supprimee-detachee");
    expect(fakeDb.technologies).toHaveLength(0);
  });

  it("identifiant mal formé ou technologie déjà supprimée", async () => {
    expect(await deleteTechnologyAction(null, form({ id: "pas-un-uuid" }))).toMatchObject({
      ok: false,
      message: TECHNOLOGY_MESSAGES.notFound,
    });
    expect(await deleteTechnologyAction(null, form({ id: fakeId() }))).toMatchObject({
      ok: false,
      message: TECHNOLOGY_MESSAGES.notFound,
    });
  });
});
