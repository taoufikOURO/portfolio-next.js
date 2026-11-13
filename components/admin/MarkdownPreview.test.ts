import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownPreview } from "./MarkdownPreview";

function render(content: string): string {
  return renderToStaticMarkup(createElement(MarkdownPreview, { content }));
}

/** Aucun moyen d'exécuter du code ni de charger une ressource externe dans le HTML produit. */
function expectInert(html: string) {
  expect(html).not.toMatch(/<script/i);
  expect(html).not.toMatch(/<iframe|<object|<embed|<style|<svg|<math|<form|<input|<img/i);
  expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  // Adresse dangereuse dans un attribut (le même texte, affiché comme texte, est inerte).
  expect(html).not.toMatch(/\s(?:href|src|action|formaction|xlink:href|data)\s*=\s*"[^"]*(?:javascript|vbscript|data):/i);
  expect(html).not.toMatch(/\shref\s*=\s*"\s*(?!https?:|mailto:|#|\/)/i);
  expect(html).not.toMatch(/\sstyle\s*=/i);
  expect(html).not.toMatch(/\ssrcdoc\s*=/i);
}

describe("MarkdownPreview : rendu du Markdown", () => {
  it("rend gras, italique, titres, listes, liens et tableaux (GFM)", () => {
    const html = render(
      "## Section\n\n**gras** et _italique_\n\n- un\n- deux\n\n[site](https://example.com)\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n~~barré~~",
    );
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain("<em>italique</em>");
    expect(html).toContain("<li>un</li>");
    expect(html).toContain('<a href="https://example.com">site</a>');
    expect(html).toContain("<table>");
    expect(html).toContain("<del>barré</del>");
  });

  it("colore le code par des classes (rehype-highlight), sans autre attribut", () => {
    const html = render("```js\nconst a = 1;\n```");
    expect(html).toContain('class="hljs language-js"');
    expect(html).toContain('<span class="hljs-keyword">const</span>');
  });

  it("ignore un langage inconnu sans planter", () => {
    expect(render("```inconnu\nx\n```")).toContain("x");
  });

  it("ne garde pas les images (hors périmètre de la phase 1)", () => {
    const html = render("![logo](https://example.com/logo.png)");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("example.com/logo.png");
  });
});

describe("MarkdownPreview : aucun HTML ni script ne s'exécute", () => {
  const payloads: [string, string][] = [
    ["balise script", "<script>alert('x')</script>"],
    ["script sur plusieurs lignes", "<script>\nalert(1)\n</script>\n\nTexte"],
    ["image avec onerror", '<img src="x" onerror="alert(1)">'],
    ["attribut on* dans du HTML en ligne", 'Texte <b onclick="alert(1)">gras</b> fin'],
    ["iframe", '<iframe src="https://example.com"></iframe>'],
    ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["svg avec onload", '<svg onload="alert(1)"><circle r="1"/></svg>'],
    ["style", "<style>body{display:none}</style>"],
    ["lien HTML javascript:", '<a href="javascript:alert(1)">clic</a>'],
    ["lien Markdown javascript:", "[clic](javascript:alert(1))"],
    ["lien Markdown javascript: encodé", "[clic](jav&#x61;script:alert(1))"],
    ["lien Markdown javascript: en majuscules", "[clic](JAVASCRIPT:alert(1))"],
    ["lien de référence javascript:", "[clic][r]\n\n[r]: javascript:alert(1)"],
    ["lien automatique javascript:", "<javascript:alert(1)>"],
    ["lien vbscript:", "[clic](vbscript:msgbox(1))"],
    ["lien data:", "[clic](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)"],
    ["image javascript:", "![x](javascript:alert(1))"],
    ["formulaire", '<form action="https://example.com"><input name="a"></form>'],
    ["object et embed", '<object data="x.swf"></object><embed src="x.swf">'],
    ["commentaire HTML conditionnel", "<!--[if IE]><script>alert(1)</script><![endif]-->"],
    ["entités", "&lt;script&gt;alert(1)&lt;/script&gt;"],
  ];

  it.each(payloads)("%s", (_label, payload) => {
    expectInert(render(payload));
  });

  it("affiche le code HTML écrit dans un bloc de code comme du texte", () => {
    const html = render("```html\n<script>alert(1)</script>\n```");
    expectInert(html);
    expect(html).toContain("&lt;");
    expect(html).toContain("script");
  });

  it("garde le texte autour du HTML ignoré", () => {
    const html = render('Avant <span onclick="x()">milieu</span> après');
    expectInert(html);
    expect(html).toContain("Avant");
    expect(html).toContain("après");
  });
});
