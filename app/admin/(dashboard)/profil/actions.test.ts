import { crc32, deflateSync, inflateSync } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_LOGIN_PATH } from "@/lib/auth/routes";
import { createSession } from "@/lib/auth/session";
import { FILE_MESSAGES, MAX_FILE_BYTES } from "@/lib/storage/rules";
import { PROFILE_MESSAGES } from "@/lib/validation/profile";
import {
  fakeDb,
  fakeId,
  fakeRequest,
  fakeStorage,
  RedirectError,
  resetFakes,
  revalidatedPaths,
} from "@/test/fakes";

import { savePhotoAction, saveProfileDetailsAction, saveResumeAction } from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("@/lib/storage/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/client")>()),
  getStorageContext: () => fakeStorageContext(),
}));
vi.mock("next/cache", async () => ({ revalidatePath: (await import("@/test/fakes")).fakeRevalidatePath }));
vi.mock("next/headers", async () => {
  const fakes = await import("@/test/fakes");
  return { cookies: fakes.fakeCookies, headers: fakes.fakeHeaders };
});
vi.mock("next/navigation", async () => ({ redirect: (await import("@/test/fakes")).fakeRedirect }));

// `vi.mock` est remonté avant les imports : le contexte est lu au moment de l'appel.
function fakeStorageContext() {
  return fakeStorage.context;
}

// ---------------------------------------------------------------------------
// Fichiers de test
// ---------------------------------------------------------------------------

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Alpha de chaque pixel du PNG de test (2 × 2) : deux transparents, un semi-transparent, un opaque. */
const ALPHAS = [0, 0, 128, 255];

/** PNG RGBA (type de couleur 6) de 2 × 2 pixels avec de la transparence. */
function rgbaPng(): Uint8Array<ArrayBuffer> {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header[8] = 8; // profondeur
  header[9] = 6; // RGBA
  const pixel = (alpha: number) => [10, 20, 30, alpha];
  const rows = [
    Buffer.from([0, ...pixel(ALPHAS[0]), ...pixel(ALPHAS[1])]),
    Buffer.from([0, ...pixel(ALPHAS[2]), ...pixel(ALPHAS[3])]),
  ];
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(Buffer.concat(rows))),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** Canal alpha de chaque pixel d'un PNG RGBA de 2 × 2, relu depuis les octets enregistrés. */
function readAlphas(png: Uint8Array): { colorType: number; alphas: number[] } {
  const buffer = Buffer.from(png);
  const colorType = buffer[25];
  let offset = 8;
  const idat: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  // 2 lignes de (1 octet de filtre + 2 pixels de 4 octets).
  const alphas = [raw[1 + 3], raw[1 + 7], raw[9 + 1 + 3], raw[9 + 1 + 7]];
  return { colorType, alphas };
}

const JPEG = Uint8Array.from(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
    "base64",
  ),
);
const WEBP = Uint8Array.from(Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"));
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");

const pngFile = (name = "photo.png") => new File([rgbaPng()], name, { type: "image/png" });
const jpgFile = (name = "photo.jpg") => new File([JPEG], name, { type: "image/jpeg" });
const webpFile = (name = "photo.webp") => new File([WEBP], name, { type: "image/webp" });
const pdfFile = (name = "cv.pdf") => new File([PDF], name, { type: "application/pdf" });

// ---------------------------------------------------------------------------

beforeEach(async () => {
  resetFakes();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: new Date() });
  const { cookieValue } = await createSession(adminId);
  fakeRequest.cookies.set("admin_session", cookieValue);
});

afterEach(() => vi.restoreAllMocks());

