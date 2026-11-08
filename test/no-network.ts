// Chargé avant chaque fichier de test (`setupFiles` de vitest.config.mts) :
// aucun test ne doit faire d'appel réseau réel. Le `fetch` global lève une
// erreur s'il est appelé ; un test qui a besoin d'une réponse passe un faux
// `fetch` (par exemple `fakeGitHub.fetch`, `test/fakes.ts`).
//
// Affectation directe (pas `vi.stubGlobal`) : `vi.unstubAllGlobals()` dans un
// test rétablit cette version, pas le vrai `fetch`.

export const NETWORK_FORBIDDEN_MESSAGE = "Appel réseau interdit pendant les tests (fetch global bloqué par test/no-network.ts).";

function forbiddenFetch(): never {
  throw new Error(NETWORK_FORBIDDEN_MESSAGE);
}

globalThis.fetch = forbiddenFetch as unknown as typeof fetch;
