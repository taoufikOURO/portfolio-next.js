import { describe, expect, it } from "vitest";

import { applyFormat, FORMAT_PLACEHOLDERS, type TextSelection } from "./markdown-format";

/** Sélection écrite avec des crochets : « a[bc]d » → texte « abcd », sélection 1-3. */
function sel(marked: string): TextSelection {
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return { value: marked.replace("[", "").replace("]", ""), start, end };
}

function show({ value, start, end }: TextSelection): string {
  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

describe("applyFormat", () => {
  it("gras et italique entourent la sélection", () => {
    expect(show(applyFormat("bold", sel("un [mot] ici")))).toBe("un **[mot]** ici");
    expect(show(applyFormat("italic", sel("un [mot] ici")))).toBe("un _[mot]_ ici");
  });

  it("sans sélection : texte proposé, sélectionné", () => {
    expect(show(applyFormat("bold", sel("a[]b")))).toBe(`a**[${FORMAT_PLACEHOLDERS.bold}]**b`);
  });

  it("titre : préfixe la ligne, sans doubler un titre existant", () => {
    expect(show(applyFormat("heading", sel("avant\nLi[gn]e\naprès")))).toBe("avant\n[## Ligne]\naprès");
    expect(applyFormat("heading", sel("[## Déjà]")).value).toBe("## Déjà");
    expect(show(applyFormat("heading", sel("[]")))).toBe(`## [${FORMAT_PLACEHOLDERS.heading}]`);
  });

  it("liste : préfixe chaque ligne non vide", () => {
    expect(applyFormat("list", sel("[un\ndeux\n\ntrois]")).value).toBe("- un\n- deux\n\n- trois");
    expect(applyFormat("list", sel("[- déjà\n1. aussi\nnon]")).value).toBe("- déjà\n1. aussi\n- non");
  });

  it("code : en ligne, ou bloc sur plusieurs lignes", () => {
    expect(show(applyFormat("code", sel("x [y] z")))).toBe("x `[y]` z");
    expect(applyFormat("code", sel("avant [a\nb] après")).value).toBe("avant \n```\na\nb\n```\n après");
    expect(show(applyFormat("code", sel("[a\nb]")))).toBe("```\n[a\nb]\n```");
  });

  it("lien : texte sélectionné, adresse à compléter sélectionnée", () => {
    expect(show(applyFormat("link", sel("voir [ici]")))).toBe("voir [ici]([https://])");
    expect(applyFormat("link", sel("[]")).value).toBe(`[${FORMAT_PLACEHOLDERS.link}](https://)`);
  });
});
