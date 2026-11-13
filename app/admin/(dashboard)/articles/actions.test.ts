import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { versionToken } from "@/lib/articles/rules";
import { createSession } from "@/lib/auth/session";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/routes";
import { ARTICLE_MESSAGES, duplicateSlugMessage, publishBlockers } from "@/lib/validation/article";
import {
  fakeDb,
  fakeId,
  fakeRequest,
  fakeStorage,
  RedirectError,
  resetFakes,
  type FakeArticle,
  type FakeArticleVersion,
} from "@/test/fakes";

import {
  createArticleAction,
  deleteArticleAction,
  discardChangesAction,
  publishArticleAction,
  saveCoverAction,
  saveDraftAction,
} from "./actions";

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

function fakeStorageContext() {
  return fakeStorage.context;
}

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const pngFile = (name = "couverture.png") => new File([PNG], name, { type: "image/png" });

const T0 = new Date("2026-11-10T09:00:00.000Z");

beforeEach(async () => {
  resetFakes();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: new Date() });
  const { cookieValue } = await createSession(adminId);
  fakeRequest.cookies.set("admin_session", cookieValue);
  fakeDb.profiles.push({
    id: 1,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    jobTitle: "Développeuse",
    bio: "",
    about: "",
    githubUrl: null,
    linkedinUrl: null,
    photoPath: null,
    cutoutPhotoPath: null,
    resumeUrl: null,
    resumePath: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

function at(iso: string) {
  vi.setSystemTime(new Date(iso));
}

function article(id: string): FakeArticle {
  const row = fakeDb.articles.find((candidate) => candidate.id === id);
  if (!row) throw new Error("Article absent.");
  return row;
}

function version(id: string | null): FakeArticleVersion | undefined {
  return fakeDb.articleVersions.find((candidate) => candidate.id === id);
}

function draftOf(id: string) {
  return version(article(id).draftVersionId);
}

function publishedOf(id: string) {
  return version(article(id).publishedVersionId);
}

function tokenOf(id: string): string {
  return versionToken(article(id).updatedAt);
}

async function create(title = "Mon premier article"): Promise<string> {
  const url = await expectRedirect(createArticleAction(null, form({ title })));
  const match = /^\/admin\/articles\/([0-9a-f-]+)\?resultat=cree$/.exec(url);
  if (!match) throw new Error(`Redirection inattendue : ${url}`);
  return match[1];
}

const FULL = {
  title: "Mon premier article",
  slug: "mon-premier-article",
  description: "Une description.",
  category: "Développement",
  author: "Ada Lovelace",
  content: "## Bonjour\n\nDu **Markdown**.",
};

async function save(id: string, fields: Partial<typeof FULL> = {}, token = tokenOf(id)) {
  const current = draftOf(id) ?? publishedOf(id);
  const base = current
    ? {
        title: current.title,
        slug: current.slug,
        description: current.description,
        category: current.category,
        author: current.author,
        content: current.content,
      }
    : FULL;
  return saveDraftAction(null, form({ id, version: token, ...base, ...fields }));
}

async function publish(id: string, token = tokenOf(id)) {
  return expectRedirect(publishArticleAction(null, form({ id, version: token, confirmed: "1" })));
}

async function createPublished(title = "Mon premier article", fields: Partial<typeof FULL> = {}): Promise<string> {
  const id = await create(title);
  await save(id, { ...FULL, title, slug: fields.slug ?? draftOf(id)!.slug, ...fields });
  await publish(id);
  return id;
}

function bucketFiles(): string[] {
  return [...fakeStorage.files.keys()].sort();
}

async function uploadCover(id: string, token = tokenOf(id), file: File = pngFile()) {
  return saveCoverAction(null, form({ id, version: token, file }));
}

// ---------------------------------------------------------------------------

describe("Session obligatoire (E46)", () => {
  it("chaque action redirige vers la connexion sans rien écrire", async () => {
    const id = await create();
    const before = JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions });
    fakeRequest.cookies.clear();
    const token = tokenOf(id);
    const calls = [
      createArticleAction(null, form({ title: "Autre" })),
      saveDraftAction(null, form({ id, version: token, ...FULL })),
      saveCoverAction(null, form({ id, version: token, file: pngFile() })),
      publishArticleAction(null, form({ id, version: token, confirmed: "1" })),
      discardChangesAction(null, form({ id, version: token, confirmed: "1" })),
      deleteArticleAction(null, form({ id })),
    ];
    for (const call of calls) expect(await expectRedirect(call)).toBe(ADMIN_LOGIN_PATH);
    expect(JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions })).toBe(before);
    expect(bucketFiles()).toEqual([]);
  });
});

