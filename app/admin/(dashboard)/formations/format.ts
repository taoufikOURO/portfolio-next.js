// Affichage des dates et de la moyenne d'une formation. Les dates sont au 1er
// du mois à minuit UTC : elles sont lues en UTC (en heure de Paris, le mois
// serait le même, mais rien ne doit dépendre du fuseau du serveur).

import { formatGrade } from "@/lib/validation/education";

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** 1er septembre 2021 → « septembre 2021 ». */
export function formatMonth(date: Date): string {
  return MONTH_FORMAT.format(date);
}

/** « septembre 2021 – juin 2023 », ou « depuis septembre 2021 » sans date de fin. */
export function formatPeriod(startDate: Date, endDate: Date | null): string {
  if (!endDate) return `depuis ${formatMonth(startDate)}`;
  if (endDate.getTime() === startDate.getTime()) return formatMonth(startDate);
  return `${formatMonth(startDate)} – ${formatMonth(endDate)}`;
}

/** « 14.5 » → « 14,5 / 20 ». */
export function formatGradeOutOf20(grade: string): string {
  return `${formatGrade(grade)} / 20`;
}
