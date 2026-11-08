import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Wrench } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { listSkills, type SkillWithUsage } from "@/lib/skills";

import { educationPath } from "../formations/routes";
import { DeleteSkillButton } from "./delete-skill";
import { skillPath, skillResultMessage } from "./routes";
import { SkillNameForm } from "./skill-name-form";

export const metadata: Metadata = {
  title: "Compétences",
};

function Usage({ skill }: { skill: SkillWithUsage }) {
  if (skill.educations.length === 0) return <span>Aucune</span>;
  return (
    <ul className="flex flex-col gap-1">
      {skill.educations.map((education) => (
        <li key={education.id}>
          <Link href={educationPath(education.id)} className="underline">
            {education.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Liste des compétences : ajout, renommage, suppression (bloquée si utilisée, sauf confirmation). */
export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [skills, params] = await Promise.all([listSkills(), searchParams]);
  const result = skillResultMessage(params.resultat);

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Compétences</h1>
        <p className="mt-2">
          Compétences rattachables aux formations. Une même compétence peut être rattachée à plusieurs formations.
        </p>
      </div>

      {result ? <ResultAlert>{result}</ResultAlert> : null}

      <section aria-labelledby="competences-ajout" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="competences-ajout" className="text-xl font-bold">
          Ajouter une compétence
        </h2>
        <div className="mt-4">
          <SkillNameForm />
        </div>
      </section>

      <section aria-labelledby="competences-liste" className="flex flex-col gap-4">
        <h2 id="competences-liste" className="text-xl font-bold">
          Liste des compétences{" "}
          <span className="font-normal">({skills.length})</span>
        </h2>
        <DataTable
          caption="Compétences, par ordre alphabétique, avec les formations qui les utilisent"
          captionHidden
          rows={skills}
          getRowKey={(skill) => skill.id}
          empty={
            <EmptyState
              icon={Wrench}
              title="Aucune compétence"
              description="Ajoutez une première compétence avec le formulaire ci-dessus."
            />
          }
          columns={[
            { key: "name", header: "Nom", isRowHeader: true, cell: (skill) => skill.name },
            { key: "usage", header: "Formations", hideBelow: "sm", cell: (skill) => <Usage skill={skill} /> },
            {
              key: "actions",
              header: "Actions",
              cell: (skill) => (
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={skillPath(skill.id)} variant="secondary" icon={Pencil}>
                    Renommer<span className="sr-only"> « {skill.name} »</span>
                  </ButtonLink>
                  <DeleteSkillButton skill={skill} />
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
