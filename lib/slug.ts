// Slugs (adresse d'une page publique, ex. `/projets/mon-projet`).
//
// Module pur : utilisé par le navigateur (proposition du slug pendant la
// saisie du titre) et par le serveur (slug généré si le champ est vide).

/** Longueur maximale d'un slug. */
export const SLUG_MAX_LENGTH = 80;

/** Minuscules non accentuées, chiffres, et tirets simples entre deux mots. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slug tiré d'un texte : accents retirés (« Café » → « cafe »), ligatures
 * décomposées, minuscules, tout ce qui n'est ni lettre latine ni chiffre
 * remplacé par un tiret, tirets multiples réduits, tirets retirés aux
 * extrémités. Coupé à `SLUG_MAX_LENGTH` caractères, si possible entre deux
 * mots. Chaîne vide si le texte ne contient aucune lettre latine ni chiffre.
 */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/[øØ]/g, "o")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= SLUG_MAX_LENGTH) return slug;

  const cut = slug.slice(0, SLUG_MAX_LENGTH);
  const lastDash = cut.lastIndexOf("-");
  // Coupure au dernier mot complet, sauf si elle laisserait un slug trop court.
  const trimmed = lastDash >= SLUG_MAX_LENGTH / 2 ? cut.slice(0, lastDash) : cut;
  return trimmed.replace(/-+$/, "");
}

export function isValidSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}
