import "server-only";

import { notFound } from "next/navigation";

import { getSkill, type SkillWithUsage } from "@/lib/skills";
import { skillIdField } from "@/lib/validation/skill";

/** Compétence de l'URL, ou 404 (identifiant mal formé refusé avant toute requête). */
export async function loadSkillOrNotFound(params: Promise<{ id: string }>): Promise<SkillWithUsage> {
  const parsed = skillIdField.safeParse((await params).id);
  if (!parsed.success) notFound();
  const skill = await getSkill(parsed.data);
  if (!skill) notFound();
  return skill;
}
