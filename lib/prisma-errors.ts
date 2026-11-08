// Codes des erreurs connues de Prisma (https://www.prisma.io/docs/orm/reference/error-reference).
// Module pur : seul le code est lu, jamais le message (il peut reprendre des valeurs saisies).

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const { code } = error as { code: unknown };
  return typeof code === "string" ? code : undefined;
}

/** Contrainte d'unicité violée (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return prismaErrorCode(error) === "P2002";
}

/** Enregistrement à modifier, supprimer ou relier introuvable (P2025). */
export function isRecordNotFound(error: unknown): boolean {
  return prismaErrorCode(error) === "P2025";
}