describe("Création", () => {
  it("crée un brouillon jamais publié : slug depuis le titre, auteur du profil", async () => {
    const id = await create("Café & Crème : l’été");
    expect(article(id)).toMatchObject({ status: "DRAFT", slug: null, publishedVersionId: null, publishedAt: null, lastPublishedAt: null });
    expect(draftOf(id)).toMatchObject({ title: "Café & Crème : l’été", slug: "cafe-creme-l-ete", author: "Ada Lovelace", content: "" });
    expect(fakeDb.articleVersions).toHaveLength(1);
  });

  it("propose un slug libre si celui du titre est déjà pris, même par un brouillon", async () => {
    await create("Bonjour");
    const second = await create("Bonjour");
    expect(draftOf(second)!.slug).toBe("bonjour-2");
  });

  it("refuse un titre vide, sans rien créer", async () => {
    const state = await createArticleAction(null, form({ title: "   " }));
    expect(state?.fieldErrors.title).toBe(ARTICLE_MESSAGES.titleRequired);
    expect(fakeDb.articles).toHaveLength(0);
  });
});

describe("Brouillon (autosave)", () => {
  it("enregistre la version de travail d'un article jamais publié, sans le publier", async () => {
    const id = await create();
    at("2026-11-10T09:05:00.000Z");
    const state = await save(id, FULL);
    expect(state).toMatchObject({ ok: true, status: "saved", isDraft: true });
    expect(state?.version).toBe("2026-11-10T09:05:00.000Z");
    expect(state?.message).toContain("Enregistré à 10:05");
    expect(draftOf(id)).toMatchObject(FULL);
    expect(article(id)).toMatchObject({ status: "DRAFT", slug: null, publishedAt: null, publishedVersionId: null });
  });

  it("n'accepte ni publication ni statut par le formulaire du brouillon", async () => {
    const id = await create();
    await saveDraftAction(
      null,
      form({ id, version: tokenOf(id), ...FULL, status: "PUBLISHED", publish: "1", confirmed: "1" }),
    );
    expect(article(id).status).toBe("DRAFT");
    expect(article(id).publishedVersionId).toBeNull();
  });

  it("article publié : la première modification crée un brouillon, la version en ligne ne change pas", async () => {
    const id = await createPublished();
    const published = { ...publishedOf(id)! };
    const writesBefore = fakeDb.calls.articleVersionWrites.length;

    at("2026-11-11T08:00:00.000Z");
    const state = await save(id, { title: "Titre modifié", content: "Nouveau contenu" });
    expect(state).toMatchObject({ ok: true, status: "saved", isDraft: true });
    expect(publishedOf(id)).toEqual(published);
    expect(draftOf(id)).toMatchObject({ title: "Titre modifié", content: "Nouveau contenu", slug: published.slug });
    expect(article(id)).toMatchObject({ status: "PUBLISHED", slug: published.slug });

    await save(id, { content: "Encore" });
    expect(fakeDb.articleVersions).toHaveLength(2);
    const writes = fakeDb.calls.articleVersionWrites.slice(writesBefore);
    expect(writes.some((write) => write.id === published.id)).toBe(false);
  });

  it("n'écrit rien si la saisie est identique à la version en ligne", async () => {
    const id = await createPublished();
    const token = tokenOf(id);
    const state = await save(id);
    expect(state).toMatchObject({ ok: true, status: "unchanged", isDraft: false, version: token });
    expect(article(id).draftVersionId).toBeNull();
  });

  it("brouillon incomplet permis : titre, slug et contenu vides", async () => {
    const id = await create();
    const state = await save(id, { title: "", slug: "", content: "" });
    expect(state?.ok).toBe(true);
    expect(draftOf(id)).toMatchObject({ title: "", slug: "", content: "" });
  });

  it("garde le Markdown tel quel (espaces de fin de ligne), retours à la ligne normalisés", async () => {
    const id = await create();
    await save(id, { content: "Ligne  \r\n  - item\r\n\r\n" });
    expect(draftOf(id)!.content).toBe("Ligne  \n  - item\n\n");
  });

  it("refuse un champ trop long sans rien enregistrer", async () => {
    const id = await create();
    const before = { ...draftOf(id)! };
    const state = await save(id, { title: "a".repeat(201) });
    expect(state).toMatchObject({ ok: false, status: "invalid" });
    expect(state?.fieldErrors.title).toBe(ARTICLE_MESSAGES.titleTooLong);
    expect(draftOf(id)).toEqual(before);
  });

  it("ignore un fichier envoyé avec le brouillon (l'autosave ne renvoie jamais l'image)", async () => {
    const id = await create();
    await saveDraftAction(null, form({ id, version: tokenOf(id), ...FULL, file: pngFile(), coverImagePath: "x.png" }));
    expect(bucketFiles()).toEqual([]);
    expect(draftOf(id)!.coverImagePath).toBeNull();
  });
});

