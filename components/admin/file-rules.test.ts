import { describe, expect, it } from "vitest";
import { validateFile } from "./file-rules";

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
