import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Alias `@/` de tsconfig.json (regex : ne doit pas capturer `@prisma/…`).
      { find: /^@\//, replacement: root },
      // `server-only` lève une erreur hors des composants serveur de Next.js :
      // dans les tests, on le remplace par un module vide.
      { find: /^server-only$/, replacement: `${root}test/server-only.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "generated/**"],
    // Les tests ne doivent jamais dépendre du .env local.
    unstubEnvs: true,
  },
});
