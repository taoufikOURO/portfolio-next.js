import { describe, expect, it } from "vitest";

import {
  BODY_TOO_LARGE_MESSAGE,
  estimateBodyBytes,
  exceedsBodyLimit,
  SERVER_ACTION_BODY_LIMIT_BYTES,
} from "./upload-guard";

const MB = 1024 * 1024;

function form(fileSize: number, name = "React") {
  const data = new FormData();
  data.set("name", name);
  data.set("icon", new File([new Uint8Array(fileSize)], "a.png", { type: "image/png" }));
  return data;
}

describe("garde-fou de la taille du corps (E52)", () => {
  it("accepte un fichier nettement sous 1 Mo", () => {
    expect(exceedsBodyLimit(form(500 * 1024))).toBe(false);
  });

  it("refuse un fichier de plus de 1 Mo", () => {
    expect(exceedsBodyLimit(form(MB + 1))).toBe(true);
    expect(exceedsBodyLimit(form(1.5 * MB))).toBe(true);
  });

  it("refuse un fichier d'exactement 1 Mo : avec l'enveloppe du formulaire, le corps dépasse la limite de Next.js", () => {
    expect(exceedsBodyLimit(form(MB))).toBe(true);
  });

  it("compte le texte et la marge dans l'estimation", () => {
    expect(estimateBodyBytes(form(0, "abc"))).toBeGreaterThan(9);
    expect(estimateBodyBytes(form(1000))).toBeGreaterThan(1000);
    expect(exceedsBodyLimit(form(SERVER_ACTION_BODY_LIMIT_BYTES - 8 * 1024, "x".repeat(100)))).toBe(false);
  });

  it("annonce la limite en Mo dans le message", () => {
    expect(BODY_TOO_LARGE_MESSAGE).toMatch(/1 Mo/);
  });
});