function form(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
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

/** Profil existant (créé par le seed en réalité), avec de vrais fichiers dans le faux bucket `dev-profil`. */
function addProfile(overrides: Record<string, unknown> = {}) {
  const profile = {
    id: 1,
    firstName: "Ancien",
    lastName: "Nom",
    email: "ancien@example.com",
    jobTitle: "Titre",
    bio: "",
    about: "",
    githubUrl: null,
    linkedinUrl: null,
    photoPath: null,
    cutoutPhotoPath: null,
    resumeUrl: null,
    resumePath: null,
    ...overrides,
  };
  fakeDb.profiles.push(profile);
  return profile;
}

function addStoredFile(extension: string, bytes: Uint8Array = rgbaPng()): string {
  const path = `${crypto.randomUUID()}.${extension}`;
  fakeStorage.files.set(`dev-profil/${path}`, bytes);
  return path;
}

const storedPaths = () => [...fakeStorage.files.keys()].map((key) => key.replace("dev-profil/", ""));

const detailsForm = (overrides: Record<string, string> = {}) =>
  form({
    firstName: "Taoufik",
    lastName: "Exemple",
    email: "Contact@Example.com",
    jobTitle: "Développeur",
    bio: "Courte",
    about: "Longue",
    githubUrl: "github.com/exemple",
    linkedinUrl: "",
    ...overrides,
  });

// ---------------------------------------------------------------------------

describe("saveProfileDetailsAction : un seul profil", () => {
  it("crée le profil d'identifiant 1 s'il n'existe pas", async () => {
    const url = await expectRedirect(saveProfileDetailsAction(null, detailsForm()));
    expect(url).toBe("/admin/profil?resultat=enregistre");
    expect(fakeDb.profiles).toHaveLength(1);
    expect(fakeDb.profiles[0]).toMatchObject({
      id: 1,
      firstName: "Taoufik",
      email: "contact@example.com",
      githubUrl: "https://github.com/exemple",
      linkedinUrl: null,
    });
  });

  it("met à jour le profil existant sans en créer un second, même après plusieurs enregistrements", async () => {
    addProfile({ photoPath: "garde.png" });
    for (const firstName of ["Un", "Deux", "Trois", "Quatre"]) {
      await expectRedirect(saveProfileDetailsAction(null, detailsForm({ firstName })));
    }
    expect(fakeDb.profiles).toHaveLength(1);
    expect(fakeDb.profiles[0]).toMatchObject({ id: 1, firstName: "Quatre", photoPath: "garde.png" });
  });

  it("n'écrit jamais qu'à l'identifiant 1, à la création comme à la mise à jour", async () => {
    await expectRedirect(saveProfileDetailsAction(null, detailsForm()));
    await expectRedirect(saveProfileDetailsAction(null, detailsForm({ firstName: "Autre" })));
    expect(fakeDb.calls.profileUpsert).toHaveLength(2);
    for (const call of fakeDb.calls.profileUpsert) {
      expect(call.where).toEqual({ id: 1 });
      expect(call.create.id).toBe(1);
    }
  });

  it("rejoue l'écriture une fois si une création simultanée a déjà créé la ligne (clé primaire)", async () => {
    const upsert = vi.spyOn(fakeDb.client.profile, "upsert").mockImplementationOnce(async () => {
      // L'autre requête crée la ligne entre-temps : la création échoue sur la clé primaire.
      addProfile({ firstName: "Concurrent" });
      throw Object.assign(new Error("P2002"), { code: "P2002" });
    });
    await expectRedirect(saveProfileDetailsAction(null, detailsForm({ firstName: "Moi" })));
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(fakeDb.profiles).toHaveLength(1);
    expect(fakeDb.profiles[0].firstName).toBe("Moi");
  });

  it("refuse une saisie invalide sans rien écrire, avec la saisie et les erreurs par champ", async () => {
    const state = await saveProfileDetailsAction(null, detailsForm({ firstName: "", githubUrl: "https://autre.fr/x" }));
    expect(state).toMatchObject({
      ok: false,
      message: PROFILE_MESSAGES.formInvalid,
      fieldErrors: { firstName: PROFILE_MESSAGES.firstNameRequired, githubUrl: PROFILE_MESSAGES.githubInvalid },
      values: { lastName: "Exemple", githubUrl: "https://autre.fr/x" },
    });
    expect(fakeDb.profiles).toHaveLength(0);
    expect(fakeDb.calls.profileUpsert).toHaveLength(0);
  });

  it("renvoie un message neutre si la base échoue", async () => {
    vi.spyOn(fakeDb.client.profile, "upsert").mockRejectedValue(new Error("base indisponible"));
    const state = await saveProfileDetailsAction(null, detailsForm());
    expect(state).toMatchObject({ ok: false, message: PROFILE_MESSAGES.unexpected });
  });

  it("exige une session", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(saveProfileDetailsAction(null, detailsForm()))).toBe(ADMIN_LOGIN_PATH);
    expect(fakeDb.profiles).toHaveLength(0);
  });
});

