import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { GITHUB_FAILURE_MESSAGES } from "@/lib/github";
import { isObjectPath } from "@/lib/storage/rules";
import { collaboratorsOrphanedByDeletion, getProject, updateProject } from "@/lib/projects";
import { duplicateSlugMessage, PROJECT_MESSAGES, publishedSlugChangeMessage } from "@/lib/validation/project";
import { normalizeTechnologyName } from "@/lib/validation/technology";
import {
  fakeDb,
  fakeGitHub,
  fakeId,
  fakeRequest,
  fakeStorage,
  RedirectError,
  resetFakes,
  revalidatedPaths,
  type FakeCollaborator,
} from "@/test/fakes";

import {
  createProjectAction,
  deleteProjectAction,
  moveProjectAction,
  resyncCollaboratorAction,
  setPublicationAction,
  updateProjectAction,
} from "./actions";

vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
vi.mock("@/lib/storage/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storage/client")>()),
  getStorageContext: () => fakeStorageContext(),
}));
// Le vrai client GitHub tourne (vérifications comprises), avec le faux `fetch` : aucun appel réseau.
vi.mock("@/lib/github", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/github")>();
  const { fakeGitHub: github } = await import("@/test/fakes");
  return {
    ...original,
    fetchGitHubUser: (username: string, options: Parameters<typeof original.fetchGitHubUser>[1] = {}) =>
      original.fetchGitHubUser(username, { ...options, fetch: github.fetch as typeof fetch }),
  };
});
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
const pngFile = (name = "image.png") => new File([PNG], name, { type: "image/png" });

