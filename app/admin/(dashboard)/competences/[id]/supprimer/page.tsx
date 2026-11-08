import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { DeleteSkillForm } from "../../delete-skill";
import { loadSkillOrNotFound } from "../../load-skill";
import { SKILLS_PATH } from "../../routes";

export const metadata: Metadata = {
  title: "Supprimer une compétence",
};

/**
 * Confirmation de suppression sans JavaScript (avec JavaScript, la liste
 * ouvre un dialogue à la place). Liste les formations concernées.
 */
export default async function DeleteSkillPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const skill = await loadSkillOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={SKILLS_PATH} className="inline-flex items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir aux compétences
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Supprimer la compétence « {skill.name} » ?</h1>
      </div>
      <DeleteSkillForm skill={skill} />
    </div>
  );
}