describe("Conflit de version (deux onglets)", () => {
  it("refuse l'enregistrement d'un onglet qui n'est plus à jour, sans rien écraser", async () => {
    const id = await create();
    const stale = tokenOf(id);
    at("2026-11-10T09:01:00.000Z");
    const tabA = await save(id, { content: "Onglet A" }, stale);
    expect(tabA?.ok).toBe(true);

    const snapshot = { article: { ...article(id) }, draft: { ...draftOf(id)! } };
    at("2026-11-10T09:02:00.000Z");
    const tabB = await save(id, { content: "Onglet B" }, stale);
    expect(tabB).toMatchObject({ ok: false, status: "conflict", message: ARTICLE_MESSAGES.conflict });
    expect(tabB?.values?.content).toBe("Onglet B");
    expect(article(id)).toEqual(snapshot.article);
    expect(draftOf(id)).toEqual(snapshot.draft);

    // L'onglet A, à jour, continue normalement.
    const next = await save(id, { content: "Onglet A, suite" }, tabA!.version);
    expect(next?.ok).toBe(true);
    expect(draftOf(id)!.content).toBe("Onglet A, suite");
  });

  it("deux enregistrements dans la même milliseconde donnent deux jetons différents", async () => {
    const id = await create();
    const first = await save(id, { content: "a" });
    const second = await save(id, { content: "b" }, first!.version);
    expect(second?.ok).toBe(true);
    expect(second!.version).not.toBe(first!.version);
    const stale = await save(id, { content: "c" }, first!.version);
    expect(stale?.status).toBe("conflict");
  });

  it("refuse un jeton mal formé", async () => {
    const id = await create();
    const state = await save(id, FULL, "pas-une-date");
    expect(state).toMatchObject({ ok: false, status: "invalid", message: ARTICLE_MESSAGES.versionInvalid });
  });

  it("refuse aussi la publication et l'abandon avec un jeton périmé", async () => {
    const id = await createPublished();
    const stale = tokenOf(id);
    await save(id, { content: "Modifié" }, stale);
    const before = JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions });

    const published = await publishArticleAction(null, form({ id, version: stale, confirmed: "1" }));
    expect(published).toMatchObject({ ok: false, message: ARTICLE_MESSAGES.publicationConflict });
    const discarded = await discardChangesAction(null, form({ id, version: stale, confirmed: "1" }));
    expect(discarded).toMatchObject({ ok: false, message: ARTICLE_MESSAGES.discardConflict });
    expect(JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions })).toBe(before);
  });
});

