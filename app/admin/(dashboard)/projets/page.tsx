import type { Metadata } from "next";
import { Briefcase, Pencil, Plus, Send } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { collaboratorsOrphanedByDeletion, listProjects } from "@/lib/projects";

import { moveProjectAction } from "./actions";
import { DeleteProjectButton } from "./delete-project";
import { ProjectStatus } from "./project-status";
import { NEW_PROJECT_PATH, projectPath, projectPublicationPath, projectResultView } from "./routes";

export const metadata: Metadata = {
  title: "Projets",
};

/** Liste des projets dans l'ordre d'affichage : création, modification, statut, ordre, suppression. */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [projects, params] = await Promise.all([listProjects(), searchParams]);
  const result = projectResultView(params.resultat);
  const total = projects.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="admin-page-title">Projets</h1>
          <p className="mt-3 text-muted">
            Projets dans leur ordre d’affichage. « Monter » et « Descendre » modifient cet ordre. Un projet est créé non
            publié ; son statut se change depuis sa page, avec une confirmation.
          </p>
        </div>
        <ButtonLink href={NEW_PROJECT_PATH} icon={Plus}>
          Ajouter un projet
        </ButtonLink>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <DataTable
        caption={`Projets, dans l’ordre d’affichage (${total})`}
        rows={projects.map((project, index) => ({ project, index }))}
        getRowKey={({ project }) => project.id}
        empty={
          <EmptyState
            icon={Briefcase}
            title="Aucun projet"
            description="Ajoutez un premier projet : il apparaîtra ici, non publié, dans l’ordre d’affichage."
          >
            <ButtonLink href={NEW_PROJECT_PATH} icon={Plus}>
              Ajouter un projet
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
            key: "project",
            header: "Projet",
            isRowHeader: true,
            cell: ({ project }) => (
              <span className="flex flex-col gap-1">
                <span className="font-semibold break-words">{project.title}</span>
                <span className="text-sm break-all">/{project.slug}</span>
              </span>
            ),
          },
          {
            key: "status",
            header: "Statut",
            cell: ({ project }) => <ProjectStatus isPublished={project.isPublished} />,
          },
          {
            key: "technologies",
            header: "Technologies",
            hideBelow: "lg",
            cell: ({ project }) =>
              project.technologies.length === 0 ? (
                <span>Aucune</span>
              ) : (
                <span className="break-words">{project.technologies.map((technology) => technology.name).join(", ")}</span>
              ),
          },
          {
            key: "actions",
            header: "Actions",
            cell: ({ project, index }) => (
              <div className="flex flex-col gap-2">
                <MoveButtons action={moveProjectAction} id={project.id} label={project.title} index={index} total={total} />
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={projectPath(project.id)} variant="secondary" icon={Pencil}>
                    Modifier<span className="sr-only"> « {project.title} »</span>
                  </ButtonLink>
                  <ButtonLink href={projectPublicationPath(project.id)} variant="secondary" icon={Send}>
                    {project.isPublished ? "Retirer de la publication" : "Publier"}
                    <span className="sr-only"> « {project.title} »</span>
                  </ButtonLink>
                  <DeleteProjectButton
                    project={{ id: project.id, title: project.title, orphans: collaboratorsOrphanedByDeletion(project) }}
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
