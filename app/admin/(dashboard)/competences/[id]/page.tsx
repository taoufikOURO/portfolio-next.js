import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { educationPath } from "../../formations/routes";
import { DeleteSkillButton } from "../delete-skill";
import { loadSkillOrNotFound } from "../load-skill";
import { SKILLS_PATH } from "../routes";
import { SkillNameForm } from "../skill-name-form";

export const metadata: Metadata = {
  title: "Renommer une compétence",
};

/** Renommage d'une compétence, formations qui l'utilisent, suppression. */
export default async function SkillPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const skill = await loadSkillOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={SKILLS_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux compétences
        </Link>
        <h1 className="admin-page-title mt-4">Compétence « {skill.name} »</h1>
      </div>

      <section aria-labelledby="competence-renommer" className="admin-card">
        <h2 id="competence-renommer" className="admin-section-title">
          Renommer
        </h2>
        <div className="mt-4">
          <SkillNameForm skill={{ id: skill.id, name: skill.name }} />
        </div>
      </section>

      <section aria-labelledby="competence-usage" className="admin-card">
        <h2 id="competence-usage" className="admin-section-title">
          Formations qui l’utilisent
        </h2>
        {skill.educations.length === 0 ? (
          <p className="mt-4">Aucune formation.</p>
        ) : (
          <ul className="mt-4 list-disc pl-6">
            {skill.educations.map((education) => (
              <li key={education.id}>
                <Link href={educationPath(education.id)} className="admin-link">
                  {education.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="competence-suppression" className="admin-card">
        <h2 id="competence-suppression" className="admin-section-title">
          Supprimer
        </h2>
        <p className="mt-4">
          {skill.educations.length === 0
            ? "Cette compétence n’est rattachée à aucune formation."
            : "Cette compétence est utilisée : sa suppression demande une confirmation qui la détache des formations ci-dessus."}
        </p>
        <DeleteSkillButton skill={skill} className="mt-4" />
      </section>
    </div>
  );
}
