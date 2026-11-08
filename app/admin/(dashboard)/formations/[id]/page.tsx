import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";
import { listSkillOptions } from "@/lib/skills";

import { DeleteEducationButton } from "../delete-education";
import { EducationForm } from "../education-form";
import { educationFormValues, loadEducationOrNotFound } from "../load-education";
import { EDUCATIONS_PATH } from "../routes";

export const metadata: Metadata = {
  title: "Modifier une formation",
};

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const [education, skillOptions] = await Promise.all([loadEducationOrNotFound(params), listSkillOptions()]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={EDUCATIONS_PATH} className="inline-flex items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux formations
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Modifier « {education.title} »</h1>
      </div>

      <EducationForm
        educationId={education.id}
        initialValues={educationFormValues(education)}
        skillOptions={skillOptions}
      />

      <section aria-labelledby="formation-suppression" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="formation-suppression" className="text-xl font-bold">
          Supprimer la formation
        </h2>
        <p className="mt-4">Suppression définitive, après confirmation. Les compétences sont conservées.</p>
        <DeleteEducationButton
          education={{ id: education.id, title: education.title, skillCount: education.skills.length }}
          className="mt-4"
        />
      </section>
    </div>
  );
}
