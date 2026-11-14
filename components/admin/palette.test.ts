import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Vérifie, à partir des valeurs réelles de `app/admin/admin.css`, les ratios de
 * contraste de la charte visuelle de l'admin (étape 18, E60 ; tableau de
 * `CLAUDE.md`, « Charte visuelle de l'admin »).
 * Texte : au moins 4,5 (AA). Éléments non textuels (anneau de focus, bordure
 * d'erreur, bordure des champs) : au moins 3.
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

const TEXT = 4.5;
const NON_TEXT = 3;
const SURFACES = ["panel", "card", "frame", "canvas"];

describe("palette de l'admin : charte visuelle de l'étape 18 (E60)", () => {
    it("déclare exactement les couleurs de la charte, sans couleur Tailwind par défaut", () => {
        const declared = [...css.matchAll(/--color-([a-z0-9-]+):\s*#[0-9a-f]{6}/gi)].map((m) => m[1]);
        expect(declared.sort()).toEqual(
            [
                "canvas",
                "card",
                "chart-1",
                "chart-2",
                "coral",
                "coral-hover",
                "danger",
                "done-bg",
                "done-ink",
                "field-line",
                "frame",
                "hatch",
                "ink",
                "ink-hover",
                "lime",
                "lime-soft",
                "line",
                "muted",
                "panel",
                "progress-bg",
                "progress-ink",
                "waiting-bg",
                "waiting-ink",
            ].sort(),
        );
        expect(css).toMatch(/--color-\*:\s*initial;/);
    });

    it("texte principal noir sur toutes les surfaces : au moins 15 (capture : 19,14 sur le panneau)", () => {
        for (const surface of SURFACES) expect(ratio("ink", surface)).toBeGreaterThanOrEqual(15);
        expect(ratio("ink", "panel")).toBeCloseTo(19.14, 1);
    });

    it("texte secondaire sur toutes les surfaces : au moins 4,5 (#6b6f76 de la capture foncé en #5f636a : 5,03 sur le fond)", () => {
        for (const surface of SURFACES) expect(ratio("muted", surface)).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("muted", "canvas")).toBeCloseTo(5.03, 1);
    });

    it("boutons : principal blanc sur noir (et au survol), destructif noir sur corail (et au survol)", () => {
        expect(ratio("panel", "ink")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("panel", "ink-hover")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("ink", "coral")).toBeCloseTo(6.7, 1);
        expect(ratio("ink", "coral-hover")).toBeGreaterThanOrEqual(TEXT);
        // Désactivé : texte secondaire sur gris (exempté par WCAG, conforme quand même).
        expect(ratio("muted", "line")).toBeGreaterThanOrEqual(TEXT);
    });

    it("pilules de statut : chaque texte sur son fond, au moins 4,5", () => {
        expect(ratio("done-ink", "done-bg")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("progress-ink", "progress-bg")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("waiting-ink", "waiting-bg")).toBeGreaterThanOrEqual(TEXT);
    });

    it("alertes, badges et bannière : texte noir sur chaque fond teinté, au moins 4,5", () => {
        for (const surface of ["done-bg", "waiting-bg", "lime-soft", "progress-bg", "lime", "coral"]) {
            expect(ratio("ink", surface)).toBeGreaterThanOrEqual(TEXT);
        }
    });

    it("erreurs : texte rouge foncé sur le panneau et les cartes ; le corail de la capture échoue en texte", () => {
        expect(ratio("danger", "panel")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("danger", "card")).toBeGreaterThanOrEqual(TEXT);
        expect(ratio("coral", "panel")).toBeLessThan(TEXT);
    });

    it("éléments non textuels : anneau de focus noir et bordure d'erreur, au moins 3", () => {
        for (const surface of SURFACES) expect(ratio("ink", surface)).toBeGreaterThanOrEqual(NON_TEXT);
        expect(ratio("danger", "panel")).toBeGreaterThanOrEqual(NON_TEXT);
        expect(css).toMatch(/outline:\s*2px solid var\(--color-ink\)/);
    });

    it("bordure des champs et des listes #8a8d93 (E61) : au moins 3 sur le blanc du champ et sur la carte", () => {
        expect(css).toMatch(/--color-field-line:\s*#8a8d93/i);
        expect(ratio("field-line", "panel")).toBeCloseTo(3.33, 1);
        expect(ratio("field-line", "card")).toBeCloseTo(3.08, 1);
        for (const surface of ["panel", "card"]) expect(ratio("field-line", surface)).toBeGreaterThanOrEqual(NON_TEXT);
        // Les autres bordures (cartes, séparateurs, tableaux) restent #e2e2e5.
        expect(css).toMatch(/--color-line:\s*#e2e2e5/i);
    });

    it("dialogues et panneau mobile : voile gris foncé à 40 % (noir de la palette), aucun autre fond", () => {
        const dir = new URL("./", import.meta.url);
        const backdrops = readdirSync(dir)
            .filter((file) => file.endsWith(".tsx"))
            .flatMap((file) => [...readFileSync(new URL(file, dir), "utf8").matchAll(/backdrop:bg-([\w/-]+)/g)])
            .map((m) => m[1]);
        expect(backdrops.length).toBeGreaterThanOrEqual(2);
        expect(new Set(backdrops)).toEqual(new Set(["ink/40"]));
    });
});
