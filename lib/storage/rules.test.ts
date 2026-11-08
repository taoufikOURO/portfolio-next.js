import { describe, expect, it } from "vitest";

import { FILE_KIND_RULES, validateFile } from "../../components/admin/file-rules";
import {
  assertWritableBucket,
  bucketContentTypes,
  bucketMaxBytes,
  buildPublicUrl,
  checkSvg,
  FILE_MESSAGES,
  BUCKET_FILE_SIZE_LIMIT_BYTES,
  FORMAT_RULES,
  MAX_FILE_BYTES,
  formatsOf,
  generateObjectPath,
  inspectFile,
  isObjectPath,
  KIND_FORMATS,
  maxBytesOf,
  StorageGuardError,
  type FileKind,
} from "./rules";

const MB = 1024 * 1024;

// Fichiers minimaux mais réels (signatures reconnues par `file-type`).
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
const WEBP = Uint8Array.from(Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64"));
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
const svgBytes = (text: string) => new TextEncoder().encode(text);

/** Copie de `bytes` complétée par des zéros jusqu'à `size` octets (le format reste reconnu). */
function padded(bytes: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size);
  out.set(bytes);
  return out;
}

describe("règles de format", () => {
  it("fixe 1 Mo pour PNG, JPG, WebP, SVG et PDF (E52)", () => {
    expect(MAX_FILE_BYTES).toBe(1 * MB);
    for (const format of ["png", "jpg", "webp", "svg", "pdf"] as const) {
      expect(FORMAT_RULES[format].maxBytes, format).toBe(1 * MB);
    }
  });

  it("garde la limite de 1 Mo sous celle des Server Actions de Next.js (1 Mo de corps)", () => {
    expect(MAX_FILE_BYTES).toBeLessThanOrEqual(1024 * 1024);
  });

  it("n'accepte le SVG que pour les icônes et le PDF que pour le CV", () => {
    expect(formatsOf("image")).toEqual(["png", "jpg", "webp"]);
    expect(formatsOf("icon")).toEqual(["png", "webp", "svg"]);
    expect(formatsOf("resume")).toEqual(["pdf"]);
  });

  it("règle les buckets selon leurs usages", () => {
    expect(bucketContentTypes("articles")).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(bucketContentTypes("profile")).toEqual(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
    expect(bucketContentTypes("stack")).toEqual(["image/png", "image/webp", "image/svg+xml"]);
    // Les buckets restent à 5 Mo : seule la limite de l'application (1 Mo) compte (E52).
    expect(bucketMaxBytes("stack")).toBe(5 * MB);
    expect(BUCKET_FILE_SIZE_LIMIT_BYTES).toBeGreaterThan(MAX_FILE_BYTES);
  });
});

describe("inspectFile : type réel", () => {
  it.each([
    ["PNG", PNG, "image", "png", "image/png"],
    ["JPG", JPG, "image", "jpg", "image/jpeg"],
    ["WebP", WEBP, "image", "webp", "image/webp"],
    ["PDF", PDF, "resume", "pdf", "application/pdf"],
    ["SVG", svgBytes(SVG), "icon", "svg", "image/svg+xml"],
  ] as const)("reconnaît un %s valide", async (_, bytes, kind, extension, contentType) => {
    await expect(inspectFile(bytes, kind)).resolves.toEqual({
      ok: true,
      format: extension,
      extension,
      contentType,
    });
  });

  it("refuse un faux PNG (texte renommé) : seul le contenu compte", async () => {
    const fake = new TextEncoder().encode("ceci n'est pas une image, juste du texte renommé en .png");
    const result = await inspectFile(fake, "image");
    expect(result).toEqual({ ok: false, error: FILE_MESSAGES.wrongType("image") });
    expect(result.ok || result.error).toMatch(/PNG, JPG ou WebP/);
  });

  it("refuse un PDF déguisé en image et une image déguisée en PDF", async () => {
    expect((await inspectFile(PDF, "image")).ok).toBe(false);
    expect((await inspectFile(PNG, "resume")).ok).toBe(false);
  });

  it("refuse un format reconnu mais non prévu (GIF)", async () => {
    const gif = new TextEncoder().encode("GIF89a\x01\x00\x01\x00\x00\x00\x00;");
    expect(await inspectFile(gif, "image")).toEqual({ ok: false, error: FILE_MESSAGES.wrongType("image") });
  });

  it("refuse un SVG hors des icônes", async () => {
    expect((await inspectFile(svgBytes(SVG), "image")).ok).toBe(false);
  });

  it("refuse un fichier vide", async () => {
    expect(await inspectFile(new Uint8Array(0), "image")).toEqual({ ok: false, error: FILE_MESSAGES.empty });
  });

  it("refuse un SVG qui n'est pas de l'UTF-8 valide", async () => {
    const bytes = Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0xff, 0xfe, 0x3e]);
    expect((await inspectFile(bytes, "icon")).ok).toBe(false);
  });
});

