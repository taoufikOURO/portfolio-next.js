import "server-only";

/**
 * Journal des erreurs inattendues des actions d'authentification : le nom de
 * l'erreur seulement. Le message brut (Prisma, Nodemailer) peut reprendre des
 * valeurs saisies, une adresse ou un lien.
 */
export function logUnexpectedError(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "inconnue";
  console.error(`${context} : erreur inattendue (${name}).`);
}

/** Minutes restantes d'un blocage, arrondies au supérieur (1 au minimum). */
export function minutesUntil(date: Date, now = Date.now()): number {
  return Math.max(1, Math.ceil((date.getTime() - now) / 60_000));
}
