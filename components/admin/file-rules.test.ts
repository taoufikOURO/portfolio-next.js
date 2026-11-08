import { describe, expect, it } from "vitest";
import { FILE_KIND_RULES, MAX_FILE_MB, validateFile } from "./file-rules";

const png = { name: "logo.png", type: "image/png", size: 1024 };

describe("validateFile", () => {
    it("accepte un fichier conforme", () => {
        expect(
            validateFile(png, { accept: "image/png,image/jpeg", maxSizeMB: 5 }),
        ).toBeNull();
    });

    it("refuse un type absent de la liste", () => {
        expect(
            validateFile(png, { accept: "image/jpeg,image/webp" }),
        ).toMatch(/type de fichier/);
    });

    it("accepte un joker de type MIME", () => {
        expect(validateFile(png, { accept: "image/*" })).toBeNull();
        expect(
            validateFile({ ...png, type: "application/pdf" }, { accept: "image/*" }),
        ).not.toBeNull();
    });

    it("accepte une extension", () => {
        expect(validateFile(png, { accept: ".png" })).toBeNull();
        expect(validateFile(png, { accept: ".pdf" })).not.toBeNull();
    });

    it("compare le type sans tenir compte de la casse", () => {
        expect(
            validateFile({ ...png, type: "IMAGE/PNG" }, { accept: "image/png" }),
        ).toBeNull();
    });

    it("refuse un fichier trop lourd", () => {
        const heavy = { ...png, size: 5 * 1024 * 1024 + 1 };
        expect(validateFile(heavy, { maxSizeMB: 5 })).toMatch(/5 Mo/);
    });

    it("accepte un fichier exactement à la limite", () => {
        expect(
            validateFile({ ...png, size: 5 * 1024 * 1024 }, { maxSizeMB: 5 }),
        ).toBeNull();
    });

    it("n'impose rien sans règle", () => {
        expect(validateFile(png, {})).toBeNull();
    });
});

describe("limite de 1 Mo pour tous les envois (E52)", () => {
    const MB = 1024 * 1024;
    const files = {
        png: { name: "a.png", type: "image/png" },
        jpg: { name: "a.jpg", type: "image/jpeg" },
        webp: { name: "a.webp", type: "image/webp" },
        svg: { name: "a.svg", type: "image/svg+xml" },
        pdf: { name: "a.pdf", type: "application/pdf" },
    };

    it("vaut 1 Mo pour chaque usage", () => {
        expect(MAX_FILE_MB).toBe(1);
        for (const kind of ["image", "icon", "resume"] as const) {
            expect(FILE_KIND_RULES[kind].maxSizeMB, kind).toBe(1);
            expect(FILE_KIND_RULES[kind].hint, kind).toMatch(/1 Mo/);
        }
    });

    it.each([
        ["png", "image"],
        ["jpg", "image"],
        ["webp", "image"],
        ["png", "icon"],
        ["webp", "icon"],
        ["svg", "icon"],
        ["pdf", "resume"],
    ] as const)("%s (%s) : accepté à 1 Mo, refusé au-delà avec un message qui indique la limite", (format, kind) => {
        const rules = FILE_KIND_RULES[kind];
        expect(validateFile({ ...files[format], size: MB }, rules)).toBeNull();
        expect(validateFile({ ...files[format], size: MB + 1 }, rules)).toBe("Le fichier dépasse la taille maximale de 1 Mo.");
    });

    it("reconnaît un SVG par son extension quand le navigateur n'annonce aucun type", () => {
        expect(validateFile({ ...files.svg, type: "", size: MB + 1 }, FILE_KIND_RULES.icon)).toMatch(/1 Mo/);
    });
});

describe("validateFile : tailles par type (mécanisme générique)", () => {
    it("applique la limite propre à un type quand elle est donnée", () => {
        const rules = { accept: ".png,.svg", maxSizeMB: 5, maxSizeMBByType: { ".svg": 1 } };
        expect(validateFile({ name: "a.svg", type: "", size: 2 * 1024 * 1024 }, rules)).toMatch(/1 Mo/);
        expect(validateFile({ name: "a.png", type: "image/png", size: 2 * 1024 * 1024 }, rules)).toBeNull();
    });
});
