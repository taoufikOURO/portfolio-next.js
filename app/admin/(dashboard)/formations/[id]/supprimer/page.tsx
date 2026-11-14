import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { DeleteEducationForm } from "../../delete-education";
import { loadEducationOrNotFound } from "../../load-education";
import { EDUCATIONS_PATH } from "../../routes";

export const metadata: Metadata = {
  title: "Supprimer une formation",
};

/** Confirmation de suppression sans JavaScript (avec JavaScript, un dialogue la remplace). */
export default async function DeleteEducationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const education = await loadEducationOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={EDUCATIONS_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir aux formations
        </Link>
        <h1 className="admin-page-title mt-4">Supprimer la formation « {education.title} » ?</h1>
      </div>
      <DeleteEducationForm
        education={{ id: education.id, title: education.title, skillCount: education.skills.length }}
      />
    </div>
  );
}
