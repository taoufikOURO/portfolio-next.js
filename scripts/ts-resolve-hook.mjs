// Hook de résolution pour les scripts TypeScript lancés directement par Node 24
// (seed : `pnpm db:seed`), sans transpileur ni dépendance supplémentaire (E33).
//
// Node exécute le TypeScript (suppression des types), mais en ESM il exige
// l'extension des imports relatifs. Or le client Prisma généré
// (`generated/prisma/`) et le code de `lib/` importent sans extension, comme
// le veut `moduleResolution: "bundler"`. Ce hook réessaie un import relatif
// sans extension avec `.ts`, puis `/index.ts`, comme le fait TypeScript.
//
// Usage : node --import ./scripts/ts-resolve-hook.mjs <script.ts>

import { registerHooks } from "node:module";

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;
// `../models` désigne à la fois `models.ts` et le dossier `models/` : Node
// répond alors ERR_UNSUPPORTED_DIR_IMPORT, et le fichier doit l'emporter.
const RECOVERABLE = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!RELATIVE.test(specifier) || HAS_EXTENSION.test(specifier) || !RECOVERABLE.has(error?.code)) {
        throw error;
      }
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // Candidat suivant.
        }
      }
      throw error;
    }
  },
});
