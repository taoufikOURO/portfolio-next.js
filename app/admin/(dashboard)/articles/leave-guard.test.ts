import { describe, expect, it } from "vitest";

import { shouldWarnBeforeLeaving } from "./leave-guard";

describe("shouldWarnBeforeLeaving (E57)", () => {
  const saved = { dirty: false, inFlight: 0, lastSaveOk: true };

  it("n'avertit pas après un enregistrement réussi (ou sans modification)", () => {
    expect(shouldWarnBeforeLeaving(saved)).toBe(false);
  });

  it("avertit pendant le délai de 1,5 s (frappe pas encore envoyée)", () => {
    expect(shouldWarnBeforeLeaving({ ...saved, dirty: true })).toBe(true);
  });

  it("avertit pendant un envoi (texte ou couverture)", () => {
    expect(shouldWarnBeforeLeaving({ ...saved, inFlight: 1 })).toBe(true);
  });

  it("avertit si le dernier enregistrement n'a pas abouti (échec, refus, conflit)", () => {
    expect(shouldWarnBeforeLeaving({ ...saved, lastSaveOk: false })).toBe(true);
  });
});
