import "server-only";

import { notFound } from "next/navigation";

import { getProject, type Project } from "@/lib/projects";
import { projectIdField } from "@/lib/validation/project";

/** Projet de l'URL, ou 404 (identifiant mal formé refusé avant toute requête). */
export async function loadProjectOrNotFound(params: Promise<{ id: string }>): Promise<Project> {
  const parsed = projectIdField.safeParse((await params).id);
  if (!parsed.success) notFound();
  const project = await getProject(parsed.data);
  if (!project) notFound();
  return project;
}
