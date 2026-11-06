import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
    it("assemble les classes dans l'ordre", () => {
        expect(cn("a", "b", "c")).toBe("a b c");
    });

    it("ignore les valeurs vides", () => {
        expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
    });

    it("accepte les conditions", () => {
        const active = true;
        const disabled = false;
        expect(cn("base", active && "is-active", disabled && "is-disabled")).toBe(
            "base is-active",
        );
    });

    it("aplatit les tableaux imbriqués", () => {
        expect(cn("a", ["b", [false, "c"]], "d")).toBe("a b c d");
    });

    it("renvoie une chaîne vide sans classe", () => {
        expect(cn()).toBe("");
        expect(cn(false, null, [])).toBe("");
    });
});