describe("savePhotoAction", () => {
  it("enregistre la photo tel quel et crée le profil s'il manque", async () => {
    const url = await expectRedirect(savePhotoAction(null, form({ slot: "photo", file: jpgFile() })));
    expect(url).toBe("/admin/profil?resultat=photo");
    expect(fakeDb.profiles).toHaveLength(1);
    const path = fakeDb.profiles[0].photoPath as string;
    expect(path).toMatch(/\.jpg$/);
    expect(fakeStorage.files.get(`dev-profil/${path}`)).toEqual(JPEG);
    expect(revalidatedPaths).toContain("/admin/profil (layout)");
  });

  it("conserve la transparence d'un PNG : octets identiques, canal alpha intact, aucun JPEG ni WebP", async () => {
    const original = rgbaPng();
    expect(readAlphas(original)).toEqual({ colorType: 6, alphas: ALPHAS });

    addProfile();
    const url = await expectRedirect(savePhotoAction(null, form({ slot: "cutout", file: pngFile() })));
    expect(url).toBe("/admin/profil?resultat=detouree");

    const path = fakeDb.profiles[0].cutoutPhotoPath as string;
    expect(path).toMatch(/\.png$/);
    const stored = fakeStorage.files.get(`dev-profil/${path}`) as Uint8Array;
    expect(Buffer.compare(Buffer.from(stored), Buffer.from(original))).toBe(0);
    expect(readAlphas(stored)).toEqual({ colorType: 6, alphas: ALPHAS });
  });

  it("accepte un WebP", async () => {
    await expectRedirect(savePhotoAction(null, form({ slot: "photo", file: webpFile() })));
    expect(fakeDb.profiles[0].photoPath).toMatch(/\.webp$/);
  });

  it("la photo détourée ne touche pas à la photo, et inversement", async () => {
    addProfile({ photoPath: addStoredFile("png") });
    const photoBefore = fakeDb.profiles[0].photoPath;
    await expectRedirect(savePhotoAction(null, form({ slot: "cutout", file: pngFile() })));
    expect(fakeDb.profiles[0].photoPath).toBe(photoBefore);
    expect(fakeDb.profiles[0].cutoutPhotoPath).toBeTruthy();
    expect(storedPaths()).toHaveLength(2);
  });

  it("remplacement : l'ancien fichier est supprimé du bucket après la mise à jour en base", async () => {
    const oldPath = addStoredFile("png");
    addProfile({ photoPath: oldPath });
    const order: string[] = [];
    const save = fakeDb.client.profile.upsert;
    vi.spyOn(fakeDb.client.profile, "upsert").mockImplementation(async (args) => {
      const result = await save(args);
      order.push(`base:${fakeStorage.files.has(`dev-profil/${oldPath}`) ? "ancien-présent" : "ancien-absent"}`);
      return result;
    });

    const url = await expectRedirect(savePhotoAction(null, form({ slot: "photo", file: jpgFile() })));

    expect(url).toBe("/admin/profil?resultat=photo");
    // Au moment de l'écriture en base, l'ancien fichier existait encore ; il est supprimé ensuite.
    expect(order).toEqual(["base:ancien-présent"]);
    expect(fakeStorage.files.has(`dev-profil/${oldPath}`)).toBe(false);
    expect(storedPaths()).toEqual([fakeDb.profiles[0].photoPath]);
    expect(fakeDb.profiles[0].photoPath).not.toBe(oldPath);
  });

  it("si la base échoue, l'ancien fichier est conservé et le nouveau supprimé", async () => {
    const oldPath = addStoredFile("png");
    addProfile({ photoPath: oldPath });
    vi.spyOn(fakeDb.client.profile, "upsert").mockRejectedValue(new Error("base indisponible"));

    const state = await savePhotoAction(null, form({ slot: "photo", file: jpgFile() }));

    expect(state).toMatchObject({ ok: false, message: PROFILE_MESSAGES.unexpected });
    expect(storedPaths()).toEqual([oldPath]);
    expect(fakeDb.profiles[0].photoPath).toBe(oldPath);
  });

  it("avertit si l'ancien fichier n'a pas pu être supprimé (la mise à jour reste valide)", async () => {
    const oldPath = addStoredFile("png");
    addProfile({ photoPath: oldPath });
    fakeStorage.failRemove = "refusé";

    const url = await expectRedirect(savePhotoAction(null, form({ slot: "photo", file: jpgFile() })));

    expect(url).toBe("/admin/profil?resultat=photo-ancienne");
    expect(fakeDb.profiles[0].photoPath).not.toBe(oldPath);
    expect(fakeStorage.files.has(`dev-profil/${oldPath}`)).toBe(true);
  });

  it("refuse un fichier de plus de 1 Mo avec un message sous le champ, sans rien écrire ni planter", async () => {
    const oldPath = addStoredFile("png");
    addProfile({ photoPath: oldPath });
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(rgbaPng());

    const state = await savePhotoAction(null, form({ slot: "photo", file: new File([big], "grosse.png", { type: "image/png" }) }));

    expect(state).toEqual({
      ok: false,
      message: PROFILE_MESSAGES.formInvalid,
      fieldErrors: { file: FILE_MESSAGES.tooLargeForKind("image") },
    });
    expect(fakeDb.profiles[0].photoPath).toBe(oldPath);
    expect(storedPaths()).toEqual([oldPath]);
  });

  it("accepte un fichier d'exactement 1 Mo côté serveur (le garde-fou du formulaire gère le corps de requête complet)", async () => {
    const exact = new Uint8Array(MAX_FILE_BYTES);
    exact.set(rgbaPng());
    const url = await expectRedirect(
      savePhotoAction(null, form({ slot: "photo", file: new File([exact], "juste.png", { type: "image/png" }) })),
    );
    expect(url).toBe("/admin/profil?resultat=photo");
  });

  it("refuse un faux PNG (contenu réel vérifié) et un PDF envoyé comme photo", async () => {
    for (const file of [
      new File(["pas une image"], "faux.png", { type: "image/png" }),
      new File([PDF], "cv.png", { type: "image/png" }),
    ]) {
      const state = await savePhotoAction(null, form({ slot: "photo", file }));
      expect(state).toMatchObject({ ok: false, fieldErrors: { file: FILE_MESSAGES.wrongType("image") } });
    }
    expect(fakeStorage.files.size).toBe(0);
    expect(fakeDb.profiles).toHaveLength(0);
  });

  it("refuse l'absence de fichier et un emplacement inconnu", async () => {
    const empty = await savePhotoAction(null, form({ slot: "photo", file: new File([], "") }));
    expect(empty).toMatchObject({ ok: false, fieldErrors: { file: PROFILE_MESSAGES.fileRequired } });

    const unknown = await savePhotoAction(null, form({ slot: "../autre", file: pngFile() }));
    expect(unknown).toMatchObject({ ok: false, message: PROFILE_MESSAGES.slotInvalid });
    expect(fakeStorage.files.size).toBe(0);
  });

  it("exige une session", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(savePhotoAction(null, form({ slot: "photo", file: pngFile() })))).toBe(ADMIN_LOGIN_PATH);
    expect(fakeStorage.files.size).toBe(0);
  });
});