beforeEach(async () => {
  resetFakes();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const adminId = fakeId();
  fakeDb.admins.push({ id: adminId, email: "admin@example.com", passwordHash: "x", emailVerifiedAt: new Date() });
  const { cookieValue } = await createSession(adminId);
  fakeRequest.cookies.set("admin_session", cookieValue);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

const BASE = { title: "Mon projet", description: "Une description." };

function addTechnology(name: string, position = 0) {
  const technology = {
    id: fakeId(),
    name,
    normalizedName: normalizeTechnologyName(name),
    iconPath: `${crypto.randomUUID()}.png`,
    position,
  };
  fakeDb.technologies.push(technology);
  return technology;
}

function addCollaborator(githubUsername: string, data: Partial<FakeCollaborator> = {}): FakeCollaborator {
  const collaborator: FakeCollaborator = {
    id: fakeId(),
    githubUsername,
    name: null,
    avatarUrl: null,
    profileUrl: null,
    syncedAt: null,
    syncError: null,
    ...data,
  };
  fakeDb.collaborators.push(collaborator);
  return collaborator;
}

/** Projet en base, avec image facultative (vrai fichier dans le faux bucket) et collaborateurs. */
function addProject(
  title: string,
  options: { position?: number; slug?: string; image?: boolean; isPublished?: boolean; collaborators?: FakeCollaborator[] } = {},
) {
  const imagePath = options.image ? `${crypto.randomUUID()}.png` : null;
  if (imagePath) fakeStorage.files.set(`dev-projets/${imagePath}`, PNG);
  const project = {
    id: fakeId(),
    title,
    slug: options.slug ?? title.toLowerCase().replace(/\s+/g, "-"),
    description: "Description.",
    imagePath,
    isPublished: options.isPublished ?? false,
    date: null,
    position: options.position ?? fakeDb.projects.length,
  };
  fakeDb.projects.push(project);
  for (const collaborator of options.collaborators ?? []) {
    fakeDb.projectCollaborators.push({ projectId: project.id, collaboratorId: collaborator.id });
  }
  return project;
}

const project = (id: string) => fakeDb.projects.find((row) => row.id === id);
const collaborator = (username: string) => fakeDb.collaborators.find((row) => row.githubUsername === username);
const storedPaths = () => [...fakeStorage.files.keys()].sort();

function projectIdFrom(url: string): string {
  const match = /^\/admin\/projets\/([0-9a-f-]{36})\?resultat=/.exec(url);
  if (!match) throw new Error(`Redirection inattendue : ${url}`);
  return match[1];
}

describe("session exigée", () => {
  it("chaque action redirige vers la connexion sans session, sans rien écrire ni appeler GitHub", async () => {
    fakeRequest.cookies.clear();
    const existing = addProject("Existant", { image: true });
    const shared = addCollaborator("octocat");
    fakeGitHub.users.set("mona", { name: "Mona" });
    const before = { files: storedPaths(), projects: JSON.stringify(fakeDb.projects) };

    const fields = { ...BASE, collaborators: "mona", image: pngFile() };
    for (const promise of [
      createProjectAction(null, form(fields)),
      updateProjectAction(null, form({ ...fields, id: existing.id })),
      moveProjectAction(null, form({ id: existing.id, direction: "down" })),
      setPublicationAction(null, form({ id: existing.id, publish: "1", confirmed: "1" })),
      deleteProjectAction(null, form({ id: existing.id })),
      resyncCollaboratorAction(form({ projectId: existing.id, collaboratorId: shared.id })),
    ]) {
      expect(await expectRedirect(promise)).toBe("/admin/connexion");
    }
    expect(storedPaths()).toEqual(before.files);
    expect(JSON.stringify(fakeDb.projects)).toBe(before.projects);
    expect(fakeGitHub.requests).toEqual([]);
  });
});

describe("création", () => {
  it("crée un projet non publié, en dernière position, avec liens ordonnés, technologies et collaborateurs", async () => {
    addProject("Premier", { position: 0 });
    const react = addTechnology("React", 0);
    const prisma = addTechnology("Prisma", 1);
    fakeGitHub.users.set("octocat", { name: "The Octocat" });

    const url = await expectRedirect(
      createProjectAction(
        null,
        form({
          ...BASE,
          title: "Café & Co",
          slug: "",
          date: "2024-06",
          linkLabel: ["Code source", "", "Démo"],
          linkUrl: ["https://github.com/moi/cafe", "", "https://cafe.example.com"],
          technologyIds: [prisma.id, react.id],
          collaborators: "OctoCat\noctocat\n",
          // Valeur envoyée à la main : ignorée, un projet est toujours créé non publié.
          isPublished: "true",
        }),
      ),
    );
    const id = projectIdFrom(url);
    expect(url).toBe(`/admin/projets/${id}?resultat=cree`);

    const created = await fakeDb.client.project.findUnique({ where: { id } });
    expect(created).toMatchObject({
      title: "Café & Co",
      slug: "cafe-co",
      isPublished: false,
      position: 1,
      imagePath: null,
      date: new Date("2024-06-01T00:00:00.000Z"),
    });
    expect(created?.links.map(({ label, url: link, position }) => ({ label, url: link, position }))).toEqual([
      { label: "Code source", url: "https://github.com/moi/cafe", position: 0 },
      { label: "Démo", url: "https://cafe.example.com", position: 1 },
    ]);
    expect(created?.technologies.map((technology) => technology.name)).toEqual(["React", "Prisma"]);
    expect(created?.collaborators).toHaveLength(1);
    expect(collaborator("octocat")).toMatchObject({
      name: "The Octocat",
      avatarUrl: expect.stringMatching(/^https:\/\/avatars\.githubusercontent\.com\//),
      profileUrl: "https://github.com/octocat",
      syncError: null,
      syncedAt: expect.any(Date),
    });
    // Doublon de la saisie (casse comprise) : un seul appel.
    expect(fakeGitHub.requests).toEqual(["octocat"]);
    expect(revalidatedPaths).toEqual(["/admin/projets (layout)", "/admin/stack (layout)"]);
  });

  it("envoie l'image dans dev-projets et enregistre son chemin", async () => {
    const id = projectIdFrom(await expectRedirect(createProjectAction(null, form({ ...BASE, image: pngFile("Photo.png") }))));
    const imagePath = project(id)?.imagePath;
    expect(imagePath && isObjectPath(imagePath)).toBe(true);
    expect(storedPaths()).toEqual([`dev-projets/${imagePath}`]);
  });

  it("slug en double : refus avant tout envoi d'image et tout appel à GitHub", async () => {
    addProject("Existant", { slug: "mon-projet" });
    fakeGitHub.users.set("octocat", { name: "The Octocat" });

    const state = await createProjectAction(null, form({ ...BASE, collaborators: "octocat", image: pngFile() }));
    expect(state).toMatchObject({ ok: false, fieldErrors: { slug: duplicateSlugMessage("mon-projet") } });
    expect(state?.values?.collaborators).toBe("octocat");
    expect(storedPaths()).toEqual([]);
    expect(fakeGitHub.requests).toEqual([]);
    expect(fakeDb.collaborators).toEqual([]);
    expect(fakeDb.projects).toHaveLength(1);
  });

  it("slug saisi déjà pris : même refus", async () => {
    addProject("Autre", { slug: "pris" });
    const state = await createProjectAction(null, form({ ...BASE, slug: "pris" }));
    expect(state?.fieldErrors.slug).toBe(duplicateSlugMessage("pris"));
  });

  it("slug pris entre le contrôle et l'enregistrement : refus, image envoyée supprimée", async () => {
    const original = fakeDb.client.project.findUnique;
    let calls = 0;
    vi.spyOn(fakeDb.client.project, "findUnique").mockImplementation(async (args) => {
      calls += 1;
      // Premier contrôle libre ; un autre onglet crée le même slug avant la transaction.
      if (calls === 2) addProject("Concurrent", { slug: "mon-projet" });
      return original(args);
    });
    const state = await createProjectAction(null, form({ ...BASE, image: pngFile() }));
    expect(state?.fieldErrors.slug).toBe(duplicateSlugMessage("mon-projet"));
    expect(storedPaths()).toEqual([]);
  });

  it("nom d'utilisateur invalide : refus, jamais envoyé à GitHub", async () => {
    const state = await createProjectAction(null, form({ ...BASE, collaborators: "octocat\n-invalide\nde--ux" }));
    expect(state?.ok).toBe(false);
    expect(state?.fieldErrors.collaborators).toMatch(/« -invalide »/);
    expect(fakeGitHub.requests).toEqual([]);
    expect(fakeDb.projects).toEqual([]);
  });

  it("plus de 30 collaborateurs : refus", async () => {
    const names = Array.from({ length: 31 }, (_, index) => `u${index}`).join("\n");
    const state = await createProjectAction(null, form({ ...BASE, collaborators: names }));
    expect(state?.fieldErrors.collaborators).toBe(PROJECT_MESSAGES.collaboratorsTooMany);
    expect(fakeGitHub.requests).toEqual([]);
  });

  it("lien en http:// : refus, rien d'enregistré", async () => {
    const state = await createProjectAction(null, form({ ...BASE, linkLabel: "Démo", linkUrl: "http://demo.example.com" }));
    expect(state?.fieldErrors.links).toMatch(/^Lien 1 : l’adresse doit commencer par https:\/\//);
    expect(state?.values?.links).toEqual([{ label: "Démo", url: "http://demo.example.com" }]);
    expect(fakeDb.projects).toEqual([]);
  });

  it("technologie supprimée entre-temps : refus", async () => {
    const state = await createProjectAction(null, form({ ...BASE, technologyIds: fakeId() }));
    expect(state?.fieldErrors.technologyIds).toBe(PROJECT_MESSAGES.technologiesMissing);
    expect(fakeDb.projects).toEqual([]);
  });

  it("image refusée (faux PNG) : message sous le champ, rien d'enregistré", async () => {
    const state = await createProjectAction(
      null,
      form({ ...BASE, image: new File(["pas une image"], "faux.png", { type: "image/png" }) }),
    );
    expect(state?.fieldErrors.image).toBeTruthy();
    expect(fakeDb.projects).toEqual([]);
    expect(storedPaths()).toEqual([]);
  });
});

describe("échecs GitHub", () => {
  it.each([
    ["utilisateur introuvable", "not-found", GITHUB_FAILURE_MESSAGES["not-found"]],
    ["limite d'API", "rate-limited", GITHUB_FAILURE_MESSAGES["rate-limited"]],
  ] as const)("%s : collaborateur enregistré avec son seul nom, avertissement", async (_label, failure, message) => {
    fakeGitHub.failures.set("fantome", failure);
    fakeGitHub.users.set("octocat", { name: "The Octocat" });

    const url = await expectRedirect(createProjectAction(null, form({ ...BASE, collaborators: "fantome\noctocat" })));
    expect(url).toMatch(/\?resultat=cree-github$/);
    expect(collaborator("fantome")).toMatchObject({
      name: null,
      avatarUrl: null,
      profileUrl: null,
      syncedAt: null,
      syncError: message,
    });
    expect(collaborator("octocat")?.syncError).toBeNull();
    expect(project(projectIdFrom(url))).toBeDefined();
  });

  it("délai dépassé (5 s) : collaborateur enregistré, avertissement", async () => {
    vi.useFakeTimers();
    fakeGitHub.failures.set("lent", "timeout");
    const pending = expectRedirect(createProjectAction(null, form({ ...BASE, collaborators: "lent" })));
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toMatch(/\?resultat=cree-github$/);
    expect(collaborator("lent")?.syncError).toBe(GITHUB_FAILURE_MESSAGES.timeout);
  });

  it("« Relancer la récupération » après un échec : profil récupéré, erreur effacée", async () => {
    fakeGitHub.failures.set("fantome", "rate-limited");
    const id = projectIdFrom(await expectRedirect(createProjectAction(null, form({ ...BASE, collaborators: "fantome" }))));
    const saved = collaborator("fantome")!;

    fakeGitHub.failures.clear();
    fakeGitHub.users.set("fantome", { name: "Fantôme" });
    const url = await expectRedirect(resyncCollaboratorAction(form({ projectId: id, collaboratorId: saved.id })));
    expect(url).toBe(`/admin/projets/${id}?resultat=collaborateur-recupere`);
    expect(collaborator("fantome")).toMatchObject({
      name: "Fantôme",
      profileUrl: "https://github.com/fantome",
      syncError: null,
      syncedAt: expect.any(Date),
    });
  });

  it("relance de nouveau en échec : données connues conservées, erreur enregistrée", async () => {
    const known = addCollaborator("octocat", {
      name: "Ancien nom",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
      profileUrl: "https://github.com/octocat",
      syncedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const owner = addProject("Projet", { collaborators: [known] });
    fakeGitHub.failures.set("octocat", "not-found");

    const url = await expectRedirect(resyncCollaboratorAction(form({ projectId: owner.id, collaboratorId: known.id })));
    expect(url).toMatch(/\?resultat=collaborateur-echec$/);
    expect(collaborator("octocat")).toMatchObject({
      name: "Ancien nom",
      syncedAt: new Date("2026-01-01T00:00:00Z"),
      syncError: GITHUB_FAILURE_MESSAGES["not-found"],
    });
  });

  it("relance d'un collaborateur inconnu ou d'identifiants invalides : rien d'écrit", async () => {
    const owner = addProject("Projet");
    expect(await expectRedirect(resyncCollaboratorAction(form({ projectId: owner.id, collaboratorId: fakeId() })))).toMatch(
      /collaborateur-echec$/,
    );
    expect(await expectRedirect(resyncCollaboratorAction(form({ projectId: "x", collaboratorId: "y" })))).toBe(
      "/admin/projets",
    );
    expect(fakeGitHub.requests).toEqual([]);
  });
});

describe("collaborateurs partagés et orphelins", () => {
  it("un collaborateur déjà connu n'est ni redemandé à GitHub ni mis à jour sans relance", async () => {
    const known = addCollaborator("octocat", { name: "Ancien nom", syncedAt: new Date("2026-01-01T00:00:00Z") });
    addProject("Projet A", { collaborators: [known] });
    fakeGitHub.users.set("octocat", { name: "Nouveau nom" });
    fakeGitHub.users.set("mona", { name: "Mona" });

    const id = projectIdFrom(await expectRedirect(createProjectAction(null, form({ ...BASE, collaborators: "octocat\nmona" }))));
    expect(fakeGitHub.requests).toEqual(["mona"]);
    expect(collaborator("octocat")).toMatchObject({ id: known.id, name: "Ancien nom" });
    expect(fakeDb.calls.collaboratorWrites.filter((write) => write.githubUsername === "octocat")).toEqual([
      { op: "upsert-existing", githubUsername: "octocat" },
    ]);
    // Partagé : une seule ligne, rattachée aux deux projets.
    expect(fakeDb.collaborators.filter((row) => row.githubUsername === "octocat")).toHaveLength(1);
    expect(fakeDb.projectCollaborators.filter((link) => link.collaboratorId === known.id)).toHaveLength(2);

    // Modification du second projet : toujours aucun appel ni mise à jour pour octocat.
    fakeGitHub.requests.length = 0;
    await expectRedirect(updateProjectAction(null, form({ ...BASE, id, slug: "mon-projet", collaborators: "octocat\nmona" })));
    expect(fakeGitHub.requests).toEqual([]);
    expect(collaborator("octocat")?.name).toBe("Ancien nom");

    // Seule la relance le met à jour.
    await expectRedirect(resyncCollaboratorAction(form({ projectId: id, collaboratorId: known.id })));
    expect(fakeGitHub.requests).toEqual(["octocat"]);
    expect(collaborator("octocat")?.name).toBe("Nouveau nom");
  });

  it("collaborateur retiré d'un projet : supprimé s'il n'est plus rattaché à aucun projet, conservé sinon", async () => {
    const seul = addCollaborator("seul");
    const partage = addCollaborator("partage");
    const a = addProject("Projet A", { slug: "projet-a", collaborators: [seul, partage] });
    addProject("Projet B", { slug: "projet-b", collaborators: [partage] });

    await expectRedirect(updateProjectAction(null, form({ ...BASE, id: a.id, slug: "projet-a", collaborators: "" })));
    expect(collaborator("seul")).toBeUndefined();
    expect(collaborator("partage")).toBeDefined();
    expect(fakeDb.projectCollaborators.filter((link) => link.projectId === a.id)).toEqual([]);
  });

  it("suppression d'un projet : collaborateurs devenus orphelins supprimés, partagés conservés", async () => {
    const seul = addCollaborator("seul");
    const partage = addCollaborator("partage");
    const a = addProject("Projet A", { slug: "projet-a", collaborators: [seul, partage] });
    const b = addProject("Projet B", { slug: "projet-b", collaborators: [partage] });

    await expectRedirect(deleteProjectAction(null, form({ id: a.id })));
    expect(collaborator("seul")).toBeUndefined();
    expect(collaborator("partage")).toBeDefined();

    await expectRedirect(deleteProjectAction(null, form({ id: b.id })));
    expect(fakeDb.collaborators).toEqual([]);
  });
});

describe("modification", () => {
  it("met à jour informations, liens (remplacés dans l'ordre), technologies ; statut et position inchangés", async () => {
    const react = addTechnology("React");
    const vue = addTechnology("Vue", 1);
    const existing = addProject("Ancien titre", { slug: "ancien", isPublished: true, position: 3 });
    fakeDb.projectLinks.push({ id: fakeId(), projectId: existing.id, label: "Vieux", url: "https://old.example", position: 0 });
    fakeDb.projectTechnologies.push({ projectId: existing.id, technologyId: react.id });

    const url = await expectRedirect(
      updateProjectAction(
        null,
        form({
          id: existing.id,
          title: "Nouveau titre",
          slug: "ancien",
          description: "Nouvelle description.",
          date: "",
          linkLabel: ["Démo", "Code"],
          linkUrl: ["https://demo.example", "https://github.com/moi/p"],
          technologyIds: [vue.id],
          // Tentatives de changer le statut par le formulaire : ignorées.
          isPublished: "false",
          publish: "0",
          confirmed: "1",
        }),
      ),
    );
    expect(url).toBe(`/admin/projets/${existing.id}?resultat=modifie`);
    const updated = await fakeDb.client.project.findUnique({ where: { id: existing.id } });
    expect(updated).toMatchObject({ title: "Nouveau titre", slug: "ancien", isPublished: true, position: 3, date: null });
    expect(updated?.links.map((link) => [link.label, link.position])).toEqual([
      ["Démo", 0],
      ["Code", 1],
    ]);
    expect(updated?.technologies.map((technology) => technology.name)).toEqual(["Vue"]);
  });

  it("slug d'un autre projet : refus avant tout envoi d'image et tout appel à GitHub", async () => {
    addProject("Autre", { slug: "pris" });
    const existing = addProject("Mien", { slug: "mien", image: true });
    const before = storedPaths();
    fakeGitHub.users.set("mona", { name: "Mona" });

    const state = await updateProjectAction(
      null,
      form({ ...BASE, id: existing.id, slug: "pris", collaborators: "mona", image: pngFile() }),
    );
    expect(state?.fieldErrors.slug).toBe(duplicateSlugMessage("pris"));
    expect(storedPaths()).toEqual(before);
    expect(fakeGitHub.requests).toEqual([]);
    expect(project(existing.id)?.slug).toBe("mien");
  });

  it("remplacement de l'image : nouvelle image enregistrée, ancienne supprimée après la mise à jour en base", async () => {
    const existing = addProject("Mien", { slug: "mien", image: true });
    const oldPath = existing.imagePath!;
    const original = fakeDb.client.project.update;
    let oldFileAtUpdate: boolean | undefined;
    vi.spyOn(fakeDb.client.project, "update").mockImplementation(async (args) => {
      oldFileAtUpdate = fakeStorage.files.has(`dev-projets/${oldPath}`);
      return original(args);
    });

    const url = await expectRedirect(updateProjectAction(null, form({ ...BASE, id: existing.id, slug: "mien", image: pngFile() })));
    expect(url).toMatch(/\?resultat=modifie$/);
    const newPath = project(existing.id)?.imagePath;
    expect(newPath).not.toBe(oldPath);
    expect(oldFileAtUpdate).toBe(true);
    expect(storedPaths()).toEqual([`dev-projets/${newPath}`]);
  });

  it("ancienne image impossible à supprimer : modification valide, avertissement", async () => {
    const existing = addProject("Mien", { slug: "mien", image: true });
    const original = fakeStorage.context.api.from;
    vi.spyOn(fakeStorage.context.api, "from").mockImplementation((bucket: string) => {
      const api = original(bucket);
      return { ...api, remove: async () => ({ error: { message: "refusé" } }) };
    });
    const url = await expectRedirect(updateProjectAction(null, form({ ...BASE, id: existing.id, slug: "mien", image: pngFile() })));
    expect(url).toMatch(/\?resultat=modifie-ancienne-image$/);
  });

  it("sans nouveau fichier, l'image actuelle est conservée", async () => {
    const existing = addProject("Mien", { slug: "mien", image: true });
    const before = storedPaths();
    await expectRedirect(updateProjectAction(null, form({ ...BASE, id: existing.id, slug: "mien", image: new File([], "") })));
    expect(project(existing.id)?.imagePath).toBe(existing.imagePath);
    expect(storedPaths()).toEqual(before);
  });

  it("projet supprimé entre-temps : refus", async () => {
    const state = await updateProjectAction(null, form({ ...BASE, id: fakeId() }));
    expect(state?.message).toBe(PROJECT_MESSAGES.notFound);
  });
});

describe("statut : changé uniquement par la page de confirmation", () => {
  it("publier puis retirer de la publication, avec confirmation", async () => {
    const existing = addProject("Mien");
    expect(await expectRedirect(setPublicationAction(null, form({ id: existing.id, publish: "1", confirmed: "1" })))).toBe(
      `/admin/projets/${existing.id}?resultat=publie`,
    );
    expect(project(existing.id)?.isPublished).toBe(true);
    expect(await expectRedirect(setPublicationAction(null, form({ id: existing.id, publish: "0", confirmed: "1" })))).toBe(
      `/admin/projets/${existing.id}?resultat=depublie`,
    );
    expect(project(existing.id)?.isPublished).toBe(false);
  });

  it("sans confirmation, ou statut demandé absent : rien ne change", async () => {
    const existing = addProject("Mien");
    const attempts: Record<string, string>[] = [{ publish: "1" }, { publish: "1", confirmed: "0" }, { confirmed: "1" }, {}];
    for (const fields of attempts) {
      const state = await setPublicationAction(null, form({ id: existing.id, ...fields }));
      expect(state).toMatchObject({ ok: false, message: PROJECT_MESSAGES.publicationInvalid });
    }
    expect(project(existing.id)?.isPublished).toBe(false);
  });

  it("statut déjà dans l'état demandé (double envoi) : inchangé, signalé", async () => {
    const existing = addProject("Mien", { isPublished: true });
    expect(await expectRedirect(setPublicationAction(null, form({ id: existing.id, publish: "1", confirmed: "1" })))).toMatch(
      /resultat=statut-inchange$/,
    );
    expect(project(existing.id)?.isPublished).toBe(true);
  });

  it("le formulaire du projet ne modifie jamais le statut (création et modification)", async () => {
    const published = addProject("Publié", { slug: "publie", isPublished: true });
    await expectRedirect(updateProjectAction(null, form({ ...BASE, id: published.id, slug: "publie", isPublished: "false" })));
    expect(project(published.id)?.isPublished).toBe(true);

    const draft = addProject("Brouillon", { slug: "brouillon" });
    await expectRedirect(
      updateProjectAction(null, form({ ...BASE, id: draft.id, slug: "brouillon", isPublished: "true", publish: "1", confirmed: "1" })),
    );
    expect(project(draft.id)?.isPublished).toBe(false);
  });

  it("projet inconnu : refus", async () => {
    expect(await setPublicationAction(null, form({ id: fakeId(), publish: "1", confirmed: "1" }))).toMatchObject({
      ok: false,
      message: PROJECT_MESSAGES.notFound,
    });
  });
});

describe("suppression", () => {
  it("supprime le projet, ses liens, ses rattachements et son image ; technologies conservées", async () => {
    const react = addTechnology("React");
    const existing = addProject("Mien", { image: true });
    fakeDb.projectLinks.push({ id: fakeId(), projectId: existing.id, label: "Démo", url: "https://d.example", position: 0 });
    fakeDb.projectTechnologies.push({ projectId: existing.id, technologyId: react.id });

    expect(await expectRedirect(deleteProjectAction(null, form({ id: existing.id })))).toBe("/admin/projets?resultat=supprime");
    expect(fakeDb.projects).toEqual([]);
    expect(fakeDb.projectLinks).toEqual([]);
    expect(fakeDb.projectTechnologies).toEqual([]);
    expect(fakeDb.technologies).toHaveLength(1);
    expect(storedPaths()).toEqual([]);
  });

  it("image impossible à supprimer du stockage : projet supprimé, avertissement", async () => {
    const existing = addProject("Mien", { image: true });
    fakeStorage.failRemove = "refusé";
    expect(await expectRedirect(deleteProjectAction(null, form({ id: existing.id })))).toBe(
      "/admin/projets?resultat=supprime-image-conservee",
    );
    expect(fakeDb.projects).toEqual([]);
  });

  it("projet inconnu : refus", async () => {
    expect(await deleteProjectAction(null, form({ id: fakeId() }))).toMatchObject({ ok: false, message: PROJECT_MESSAGES.notFound });
  });
});

describe("ordre", () => {
  it("« Monter » et « Descendre » échangent avec le voisin et renumérotent 0, 1, 2", async () => {
    const a = addProject("A", { position: 0 });
    const b = addProject("B", { position: 5 });
    const c = addProject("C", { position: 9 });

    expect(await moveProjectAction(null, form({ id: c.id, direction: "up" }))).toMatchObject({
      ok: true,
      position: 2,
      total: 3,
    });
    const order = () =>
      [...fakeDb.projects].sort((left, right) => left.position - right.position).map((row) => [row.title, row.position]);
    expect(order()).toEqual([
      ["A", 0],
      ["C", 1],
      ["B", 2],
    ]);
    expect(await moveProjectAction(null, form({ id: a.id, direction: "up" }))).toMatchObject({ ok: false });
    expect(await moveProjectAction(null, form({ id: b.id, direction: "down" }))).toMatchObject({ ok: false });
    expect(await moveProjectAction(null, form({ id: b.id, direction: "côté" }))).toMatchObject({
      ok: false,
      message: PROJECT_MESSAGES.moveInvalid,
    });
  });
});

describe("slug d'un projet publié : confirmation explicite (E54 point 5)", () => {
  it("changer le slug d'un projet publié sans confirmation : refus avec l'ancienne et la nouvelle adresse, rien d'envoyé", async () => {
    const published = addProject("Publié", { slug: "ancien", isPublished: true, image: true });
    const before = storedPaths();
    fakeGitHub.users.set("mona", { name: "Mona" });

    const state = await updateProjectAction(
      null,
      form({ ...BASE, id: published.id, slug: "nouveau", collaborators: "mona", image: pngFile() }),
    );
    expect(state).toMatchObject({
      ok: false,
      fieldErrors: { confirmSlugChange: publishedSlugChangeMessage("ancien", "nouveau") },
    });
    expect(state?.fieldErrors.confirmSlugChange).toContain("/projets/ancien");
    expect(state?.fieldErrors.confirmSlugChange).toContain("/projets/nouveau");
    expect(state?.fieldErrors.confirmSlugChange).toMatch(/adresse publique/);
    expect(project(published.id)?.slug).toBe("ancien");
    expect(storedPaths()).toEqual(before);
    expect(fakeGitHub.requests).toEqual([]);
  });

  it("slug vidé (régénéré depuis le titre) sur un projet publié : confirmation exigée aussi", async () => {
    const published = addProject("Publié", { slug: "ancien", isPublished: true });
    const state = await updateProjectAction(null, form({ ...BASE, id: published.id, slug: "" }));
    expect(state?.fieldErrors.confirmSlugChange).toBe(publishedSlugChangeMessage("ancien", "mon-projet"));
  });

  it("avec la case cochée : nouveau slug enregistré, projet toujours publié", async () => {
    const published = addProject("Publié", { slug: "ancien", isPublished: true });
    const url = await expectRedirect(
      updateProjectAction(null, form({ ...BASE, id: published.id, slug: "nouveau", confirmSlugChange: "1" })),
    );
    expect(url).toMatch(/\?resultat=modifie$/);
    expect(project(published.id)).toMatchObject({ slug: "nouveau", isPublished: true });
  });

  it("une valeur autre que « 1 » ne vaut pas confirmation", async () => {
    const published = addProject("Publié", { slug: "ancien", isPublished: true });
    const state = await updateProjectAction(
      null,
      form({ ...BASE, id: published.id, slug: "nouveau", confirmSlugChange: "on" }),
    );
    expect(state?.fieldErrors.confirmSlugChange).toBeTruthy();
    expect(project(published.id)?.slug).toBe("ancien");
  });

  it("slug inchangé d'un projet publié, ou projet non publié : aucune confirmation demandée", async () => {
    const published = addProject("Publié", { slug: "publie", isPublished: true });
    await expectRedirect(updateProjectAction(null, form({ ...BASE, id: published.id, slug: "publie" })));
    const draft = addProject("Brouillon", { slug: "brouillon" });
    await expectRedirect(updateProjectAction(null, form({ ...BASE, id: draft.id, slug: "brouillon-2" })));
    expect(project(draft.id)?.slug).toBe("brouillon-2");
  });

  it("projet publié entre l'affichage du formulaire et l'enregistrement : refus dans la transaction", async () => {
    const draft = addProject("Brouillon", { slug: "brouillon" });
    // Le contrôle de l'action voit un brouillon ; le projet est publié juste avant la transaction.
    const original = fakeDb.client.project.findUnique;
    let calls = 0;
    vi.spyOn(fakeDb.client.project, "findUnique").mockImplementation(async (args) => {
      calls += 1;
      if (calls === 3) project(draft.id)!.isPublished = true;
      return original(args);
    });
    const state = await updateProjectAction(null, form({ ...BASE, id: draft.id, slug: "nouveau" }));
    expect(state?.fieldErrors.confirmSlugChange).toBe(publishedSlugChangeMessage("brouillon", "nouveau"));
    expect(project(draft.id)?.slug).toBe("brouillon");
  });

  it("updateProject refuse aussi sans confirmation (règle appliquée sous verrou)", async () => {
    const published = addProject("Publié", { slug: "ancien", isPublished: true });
    const input = {
      title: "Publié",
      slug: "nouveau",
      description: "D.",
      date: null,
      links: [],
      technologyIds: [],
      collaborators: [],
      confirmSlugChange: false,
    };
    expect(await updateProject(published.id, input, { newCollaborators: [] })).toEqual({
      status: "slug-change-unconfirmed",
      currentSlug: "ancien",
      slug: "nouveau",
    });
    const saved = await updateProject(published.id, { ...input, confirmSlugChange: true }, { newCollaborators: [] });
    expect(saved.status).toBe("saved");
  });
});

describe("confirmation de suppression : collaborateurs orphelins nommés (E54 point 8)", () => {
  it("nomme les collaborateurs rattachés à ce seul projet, pas ceux partagés", async () => {
    const seul = addCollaborator("seul", { name: "Seule Personne" });
    const sansNom = addCollaborator("sans-nom");
    const partage = addCollaborator("partage", { name: "Partagée" });
    const a = addProject("Projet A", { slug: "projet-a", collaborators: [seul, sansNom, partage] });
    addProject("Projet B", { slug: "projet-b", collaborators: [partage] });

    const loaded = await getProject(a.id);
    expect(collaboratorsOrphanedByDeletion(loaded!)).toEqual(["@sans-nom", "Seule Personne (@seul)"]);

    // Les noms annoncés sont exactement ceux que la suppression retire.
    await expectRedirect(deleteProjectAction(null, form({ id: a.id })));
    expect(fakeDb.collaborators.map((row) => row.githubUsername)).toEqual(["partage"]);
  });

  it("aucun orphelin : liste vide", async () => {
    const partage = addCollaborator("partage");
    const a = addProject("Projet A", { slug: "projet-a", collaborators: [partage] });
    addProject("Projet B", { slug: "projet-b", collaborators: [partage] });
    expect(collaboratorsOrphanedByDeletion((await getProject(a.id))!)).toEqual([]);
    const empty = addProject("Vide", { slug: "vide" });
    expect(collaboratorsOrphanedByDeletion((await getProject(empty.id))!)).toEqual([]);
  });
});
