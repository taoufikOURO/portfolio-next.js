import { describe, expect, it } from "vitest";

import { CONFIRM_PRODUCTION_FLAG, productionTargetRefusal } from "./target-guard";

const LOCAL = "postgresql://utilisateur:motdepasse@localhost:5432/portfolio";
const REMOTE = "postgresql://utilisateur:motdepasse@base.exemple.invalid:5432/postgres";

describe("garde-fou production des scripts (E68)", () => {
  it("laisse passer la base locale en développement", () => {
    expect(productionTargetRefusal({ appEnv: "development", databaseUrl: LOCAL, confirmProduction: false })).toBeNull();
  });

  it("refuse APP_ENV=production sans l'option, même sur une base locale", () => {
    const refusal = productionTargetRefusal({ appEnv: "production", databaseUrl: LOCAL, confirmProduction: false });
    expect(refusal).toContain(CONFIRM_PRODUCTION_FLAG);
  });

  it("refuse une base distante sans l'option, quel que soit APP_ENV", () => {
    for (const appEnv of ["development", "test", undefined]) {
      expect(productionTargetRefusal({ appEnv, databaseUrl: REMOTE, confirmProduction: false })).toContain(
        CONFIRM_PRODUCTION_FLAG,
      );
    }
    expect(productionTargetRefusal({ appEnv: "development", databaseUrl: "", confirmProduction: false })).not.toBeNull();
  });

  it("accepte la production avec l'option explicite", () => {
    expect(productionTargetRefusal({ appEnv: "production", databaseUrl: REMOTE, confirmProduction: true })).toBeNull();
  });

  it("n'affiche jamais l'URL ni le mot de passe", () => {
    const refusal = productionTargetRefusal({ appEnv: "development", databaseUrl: REMOTE, confirmProduction: false }) ?? "";
    expect(refusal).not.toContain("exemple.invalid");
    expect(refusal).not.toContain("motdepasse");
  });
});