describe("Slug", () => {
  it("refuse un slug déjà utilisé par le brouillon d'un autre article ; les autres champs sont enregistrés", async () => {
    await create("Déjà pris");
    const id = await create("Autre");
    const state = await save(id, { slug: "deja-pris", content: "Texte gardé" });
    expect(state).toMatchObject({ ok: true, status: "saved" });
    expect(state?.fieldErrors.slug).toBe(duplicateSlugMessage("deja-pris"));
    expect(state?.message).toContain("le brouillon garde « autre »");
    expect(draftOf(id)).toMatchObject({ slug: "autre", content: "Texte gardé" });
  });

  it("refuse un slug déjà publié par un autre article", async () => {
    await createPublished("En ligne");
    const id = await create("Nouveau");
    const state = await save(id, { slug: "en-ligne" });
    expect(state?.fieldErrors.slug).toBe(duplicateSlugMessage("en-ligne"));
    expect(draftOf(id)!.slug).toBe("nouveau");
  });

  it("refuse un slug pris par une version (en ligne) d'un autre article qui a un brouillon au slug différent", async () => {
    const other = await createPublished("Ancien nom");
    await save(other, { slug: "nouveau-nom" });
    const id = await create("Mien");
    expect((await save(id, { slug: "ancien-nom" }))?.fieldErrors.slug).toBe(duplicateSlugMessage("ancien-nom"));
    expect((await save(id, { slug: "nouveau-nom" }))?.fieldErrors.slug).toBe(duplicateSlugMessage("nouveau-nom"));
  });

  it("permet de garder son propre slug (brouillon d'un article publié)", async () => {
    const id = await createPublished("Mien");
    const state = await save(id, { content: "Modifié", slug: "mien" });
    expect(state?.fieldErrors.slug).toBeUndefined();
  });

  it("refuse un slug non conforme sans le réécrire", async () => {
    const id = await create("Titre");
    const state = await save(id, { slug: "Mon Slug", description: "Gardée" });
    expect(state?.fieldErrors.slug).toBe(ARTICLE_MESSAGES.slugInvalid);
    expect(draftOf(id)).toMatchObject({ slug: "titre", description: "Gardée" });
  });

  it("ne génère jamais de slug à l'enregistrement : un slug vidé reste vide", async () => {
    const id = await create("Titre");
    await save(id, { slug: "" });
    expect(draftOf(id)!.slug).toBe("");
  });

  it("vérifie de nouveau le slug dans la transaction de publication", async () => {
    const a = await create("Commun");
    await save(a, { ...FULL, slug: "commun" });
    const b = await create("Autre");
    await save(b, { ...FULL, slug: "autre" });
    // Créé entre-temps par un chemin qui ne contrôle pas (simulation d'une course).
    draftOf(b)!.slug = "commun";

    const before = JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions });
    const state = await publishArticleAction(null, form({ id: a, version: tokenOf(a), confirmed: "1" }));
    expect(state?.ok).toBe(false);
    expect(state?.message).toContain(duplicateSlugMessage("commun"));
    expect(JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions })).toBe(before);
  });
});