describe("inspectFile : taille", () => {
  it("accepte un PNG de 1 Mo exactement et refuse 1 Mo + 1 octet", async () => {
    expect((await inspectFile(padded(PNG, 1 * MB), "image")).ok).toBe(true);
    expect(await inspectFile(padded(PNG, 1 * MB + 1), "image")).toEqual({
      ok: false,
      error: FILE_MESSAGES.tooLargeForKind("image"),
    });
  });

  it("accepte un PDF de 1 Mo exactement et refuse 1 Mo + 1 octet", async () => {
    expect((await inspectFile(padded(PDF, 1 * MB), "resume")).ok).toBe(true);
    expect(await inspectFile(padded(PDF, 1 * MB + 1), "resume")).toEqual({
      ok: false,
      error: FILE_MESSAGES.tooLargeForKind("resume"),
    });
  });

  it.each([
    ["JPG", JPG, "image"],
    ["WebP", WEBP, "image"],
    ["WebP (icône)", WEBP, "icon"],
    ["PNG (icône)", PNG, "icon"],
  ] as const)("refuse un %s de plus de 1 Mo", async (_label, bytes, kind) => {
    expect((await inspectFile(padded(bytes, 1 * MB), kind)).ok).toBe(true);
    expect((await inspectFile(padded(bytes, 1 * MB + 1), kind)).ok).toBe(false);
  });

  it("limite aussi le SVG à 1 Mo", async () => {
    const big = svgBytes(SVG.replace("</svg>", `<!--${"x".repeat(MB)}--></svg>`));
    expect(await inspectFile(big, "icon")).toEqual({ ok: false, error: FILE_MESSAGES.tooLargeForKind("icon") });
  });

  it("annonce la limite en Mo dans le message", () => {
    expect(FILE_MESSAGES.tooLarge("svg")).toMatch(/1 Mo/);
    expect(FILE_MESSAGES.tooLarge("png")).toMatch(/1 Mo/);
    expect(FILE_MESSAGES.tooLargeForKind("image")).toMatch(/1 Mo/);
    expect(maxBytesOf("icon")).toBe(1 * MB);
    expect(maxBytesOf("resume")).toBe(1 * MB);
  });
});

