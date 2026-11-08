import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Pencil, Plus } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { listEducations, type Education } from "@/lib/educations";

import { moveEducationAction } from "./actions";
import { DeleteEducationButton } from "./delete-education";
import { formatGradeOutOf20, formatPeriod } from "./format";
import { educationPath, educationResultMessage, NEW_EDUCATION_PATH } from "./routes";

export const metadata: Metadata = {
  title: "Formations",
};

function Summary({ education }: { education: Education }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href={educationPath(education.id)} className="font-semibold underline break-words">
        {education.title}
      </Link>
      <span className="font-normal break-words">
        {education.institution}, {education.location}
      </span>
      <span className="font-normal">{formatPeriod(education.startDate, education.endDate)}</span>
      {education.honors || education.grade ? (
        <span className="font-normal">
          {[education.honors ? `Mention : ${education.honors}` : null, education.grade ? `Moyenne : ${formatGradeOutOf20(education.grade)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ) : null}
    </div>
  );
}

/** Liste des formations dans l'ordre d'affichage : ajout, modification, ordre, suppression. */
export default async function EducationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [educations, params] = await Promise.all([listEducations(), searchParams]);
  const result = educationResultMessage(params.resultat);
  const total = educations.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">Formations</h1>
          <p className="mt-2">
            Formations dans leur ordre d’affichage. « Monter » et « Descendre » modifient cet ordre.
          </p>
        </div>
        <ButtonLink href={NEW_EDUCATION_PATH} icon={Plus}>
          Ajouter une formation
        </ButtonLink>
      </div>

      {result ? <ResultAlert>{result}</ResultAlert> : null}

      <DataTable
        caption={`Formations, dans l’ordre d’affichage (${total})`}
        rows={educations.map((education, index) => ({ education, index }))}
        getRowKey={({ education }) => education.id}
        empty={
          <EmptyState
            icon={GraduationCap}
            title="Aucune formation"
            description="Ajoutez une première formation : elle apparaîtra ici, dans l’ordre d’affichage."
          >
            <ButtonLink href={NEW_EDUCATION_PATH} icon={Plus}>
              Ajouter une formation
            </ButtonLink>
          </EmptyState>
        }
        columns={[
          {
            key: "position",
            header: "Ordre",
            cell: ({ index }) => (
              <span>
                {index + 1}
                <span className="sr-only"> sur {total}</span>
              </span>
            ),
          },
          {
            key: "education",
            header: "Formation",
            isRowHeader: true,
            cell: ({ education }) => <Summary education={education} />,
          },
          {
            key: "skills",
            header: "Compétences",
            hideBelow: "md",
            cell: ({ education }) =>
              education.skills.length === 0 ? "Aucune" : education.skills.map((skill) => skill.name).join(", "),
          },
          {
            key: "actions",
            header: "Actions",
            cell: ({ education, index }) => (
              <div className="flex flex-col gap-2">
                <MoveButtons action={moveEducationAction} id={education.id} label={education.title} index={index} total={total} />
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={educationPath(education.id)} variant="secondary" icon={Pencil}>
                    Modifier<span className="sr-only"> « {education.title} »</span>
                  </ButtonLink>
                  <DeleteEducationButton
                    education={{ id: education.id, title: education.title, skillCount: education.skills.length }}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
