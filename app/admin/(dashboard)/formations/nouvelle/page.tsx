import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";
import { listSkillOptions } from "@/lib/skills";

import { EducationForm } from "../education-form";
import { EDUCATIONS_PATH } from "../routes";

export const metadata: Metadata = {
  title: "Nouvelle formation",
};

export default async function NewEducationPage() {
  await requireSession();
  const skillOptions = await listSkillOptions();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={EDUCATIONS_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux formations
        </Link>
        <h1 className="admin-page-title mt-4">Nouvelle formation</h1>
        <p className="mt-3 text-muted">Elle sera ajoutée en dernière position ; l’ordre se modifie depuis la liste.</p>
      </div>
      <EducationForm skillOptions={skillOptions} />
    </div>
  );
}
