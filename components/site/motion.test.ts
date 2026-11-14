import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Règles de mouvement du site public (E62), vérifiées sur `site.css` et les composants.

const root = process.cwd();
const css = readFileSync(join(root, "app", "(site)", "site.css"), "utf8");

/** Contenu du bloc `@media (prefers-reduced-motion: no-preference) { … }`. */
function motionBlock(): { inside: string; outside: string } {
  const start = css.indexOf("@media (prefers-reduced-motion: no-preference)");
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  let end = -1;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) {
      end = index;
      break;
    }
  }
  return { inside: css.slice(start, end + 1), outside: css.slice(0, start) + css.slice(end + 1) };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("mouvement du site public", () => {
  const { inside, outside } = motionBlock();

  it("toutes les animations et transitions sont sous prefers-reduced-motion: no-preference", () => {
    expect(outside).not.toMatch(/@keyframes|animation\s*:|transition\s*:/);
  });

  it("les keyframes n'animent que transform et opacity", () => {
    const bodies = [...inside.matchAll(/@keyframes [\w-]+\s*\{([\s\S]*?\}\s*)\}/g)].map((match) => match[1]);
    expect(bodies.length).toBeGreaterThanOrEqual(5);
    for (const body of bodies) {
      const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]);
      for (const property of properties) expect(["transform", "opacity"]).toContain(property);
    }
  });

  it("durées : 600 ms au plus, sauf l'éventail (900 ms au plus) et la rotation de l'anneau", () => {
    for (const match of inside.matchAll(/animation:\s*([\w-]+)\s+(\d+)(ms|s)/g)) {
      const [, name, value, unit] = match;
      const ms = Number(value) * (unit === "s" ? 1000 : 1);
      if (name === "site-ring-spin") continue;
      expect(ms, name).toBeLessThanOrEqual(name === "site-fan-open" ? 900 : 600);
    }
    for (const match of inside.matchAll(/transition:\s*[\w-]+\s+(\d+)ms/g)) expect(Number(match[1])).toBeLessThanOrEqual(600);
  });

  it("une seule boucle infinie : l'anneau", () => {
    const infinite = [...css.matchAll(/animation:[^;]*infinite/g)];
    expect(infinite).toHaveLength(1);
    expect(infinite[0][0]).toContain("site-ring-spin");
  });

  it("entrées (animations à durée) en fill-mode backwards : l'état final est l'état normal de la page", () => {
    const timed = [...inside.matchAll(/animation:\s*(site-(?!ring)[\w-]+)\s+\d+m?s[^;]*;/g)];
    expect(timed.length).toBeGreaterThanOrEqual(8);
    for (const match of timed) expect(match[0], match[1]).toContain("backwards");
  });

  it("mouvements liés au défilement (E66) : seulement sous @supports (animation-timeline), pilotés par le défilement", () => {
    const start = inside.indexOf("@supports (animation-timeline: view())");
    expect(start).toBeGreaterThan(-1);
    const before = inside.slice(0, start);
    expect(before).not.toMatch(/animation-timeline/);
    const scrollLinked = [...inside.slice(start).matchAll(/animation:\s*(site-[\w-]+)\s+linear both;\s*animation-timeline:\s*(scroll\(root\)|view\(\))/g)];
    expect(scrollLinked.map((match) => match[1]).sort()).toEqual(["site-drift-fan", "site-drift-up", "site-outline-slide", "site-progress"]);
  });

  it("apparition au défilement : rien n'est masqué hors de l'état « pending » posé par le script", () => {
    expect(css).toMatch(/\[data-reveal="pending"\],\s*\[data-reveal="pending"\] \.site-letter \{\s*opacity: 0;/);
    expect(outside).not.toMatch(/data-reveal/);
    const script = readFileSync(join(root, "components", "site", "ScrollReveal.tsx"), "utf8");
    expect(script).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
  });

  it("aucune classe animate-* ni bibliothèque d'animation dans le site", () => {
    const files = [...sourceFiles(join(root, "components", "site")), ...sourceFiles(join(root, "app", "(site)"))];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/\banimate-|framer-motion/);
    }
  });
});
