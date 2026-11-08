import "server-only";

import { notFound } from "next/navigation";

import { getTechnology, type Technology } from "@/lib/technologies";
import { technologyIdField } from "@/lib/validation/technology";

/** Technologie de l'URL, ou 404 (identifiant mal formé refusé avant toute requête). */
export async function loadTechnologyOrNotFound(params: Promise<{ id: string }>): Promise<Technology> {
  const parsed = technologyIdField.safeParse((await params).id);
  if (!parsed.success) notFound();
  const technology = await getTechnology(parsed.data);
  if (!technology) notFound();
  return technology;
}
