import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Motion design de l'admin (E61), vérifié sur les sources réelles :
 * `app/admin/admin.css` et les composants de `components/admin/`.
 * - toutes les animations sont déclarées sous `prefers-reduced-motion: no-preference` :
 *   sous « réduire les animations », aucune ne s'applique ;
 * - les déplacements et échelles au survol ou au clic portent `motion-safe:` ;
 * - seules transform, opacity et stroke-dashoffset sont animées ;
 * - durées de 600 ms au plus, sauf le tracé de l'anneau (800 ms) et le
 *   balayage des squelettes (1,6 s, seule boucle).
 */

const css = readFileSync(new URL("../../app/admin/admin.css", import.meta.url), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
);

/** Contenu du bloc qui commence à `start` (accolades équilibrées), sans les accolades. */
function block(source: string, start: number): { body: string; end: number } {
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === "{") depth++;
        if (source[index] === "}" && --depth === 0) return { body: source.slice(open + 1, index), end: index + 1 };
    }
    throw new Error("Bloc non fermé dans admin.css");
}

function mediaBlocks(query: string): { body: string; start: number; end: number }[] {
    const pattern = new RegExp(`@media\\s*\\(prefers-reduced-motion:\\s*${query}\\)`, "g");
    return [...css.matchAll(pattern)].map((match) => ({ start: match.index, ...block(css, match.index) }));
}

const motion = mediaBlocks("no-preference");
const reduce = mediaBlocks("reduce");
const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => ({
    name: match[1],
    ...block(css, match.index),
}));

/** CSS sans les blocs `no-preference` ni les @keyframes. */
function outsideMotion(): string {
    const ranges = [...motion, ...keyframes.map((k) => ({ start: css.lastIndexOf("@keyframes", k.end), end: k.end }))];
    return ranges
        .sort((a, b) => b.start - a.start)
        .reduce((source, range) => source.slice(0, range.start) + source.slice(range.end), css);
}

function ms(value: string): number {
    return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
}

const components = new URL("./", import.meta.url);
const tsx = readdirSync(components)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => ({ file, source: readFileSync(new URL(file, components), "utf8") }));

describe("motion design de l'admin (E61)", () => {
    it("aucune animation hors du bloc `prefers-reduced-motion: no-preference` : rien ne bouge sous réduction", () => {
        expect(motion.length).toBe(1);
        expect(motion[0].body).toMatch(/animation:/);
        expect(outsideMotion()).not.toMatch(/animation(-name)?\s*:/);
    });

    it("filet de sécurité sous réduction : durées et délais ramenés à zéro, une seule itération", () => {
        expect(reduce.length).toBe(1);
        const body = reduce[0].body;
        expect(body).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
        expect(body).toMatch(/animation-delay:\s*0ms\s*!important/);
        expect(body).toMatch(/animation-iteration-count:\s*1\s*!important/);
        expect(body).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    });

    it("les @keyframes n'animent que transform, opacity et stroke-dashoffset", () => {
        expect(keyframes.length).toBeGreaterThan(0);
        for (const { body } of keyframes) {
            const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
            for (const property of properties) {
                expect(["transform", "opacity", "stroke-dashoffset"]).toContain(property);
            }
        }
    });

    it("durées : 600 ms au plus, sauf l'anneau (800 ms) et le balayage des squelettes (1,6 s, seule boucle)", () => {
        const animations = [...motion[0].body.matchAll(/animation:\s*([\w-]+)\s+([\d.]+m?s)([^;]*);/g)];
        expect(animations.length).toBeGreaterThanOrEqual(10);
        for (const [, name, duration, rest] of animations) {
            if (name === "admin-draw") expect(ms(duration)).toBe(800);
            else if (name === "admin-shimmer") {
                expect(ms(duration)).toBe(1600);
                expect(rest).toMatch(/infinite/);
            } else {
                expect(ms(duration)).toBeLessThanOrEqual(600);
                expect(rest).not.toMatch(/infinite/);
            }
        }
    });

    it("composants : déplacements et échelles au survol ou au clic seulement sous `motion-safe:`, aucune classe `animate-*`", () => {
        const stateful = /(?:[\w-]+:)*(?:hover|active|group-hover|focus|focus-visible):(?:[\w-]+:)*-?(?:translate|scale)[^\s"`]*/g;
        for (const { file, source } of tsx) {
            for (const [token] of source.matchAll(stateful)) {
                expect(token.startsWith("motion-safe:"), `${file} : ${token}`).toBe(true);
            }
            expect(source, file).not.toMatch(/\banimate-(spin|pulse|ping|bounce)\b/);
        }
    });
});
