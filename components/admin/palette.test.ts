import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Vérifie, à partir des valeurs réelles de `app/admin/admin.css`, les ratios de
 * contraste annoncés au tableau de `docs/plan_implementation.md` §3.3.
 */

const css = readFileSync(new URL("../../app/admin/admin.css", import.meta.url), "utf8");

function color(name: string): [number, number, number] {
    const match = css.match(new RegExp(`--color-${name}:\\s*#([0-9a-f]{6})`, "i"));
    if (!match) throw new Error(`Couleur --color-${name} introuvable dans admin.css`);
    const hex = match[1];
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: string, b: string) {
    const [la, lb] = [luminance(color(a)), luminance(color(b))];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("palette de l'admin : contrastes du plan §3.3", () => {
    it("déclare exactement les cinq couleurs de la charte", () => {
        const declared = [...css.matchAll(/--color-([a-z-]+):\s*#[0-9a-f]{6}/gi)].map((m) => m[1]);
        expect(declared.sort()).toEqual(["cream", "sage", "sand", "slate-blue", "terracotta"]);
    });

    it("bleu-gris sur crème, et inversement : 8,87 (texte courant, boutons, barre latérale)", () => {
        expect(ratio("slate-blue", "cream")).toBeCloseTo(8.87, 1);
    });

    it("sable sur bleu-gris : 6,63 (élément actif) et bleu-gris sur sable (badges, avertissements)", () => {
        expect(ratio("sand", "slate-blue")).toBeCloseTo(6.63, 1);
    });

    it("bleu-gris sur terracotta : 3,42, seulement en grand texte (≥ 3 mais < 4,5)", () => {
        const value = ratio("slate-blue", "terracotta");
        expect(value).toBeCloseTo(3.42, 1);
        expect(value).toBeGreaterThanOrEqual(3);
        expect(value).toBeLessThan(4.5);
    });

    it("pastille sauge sur bleu-gris : 4,21 (élément non textuel, seuil 3)", () => {
        const value = ratio("sage", "slate-blue");
        expect(value).toBeCloseTo(4.21, 1);
        expect(value).toBeGreaterThanOrEqual(3);
    });

    it("filet terracotta sur bleu-gris : 3,42 (élément non textuel, seuil 3)", () => {
        expect(ratio("terracotta", "slate-blue")).toBeGreaterThanOrEqual(3);
    });

    it("les couples interdits restent sous 4,5 (texte terracotta, sauge ou sable sur crème)", () => {
        expect(ratio("terracotta", "cream")).toBeLessThan(4.5);
        expect(ratio("sage", "cream")).toBeLessThan(4.5);
        expect(ratio("sand", "cream")).toBeLessThan(4.5);
    });
});