describe("saveResumeAction : un lien OU un PDF", () => {
  const resumeForm = (fields: Record<string, string | File> = {}) => form({ resumeUrl: "", ...fields });

  it("enregistre un lien externe (https:// ajouté) et crée le profil s'il manque", async () => {
    const url = await expectRedirect(saveResumeAction(null, resumeForm({ resumeUrl: "exemple.fr/cv.pdf" })));
    expect(url).toBe("/admin/profil?resultat=cv-lien");
    expect(fakeDb.profiles).toHaveLength(1);
    expect(fakeDb.profiles[0]).toMatchObject({ resumeUrl: "https://exemple.fr/cv.pdf", resumePath: null });
  });

  it("enregistre un PDF, sans lien", async () => {
    const url = await expectRedirect(saveResumeAction(null, resumeForm({ resumeFile: pdfFile() })));
    expect(url).toBe("/admin/profil?resultat=cv-pdf");
    const { resumePath, resumeUrl } = fakeDb.profiles[0];
    expect(resumeUrl).toBeNull();
    expect(resumePath).toMatch(/\.pdf$/);
    expect(fakeStorage.files.get(`dev-profil/${resumePath}`)).toEqual(PDF);
  });

  it("refuse un lien ET un PDF : rien n'est envoyé ni enregistré", async () => {
    const stored = addStoredFile("pdf", PDF);
    addProfile({ resumePath: stored });

    const state = await saveResumeAction(null, resumeForm({ resumeUrl: "https://exemple.fr/cv.pdf", resumeFile: pdfFile() }));

    expect(state).toMatchObject({
      ok: false,
      message: PROFILE_MESSAGES.formInvalid,
      fieldErrors: { resumeFile: PROFILE_MESSAGES.resumeBoth },
      values: { resumeUrl: "https://exemple.fr/cv.pdf" },
    });
    expect(fakeDb.profiles[0]).toMatchObject({ resumeUrl: null, resumePath: stored });
    expect(storedPaths()).toEqual([stored]);
  });

  it("lien → PDF : le lien est effacé", async () => {
    addProfile({ resumeUrl: "https://exemple.fr/cv.pdf" });
    await expectRedirect(saveResumeAction(null, resumeForm({ resumeFile: pdfFile() })));
    expect(fakeDb.profiles[0].resumeUrl).toBeNull();
    expect(fakeDb.profiles[0].resumePath).toMatch(/\.pdf$/);
  });

  it("PDF → lien : le PDF est supprimé du bucket, après la mise à jour en base", async () => {
    const oldPdf = addStoredFile("pdf", PDF);
    addProfile({ resumePath: oldPdf });
    const url = await expectRedirect(saveResumeAction(null, resumeForm({ resumeUrl: "https://exemple.fr/cv" })));
    expect(url).toBe("/admin/profil?resultat=cv-lien");
    expect(fakeDb.profiles[0]).toMatchObject({ resumeUrl: "https://exemple.fr/cv", resumePath: null });
    expect(fakeStorage.files.size).toBe(0);
  });

  it("PDF → nouveau PDF : l'ancien est supprimé après la mise à jour en base", async () => {
    const oldPdf = addStoredFile("pdf", PDF);
    addProfile({ resumePath: oldPdf });
    await expectRedirect(saveResumeAction(null, resumeForm({ resumeFile: pdfFile("nouveau.pdf") })));
    expect(storedPaths()).toEqual([fakeDb.profiles[0].resumePath]);
    expect(fakeDb.profiles[0].resumePath).not.toBe(oldPdf);
  });

  it("avertit si l'ancien PDF n'a pas pu être supprimé", async () => {
    const oldPdf = addStoredFile("pdf", PDF);
    addProfile({ resumePath: oldPdf });
    fakeStorage.failRemove = "refusé";
    const url = await expectRedirect(saveResumeAction(null, resumeForm({ resumeUrl: "https://exemple.fr/cv" })));
    expect(url).toBe("/admin/profil?resultat=cv-lien-ancien");
    expect(fakeDb.profiles[0].resumeUrl).toBe("https://exemple.fr/cv");
  });

  it("vider le champ du lien efface le lien ; « supprimer le PDF » vide le CV et supprime le fichier", async () => {
    addProfile({ resumeUrl: "https://exemple.fr/cv" });
    expect(await expectRedirect(saveResumeAction(null, resumeForm()))).toBe("/admin/profil?resultat=cv-supprime");
    expect(fakeDb.profiles[0].resumeUrl).toBeNull();

    const pdf = addStoredFile("pdf", PDF);
    fakeDb.profiles[0].resumePath = pdf;
    expect(await expectRedirect(saveResumeAction(null, resumeForm({ removePdf: "1" })))).toBe(
      "/admin/profil?resultat=cv-supprime",
    );
    expect(fakeDb.profiles[0].resumePath).toBeNull();
    expect(fakeStorage.files.size).toBe(0);
  });

  it("sans rien renseigner, un PDF enregistré est conservé", async () => {
    const pdf = addStoredFile("pdf", PDF);
    addProfile({ resumePath: pdf });
    expect(await expectRedirect(saveResumeAction(null, resumeForm()))).toBe("/admin/profil?resultat=cv-inchange");
    expect(fakeDb.profiles[0].resumePath).toBe(pdf);
    expect(storedPaths()).toEqual([pdf]);
  });

  it("refuse un fichier qui n'est pas un PDF, un PDF de plus de 1 Mo, un lien invalide", async () => {
    const notPdf = await saveResumeAction(null, resumeForm({ resumeFile: new File([rgbaPng()], "cv.pdf", { type: "application/pdf" }) }));
    expect(notPdf).toMatchObject({ ok: false, fieldErrors: { resumeFile: FILE_MESSAGES.wrongType("resume") } });

    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(PDF);
    const tooBig = await saveResumeAction(null, resumeForm({ resumeFile: new File([big], "gros.pdf", { type: "application/pdf" }) }));
    expect(tooBig).toMatchObject({ ok: false, fieldErrors: { resumeFile: FILE_MESSAGES.tooLargeForKind("resume") } });

    const badLink = await saveResumeAction(null, resumeForm({ resumeUrl: "javascript:alert(1)" }));
    expect(badLink).toMatchObject({ ok: false, fieldErrors: { resumeUrl: PROFILE_MESSAGES.resumeUrlInvalid } });

    expect(fakeStorage.files.size).toBe(0);
    expect(fakeDb.profiles).toHaveLength(0);
  });

  it("si la base échoue pour un PDF, le fichier envoyé est supprimé", async () => {
    vi.spyOn(fakeDb.client.profile, "upsert").mockRejectedValue(new Error("base indisponible"));
    const state = await saveResumeAction(null, resumeForm({ resumeFile: pdfFile() }));
    expect(state).toMatchObject({ ok: false, message: PROFILE_MESSAGES.unexpected });
    expect(fakeStorage.files.size).toBe(0);
  });

  it("exige une session", async () => {
    fakeRequest.cookies.clear();
    expect(await expectRedirect(saveResumeAction(null, resumeForm({ resumeUrl: "https://exemple.fr/cv" })))).toBe(
      ADMIN_LOGIN_PATH,
    );
    expect(fakeDb.profiles).toHaveLength(0);
  });
});