describe("Publication et dates", () => {
  it("exige la confirmation (confirmed=1)", async () => {
    const id = await create();
    await save(id, FULL);
    for (const confirmed of [undefined, "0", "oui"]) {
      const fields: Record<string, string> = { id, version: tokenOf(id) };
      if (confirmed !== undefined) fields.confirmed = confirmed;
      const state = await publishArticleAction(null, form(fields));
      expect(state).toMatchObject({ ok: false, message: ARTICLE_MESSAGES.publicationInvalid });
    }
    expect(article(id).status).toBe("DRAFT");
  });

  it("première publication : publishedAt fixée, lastPublishedAt vide, brouillon devenu la version en ligne", async () => {
    const id = await create();
    await save(id, FULL);
    const draftId = article(id).draftVersionId;
    at("2026-11-12T10:00:00.000Z");
    expect(await publish(id)).toBe(`/admin/articles/${id}?resultat=publie`);
    expect(article(id)).toMatchObject({
      status: "PUBLISHED",
      slug: "mon-premier-article",
      publishedVersionId: draftId,
      draftVersionId: null,
      publishedAt: new Date("2026-11-12T10:00:00.000Z"),
      lastPublishedAt: null,
    });
    expect(fakeDb.articleVersions).toHaveLength(1);
  });

  it("republication : publishedAt inchangée, lastPublishedAt mise à jour, ancienne version supprimée", async () => {
    const id = await create();
    await save(id, FULL);
    at("2026-11-12T10:00:00.000Z");
    await publish(id);
    const firstVersion = article(id).publishedVersionId;

    at("2026-11-13T15:30:00.000Z");
    await save(id, { content: "Version 2" });
    expect(await publish(id)).toBe(`/admin/articles/${id}?resultat=republie`);
    expect(article(id).publishedAt).toEqual(new Date("2026-11-12T10:00:00.000Z"));
    expect(article(id).lastPublishedAt).toEqual(new Date("2026-11-13T15:30:00.000Z"));
    expect(publishedOf(id)!.content).toBe("Version 2");
    expect(version(firstVersion)).toBeUndefined();
    expect(fakeDb.articleVersions).toHaveLength(1);

    at("2026-11-20T08:00:00.000Z");
    await save(id, { content: "Version 3" });
    await publish(id);
    expect(article(id).publishedAt).toEqual(new Date("2026-11-12T10:00:00.000Z"));
    expect(article(id).lastPublishedAt).toEqual(new Date("2026-11-20T08:00:00.000Z"));
  });

  it("republication avec un nouveau slug : l'adresse en ligne change seulement à la publication", async () => {
    const id = await createPublished();
    await save(id, { slug: "nouvelle-adresse" });
    expect(article(id).slug).toBe("mon-premier-article");
    await publish(id);
    expect(article(id).slug).toBe("nouvelle-adresse");
  });

  it.each([
    ["titre", { title: "  " }, "title", ARTICLE_MESSAGES.publishTitleEmpty],
    ["slug", { slug: "" }, "slug", ARTICLE_MESSAGES.publishSlugEmpty],
    ["contenu", { content: " \n\n " }, "content", ARTICLE_MESSAGES.publishContentEmpty],
  ] as const)("refuse de publier si le %s est vide (E55 a)", async (_label, fields, field, message) => {
    const id = await create();
    await save(id, { ...FULL, ...fields });
    const before = JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions });
    expect(await publish(id)).toBe(`/admin/articles/${id}?resultat=publication-incomplete`);
    expect(JSON.stringify({ articles: fakeDb.articles, versions: fakeDb.articleVersions })).toBe(before);
    // Même règle et même message que l'éditeur (navigateur) et la page qui affiche les erreurs.
    expect(publishBlockers(draftOf(id)!)).toEqual({ [field]: message });
  });

  it("article publié sans modification en attente : rien à publier, dates inchangées", async () => {
    const id = await createPublished();
    const before = { ...article(id) };
    at("2026-11-15T10:00:00.000Z");
    expect(await publish(id)).toBe(`/admin/articles/${id}?resultat=rien-a-publier`);
    expect(article(id)).toEqual(before);
  });
});

describe("Abandon des modifications", () => {
  it("restaure la version en ligne dans l'éditeur, version en ligne inchangée", async () => {
    const id = await createPublished();
    const published = { ...publishedOf(id)! };
    await save(id, { title: "Brouillon", content: "À jeter" });
    const draftId = article(id).draftVersionId;

    const url = await expectRedirect(discardChangesAction(null, form({ id, version: tokenOf(id), confirmed: "1" })));
    expect(url).toBe(`/admin/articles/${id}?resultat=abandonne`);
    expect(article(id)).toMatchObject({ status: "PUBLISHED", draftVersionId: null });
    expect(version(draftId)).toBeUndefined();
    expect(publishedOf(id)).toEqual(published);
    // L'éditeur affiche la version de travail : désormais la version en ligne.
    expect(draftOf(id) ?? publishedOf(id)).toEqual(published);
  });

  it("exige la confirmation", async () => {
    const id = await createPublished();
    await save(id, { content: "Modifié" });
    const state = await discardChangesAction(null, form({ id, version: tokenOf(id) }));
    expect(state?.ok).toBe(false);
    expect(draftOf(id)).toBeDefined();
  });

  it("ne supprime rien sur un article jamais publié", async () => {
    const id = await create();
    await save(id, FULL);
    const url = await expectRedirect(discardChangesAction(null, form({ id, version: tokenOf(id), confirmed: "1" })));
    expect(url).toBe(`/admin/articles/${id}?resultat=rien-a-abandonner`);
    expect(draftOf(id)).toMatchObject(FULL);
  });
});

