import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { collaboratorsOrphanedByDeletion, projectImageUrl } from "@/lib/projects";
import { listTechnologies } from "@/lib/technologies";
import { projectFormValues } from "@/lib/validation/project";

import { CollaboratorsSection } from "../collaborators-section";
import { DeleteProjectButton } from "../delete-project";
import { loadProjectOrNotFound } from "../load-project";
import { ProjectForm } from "../project-form";
import { ProjectStatus } from "../project-status";
import { PROJECTS_PATH, projectPublicationPath, projectResultView } from "../routes";

export const metadata: Metadata = {
  title: "Modifier un projet",
};

/** Modification d'un projet, collaborateurs (relance GitHub), statut et suppression. */
export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [project, technologies, query] = await Promise.all([loadProjectOrNotFound(params), listTechnologies(), searchParams]);
  const result = projectResultView(query.resultat);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={PROJECTS_PATH} className="inline-flex min-h-11 items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux projets
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Modifier « {project.title} »</h1>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <section aria-labelledby="projet-statut" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="projet-statut" className="text-xl font-bold">
          Statut
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ProjectStatus isPublished={project.isPublished} />
          <ButtonLink href={projectPublicationPath(project.id)} variant="secondary" icon={Send}>
            {project.isPublished ? "Retirer de la publication" : "Publier"}
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm">
          Le statut ne change qu’après une confirmation. Enregistrer le formulaire ci-dessous ne le modifie pas.
        </p>
      </section>

      <ProjectForm
        project={{
          id: project.id,
          title: project.title,
          imageUrl: project.imagePath ? projectImageUrl(project.imagePath) : null,
          publishedSlug: project.isPublished ? project.slug : undefined,
        }}
        initialValues={projectFormValues(project)}
        technologyOptions={technologies.map(({ id, name }) => ({ id, name }))}
      />

      <CollaboratorsSection projectId={project.id} collaborators={project.collaborators} />

      <section aria-labelledby="projet-suppression" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="projet-suppression" className="text-xl font-bold">
          Supprimer le projet
        </h2>
        <p className="mt-4">La suppression retire aussi ses liens, son image et les collaborateurs qui ne sont rattachés à aucun autre projet.</p>
        <DeleteProjectButton
          project={{ id: project.id, title: project.title, orphans: collaboratorsOrphanedByDeletion(project) }}
          className="mt-4"
        />
      </section>
    </div>
  );
}
