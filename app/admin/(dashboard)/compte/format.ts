/**
 * Date et heure affichées dans l'administration. Rendu côté serveur : le
 * fuseau du navigateur n'est pas connu, on affiche l'heure de Paris (E47).
 */
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatDateTime(date: Date): string {
  return `${DATE_TIME_FORMAT.format(date)} (heure de Paris)`;
}
