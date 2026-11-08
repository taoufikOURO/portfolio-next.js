import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Pencil, Plus } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { listTechnologies, type Technology } from "@/lib/technologies";

import { projectPath } from "../projets/routes";

import { moveTechnologyAction } from "./actions";
import { DeleteTechnologyButton } from "./delete-technology";
import { NEW_TECHNOLOGY_PATH, technologyPath, technologyResultView } from "./routes";
import { TechnologyIcon } from "./technology-icon";

export const metadata: Metadata = {
  title: "Stack",
};

function Usage({ technology }: { technology: Technology }) {
  if (technology.projects.length === 0) return <span>Aucun</span>;
  return (
    <ul className="flex flex-col gap-1">
      {technology.projects.map((project) => (
        <li key={project.id} className="break-words">
          <Link href={projectPath(project.id)} className="underline">
            {project.title}
            <span className="sr-only"> (modifier le projet)</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Liste de la stack dans l'ordre d'affichage : ajout, modification, ordre, suppression. */
export default async function StackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [technologies, params] = await Promise.all([listTechnologies(), searchParams]);
  const result = technologyResultView(params.resultat);
  const total = technologies.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold">Stack</h1>
          <p className="mt-2">
            Technologies dans leur ordre d’affichage. « Monter » et « Descendre » modifient cet ordre.
          </p>
        </div>
        <ButtonLink href={NEW_TECHNOLOGY_PATH} icon={Plus}>
          Ajouter une technologie
        </ButtonLink>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <DataTable
        caption={`Technologies, dans l’ordre d’affichage (${total})`}
        rows={technologies.map((technology, index) => ({ technology, index }))}
        getRowKey={({ technology }) => technology.id}
        empty={
          <EmptyState
            icon={Layers}
            title="Aucune technologie"
            description="Ajoutez une première technologie : elle apparaîtra ici, dans l’ordre d’affichage."
          >
            <ButtonLink href={NEW_TECHNOLOGY_PATH} icon={Plus}>
              Ajouter une technologie
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
            key: "technology",
            header: "Technologie",
            isRowHeader: true,
            cell: ({ technology }) => (
              <span className="flex items-center gap-3">
                <TechnologyIcon iconPath={technology.iconPath} />
                <span className="font-semibold break-words">{technology.name}</span>
              </span>
            ),
          },
          {
            key: "projects",
            header: "Projets",
            hideBelow: "md",
            cell: ({ technology }) => <Usage technology={technology} />,
          },
          {
            key: "actions",
            header: "Actions",
            cell: ({ technology, index }) => (
              <div className="flex flex-col gap-2">
                <MoveButtons action={moveTechnologyAction} id={technology.id} label={technology.name} index={index} total={total} />
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={technologyPath(technology.id)} variant="secondary" icon={Pencil}>
                    Modifier<span className="sr-only"> « {technology.name} »</span>
                  </ButtonLink>
                  <DeleteTechnologyButton technology={technology} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
