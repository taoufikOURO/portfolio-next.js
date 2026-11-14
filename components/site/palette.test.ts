import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Palette publique (E62) : contrastes WCAG AA mesurés sur les valeurs de `site.css`.

const css = readFileSync(join(process.cwd(), "app", "(site)", "site.css"), "utf8");

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css);
  if (!match) throw new Error(`jeton absent : ${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("palette publique", () => {
  it("valeurs finales", () => {
    expect({
      paper: token("paper"),
      ink: token("ink"),
      muted: token("muted"),
      signal: token("signal"),
      tile: token("tile"),
      rule: token("rule"),
      white: token("white"),
    }).toEqual({
      paper: "#ececec",
      ink: "#0f0f10",
      muted: "#5f636a",
      signal: "#e0463a",
      tile: "#dcdcdc",
      rule: "#c4c4c8",
      white: "#ffffff",
    });
  });

  it("texte courant : au moins 4,5", () => {
    const pairs: [string, string][] = [
      ["ink", "paper"],
      ["muted", "paper"],
      ["ink", "white"],
      ["muted", "white"],
      ["ink", "tile"],
      // Lettres pleines du titre et chiffres posés sur le bloc rouge.
      ["ink", "signal"],
      // Lien actif et bouton principal : texte clair sur fond noir.
      ["paper", "ink"],
    ];
    for (const [text, background] of pairs) {
      expect(contrast(token(text), token(background)), `${text} sur ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("éléments graphiques (focus, contours) : au moins 3", () => {
    expect(contrast(token("ink"), token("paper"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("ink"), token("signal"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("signal"), token("paper"))).toBeGreaterThanOrEqual(3);
  });

  it("combinaisons interdites, mesurées : texte secondaire sur carte grise ou sur rouge, texte rouge", () => {
    expect(contrast(token("muted"), token("tile"))).toBeLessThan(4.5);
    expect(contrast(token("muted"), token("signal"))).toBeLessThan(4.5);
    expect(contrast(token("signal"), token("paper"))).toBeLessThan(4.5);
    // Le rouge n'est jamais utilisé comme couleur de texte.
    expect(/text-signal/.test(css)).toBe(false);
  });
});