describe("checkSvg", () => {
  it.each([
    ["simple", SVG],
    ["avec déclaration XML et commentaire", `<?xml version="1.0" encoding="UTF-8"?>\n<!-- logo -->\n${SVG}`],
    ["avec BOM", `﻿${SVG}`],
    [
      "avec dégradé et référence interne",
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="g"><stop offset="0"/></linearGradient><path id="p" d="M0 0h1"/></defs><rect fill="url(#g)" style="fill: url( \'#g\' )"/><use xlink:href="#p"/><use href="#p"/></svg>',
    ],
    ["avec style interne", '<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:url(#g)}</style><g class="a"/></svg>'],
    ["avec CDATA de style", '<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[.a{fill:#000}]]></style></svg>'],
    ["avec attribut opacity (commence par « o »)", '<svg xmlns="http://www.w3.org/2000/svg" opacity="0.5"><path d="M0 0" offset="1"/></svg>'],
    ["avec un texte qui contient « onclick »", '<svg xmlns="http://www.w3.org/2000/svg"><text>onclick="x"</text></svg>'],
  ])("accepte un SVG sain (%s)", (_, text) => {
    expect(checkSvg(text)).toBeNull();
  });

  it.each([
    ["<script>", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["<SCRIPT> en majuscules", '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>alert(1)</SCRIPT></svg>'],
    ["<svg:script> préfixé", '<svg:svg xmlns:svg="http://www.w3.org/2000/svg"><svg:script>alert(1)</svg:script></svg:svg>'],
    ["lien javascript:", '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>'],
    ["lien javascript: masqué par des entités", '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#x09;script&#58;alert(1)"/></svg>'],
    ["javascript: dans une animation", '<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="x" to="javascript:alert(1)"/></a></svg>'],
  ])("refuse un script (%s)", (_, text) => {
    expect(checkSvg(text)).toBe(FILE_MESSAGES.svgScript);
  });

  it.each([
    ["onload sur la racine", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', "onload"],
    ["onclick en majuscules", '<svg xmlns="http://www.w3.org/2000/svg"><rect ONCLICK="alert(1)"/></svg>', "ONCLICK"],
    ["sans guillemets", '<svg xmlns="http://www.w3.org/2000/svg"><rect onmouseover=alert(1) /></svg>', "onmouseover"],
    ["préfixé", '<svg xmlns="http://www.w3.org/2000/svg"><rect x:onclick="a"/></svg>', "x:onclick"],
  ])("refuse un attribut on* (%s) en le nommant", (_, text, attribute) => {
    expect(checkSvg(text)).toBe(FILE_MESSAGES.svgEventHandler(attribute));
  });

  it("refuse <foreignObject>, quelle que soit la casse", () => {
    for (const name of ["foreignObject", "foreignobject", "svg:foreignObject"]) {
      expect(checkSvg(`<svg xmlns="http://www.w3.org/2000/svg"><${name}><div/></${name}></svg>`)).toBe(
        FILE_MESSAGES.svgForeignObject,
      );
    }
  });

  it.each([
    ["image distante", '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://exemple.invalid/a.png"/></svg>'],
    ["xlink:href distant", '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="autre.svg#a"/></svg>'],
    ["image en data:", '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>'],
    ["url() distante dans un attribut", '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://exemple.invalid/g.svg#g)"/></svg>'],
    ["url() distante dans style", '<svg xmlns="http://www.w3.org/2000/svg"><rect style="filter:url(\'f.svg#f\')"/></svg>'],
    ["@import dans <style>", '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "https://exemple.invalid/a.css";</style></svg>'],
    ["url() dans un CDATA de style", '<svg xmlns="http://www.w3.org/2000/svg"><style><![CDATA[@font-face{src:url(https://exemple.invalid/f.woff)}]]></style></svg>'],
    ["feuille de style XML", `<?xml-stylesheet href="https://exemple.invalid/a.css"?>${SVG}`],
    ["animation de href", '<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="href" to="https://exemple.invalid"/></a></svg>'],
    ["iframe", '<svg xmlns="http://www.w3.org/2000/svg"><iframe/></svg>'],
  ])("refuse une référence externe (%s)", (_, text) => {
    expect(checkSvg(text)).toBe(FILE_MESSAGES.svgExternalReference);
  });

  it("refuse les DOCTYPE et entités (entités externes)", () => {
    const xxe = '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&x;</text></svg>';
    expect(checkSvg(xxe)).toBe(FILE_MESSAGES.svgDoctype);
  });

  it.each([
    ["sans racine <svg>", "<html><body/></html>"],
    ["texte seul", "pas du tout du SVG"],
    ["balise non fermée", '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="a'],
    ["commentaire non fermé", '<svg><!-- jamais fermé'],
    ["caractère nul", "<svg>\u0000</svg>"],
  ])("refuse un SVG mal formé (%s)", (_, text) => {
    expect(checkSvg(text)).toBe(FILE_MESSAGES.svgInvalid);
  });

  it("refuse un SVG avec script avant toute écriture, avec un message explicite", async () => {
    const result = await inspectFile(svgBytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "icon");
    expect(result).toEqual({ ok: false, error: FILE_MESSAGES.svgScript });
    expect(FILE_MESSAGES.svgScript).toMatch(/script/);
  });
});

describe("chemins", () => {
  it("génère <uuid>.<extension>, sans le nom d'origine", () => {
    const path = generateObjectPath("png");
    expect(path).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/);
    expect(isObjectPath(path)).toBe(true);
    expect(generateObjectPath("png")).not.toBe(path);
  });

  it("refuse une extension non prévue", () => {
    expect(() => generateObjectPath("html")).toThrow();
  });

  it.each(["../a.png", "dossier/0b6f3a4e-2c1d-4b7a-9e8f-1a2b3c4d5e6f.png", "photo.png", "0b6f3a4e-2c1d-4b7a-9e8f-1a2b3c4d5e6f.html", ""])(
    "ne reconnaît pas « %s » comme chemin de l'application",
    (path) => {
      expect(isObjectPath(path)).toBe(false);
    },
  );

  it("calcule l'URL publique à partir du chemin", () => {
    expect(buildPublicUrl("https://projet.supabase.co/", "dev-stack", "0b6f3a4e-2c1d-4b7a-9e8f-1a2b3c4d5e6f.svg")).toBe(
      "https://projet.supabase.co/storage/v1/object/public/dev-stack/0b6f3a4e-2c1d-4b7a-9e8f-1a2b3c4d5e6f.svg",
    );
  });
});

describe("assertWritableBucket", () => {
  it("refuse en développement tout bucket sans préfixe dev-", () => {
    for (const bucket of ["articles", "projets", "profil", "stack", "dev", "dev-", "Dev-stack", "xdev-stack"]) {
      expect(() => assertWritableBucket("development", bucket)).toThrow(StorageGuardError);
    }
  });

  it("autorise les buckets dev-* en développement", () => {
    expect(() => assertWritableBucket("development", "dev-stack")).not.toThrow();
  });

  it("autorise les buckets de production en production", () => {
    expect(() => assertWritableBucket("production", "stack")).not.toThrow();
  });
});

describe("contrôle du navigateur (components/admin/file-rules.ts)", () => {
  const MIME: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };

  it.each(Object.keys(KIND_FORMATS) as FileKind[])("reprend les formats et tailles du serveur (%s)", (kind) => {
    const rules = FILE_KIND_RULES[kind];
    for (const format of Object.keys(FORMAT_RULES) as (keyof typeof FORMAT_RULES)[]) {
      const file = { name: `a.${format}`, type: MIME[format] };
      const max = FORMAT_RULES[format].maxBytes;
      if (KIND_FORMATS[kind].includes(format)) {
        expect(validateFile({ ...file, size: max }, rules), `${kind}/${format} à la limite`).toBeNull();
        expect(validateFile({ ...file, size: max + 1 }, rules), `${kind}/${format} trop lourd`).not.toBeNull();
      } else {
        expect(validateFile({ ...file, size: 1 }, rules), `${kind}/${format} refusé`).not.toBeNull();
      }
    }
  });
});