describe("Image de couverture (E55 b)", () => {
  it("enregistre l'image dans dev-articles et son chemin dans la version de travail", async () => {
    const id = await create();
    const token = tokenOf(id);
    at("2026-11-10T09:10:00.000Z");
    const state = await uploadCover(id, token);
    expect(state).toMatchObject({ ok: true, tone: "success" });
    const path = draftOf(id)!.coverImagePath!;
    expect(path).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(bucketFiles()).toEqual([`dev-articles/${path}`]);
    expect(state?.version).not.toBe(token);
    expect(state?.coverUrl).toBe(`https://projet.supabase.co/storage/v1/object/public/dev-articles/${path}`);
  });

  it("brouillon jamais publié : l'ancienne image est supprimée dès que la nouvelle est enregistrée", async () => {
    const id = await create();
    await uploadCover(id);
    const first = draftOf(id)!.coverImagePath!;
    await uploadCover(id);
    const second = draftOf(id)!.coverImagePath!;
    expect(second).not.toBe(first);
    expect(bucketFiles()).toEqual([`dev-articles/${second}`]);
  });

  it("article publié : l'image en ligne reste jusqu'à la publication, celles du brouillon sont remplacées", async () => {
    const id = await create();
    await save(id, FULL);
    await uploadCover(id);
    await publish(id);
    const online = publishedOf(id)!.coverImagePath!;

    await uploadCover(id);
    const draft1 = draftOf(id)!.coverImagePath!;
    expect(article(id).draftVersionId).not.toBeNull();
    expect(publishedOf(id)!.coverImagePath).toBe(online);
    expect(bucketFiles()).toEqual([`dev-articles/${draft1}`, `dev-articles/${online}`].sort());

    await uploadCover(id);
    const draft2 = draftOf(id)!.coverImagePath!;
    expect(bucketFiles()).toEqual([`dev-articles/${draft2}`, `dev-articles/${online}`].sort());

    await publish(id);
    expect(publishedOf(id)!.coverImagePath).toBe(draft2);
    expect(bucketFiles()).toEqual([`dev-articles/${draft2}`]);
  });

  it("le texte enregistré après l'image la conserve (le brouillon garde son chemin)", async () => {
    const id = await create();
    const cover = await uploadCover(id);
    await save(id, { content: "Après l'image" }, cover!.version);
    expect(draftOf(id)!.coverImagePath).not.toBeNull();
  });

  it("abandon : l'image du brouillon est supprimée, celle de la version en ligne gardée", async () => {
    const id = await create();
    await save(id, FULL);
    await uploadCover(id);
    await publish(id);
    const online = publishedOf(id)!.coverImagePath!;

    // Brouillon qui garde l'image en ligne : rien à supprimer.
    await save(id, { content: "Modifié" });
    await expectRedirect(discardChangesAction(null, form({ id, version: tokenOf(id), confirmed: "1" })));
    expect(bucketFiles()).toEqual([`dev-articles/${online}`]);

    // Brouillon avec sa propre image : supprimée à l'abandon.
    await uploadCover(id);
    await expectRedirect(discardChangesAction(null, form({ id, version: tokenOf(id), confirmed: "1" })));
    expect(bucketFiles()).toEqual([`dev-articles/${online}`]);
    expect(publishedOf(id)!.coverImagePath).toBe(online);
  });

  it("jeton périmé : refus avant l'envoi, bucket inchangé", async () => {
    const id = await create();
    const stale = tokenOf(id);
    await save(id, { content: "Autre onglet" });
    const api = fakeStorage.context.api;
    const originalFrom = api.from.bind(api);
    let uploads = 0;
    vi.spyOn(api, "from").mockImplementation((bucket: string) => {
      const target = originalFrom(bucket);
      return {
        ...target,
        async upload(path: string, body: Uint8Array) {
          uploads += 1;
          return target.upload(path, body);
        },
      };
    });
    const state = await uploadCover(id, stale);
    expect(state).toMatchObject({ ok: false, conflict: true, message: ARTICLE_MESSAGES.coverConflict });
    // Refus AVANT l'envoi : aucun fichier n'est même envoyé au stockage.
    expect(uploads).toBe(0);
    expect(bucketFiles()).toEqual([]);
    expect(draftOf(id)!.coverImagePath).toBeNull();
  });

  it("conflit apparu pendant l'envoi : l'image envoyée est supprimée, rien n'est enregistré", async () => {
    const id = await create();
    const token = tokenOf(id);
    const api = fakeStorage.context.api;
    const originalFrom = api.from.bind(api);
    vi.spyOn(api, "from").mockImplementation((bucket: string) => {
      const target = originalFrom(bucket);
      return {
        ...target,
        async upload(path: string, body: Uint8Array) {
          // Un autre onglet enregistre pendant l'envoi du fichier.
          article(id).updatedAt = new Date(article(id).updatedAt.getTime() + 5);
          return target.upload(path, body);
        },
      };
    });
    const state = await uploadCover(id, token);
    expect(state).toMatchObject({ ok: false, conflict: true });
    expect(bucketFiles()).toEqual([]);
    expect(draftOf(id)!.coverImagePath).toBeNull();
  });

  it("refuse un fichier de plus de 1 Mo et un faux PNG, sans rien envoyer", async () => {
    const id = await create();
    const big = new File([new Uint8Array(1024 * 1024 + 1)], "lourd.png", { type: "image/png" });
    const tooBig = await uploadCover(id, tokenOf(id), big);
    expect(tooBig?.ok).toBe(false);
    expect(tooBig?.fieldErrors.file).toBeTruthy();
    const fake = await uploadCover(id, tokenOf(id), new File(["pas une image"], "faux.png", { type: "image/png" }));
    expect(fake?.ok).toBe(false);
    expect(fake?.fieldErrors.file).toBeTruthy();
    expect(bucketFiles()).toEqual([]);
  });

  it("exige un fichier", async () => {
    const id = await create();
    const state = await saveCoverAction(null, form({ id, version: tokenOf(id) }));
    expect(state?.fieldErrors.file).toBe(ARTICLE_MESSAGES.coverRequired);
  });

  it("ancienne image impossible à supprimer : enregistrée quand même, avec un avertissement", async () => {
    const id = await create();
    await uploadCover(id);
    fakeStorage.failRemove = "refus simulé";
    const state = await uploadCover(id);
    expect(state).toMatchObject({ ok: true, tone: "warning" });
    expect(state?.message).toContain("n’a pas pu être supprimée");
  });
});

