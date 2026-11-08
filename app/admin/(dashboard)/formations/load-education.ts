import "server-only";

import { notFound } from "next/navigation";

import { getEducation, type Education } from "@/lib/educations";
import { educationIdField, formatGrade, formatMonthValue, type EducationFormValues } from "@/lib/validation/education";

/** Formation de l'URL, ou 404 (identifiant mal formé refusé avant toute requête). */
export async function loadEducationOrNotFound(params: Promise<{ id: string }>): Promise<Education> {
  const parsed = educationIdField.safeParse((await params).id);
  if (!parsed.success) notFound();
  const education = await getEducation(parsed.data);
  if (!education) notFound();
  return education;
}

/** Formation enregistrée → valeurs des champs du formulaire. */
export function educationFormValues(education: Education): EducationFormValues {
  return {
    title: education.title,
    institution: education.institution,
    location: education.location,
    startDate: formatMonthValue(education.startDate),
    endDate: education.endDate ? formatMonthValue(education.endDate) : "",
    honors: education.honors ?? "",
    grade: education.grade === null ? "" : formatGrade(education.grade),
    description: education.description,
    skillIds: education.skills.map((skill) => skill.id),
    newSkill: "",
  };
}
