import { describe, expect, it } from "vitest";
import { FILE_KIND_RULES, validateFile } from "./file-rules";

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

describe("validateFile : tailles par type", () => {
    const svg = { name: "icone.svg", type: "image/svg+xml", size: 1024 * 1024 + 1 };

    it("applique la limite propre au type, plus stricte que la limite générale", () => {
        expect(validateFile(svg, FILE_KIND_RULES.icon)).toMatch(/1 Mo/);
        expect(validateFile({ ...svg, size: 1024 * 1024 }, FILE_KIND_RULES.icon)).toBeNull();
    });

    it("reconnaît un SVG par son extension quand le navigateur n'annonce aucun type", () => {
        expect(validateFile({ ...svg, type: "" }, FILE_KIND_RULES.icon)).toMatch(/1 Mo/);
    });

    it("garde la limite générale pour les autres types", () => {
        const png = { name: "icone.png", type: "image/png", size: 2 * 1024 * 1024 };
        expect(validateFile(png, FILE_KIND_RULES.icon)).toBeNull();
    });
});