describe("Suppression", () => {
  it("supprime l'article, ses versions et toutes ses images", async () => {
    const id = await create();
    await save(id, FULL);
    await uploadCover(id);
    await publish(id);
    await uploadCover(id);
    expect(bucketFiles()).toHaveLength(2);

    const url = await expectRedirect(deleteArticleAction(null, form({ id })));
    expect(url).toBe("/admin/articles?resultat=supprime");
    expect(fakeDb.articles).toHaveLength(0);
    expect(fakeDb.articleVersions).toHaveLength(0);
    expect(bucketFiles()).toEqual([]);
  });

  it("image impossible à supprimer : article supprimé, avertissement", async () => {
    const id = await create();
    await uploadCover(id);
    fakeStorage.failRemove = "refus simulé";
    expect(await expectRedirect(deleteArticleAction(null, form({ id })))).toBe(
      "/admin/articles?resultat=supprime-image-conservee",
    );
    expect(fakeDb.articles).toHaveLength(0);
  });

  it("refuse un identifiant mal formé ou inconnu", async () => {
    expect((await deleteArticleAction(null, form({ id: "x" })))?.ok).toBe(false);
    expect((await deleteArticleAction(null, form({ id: fakeId() })))?.message).toBe(ARTICLE_MESSAGES.notFound);
  });
});
