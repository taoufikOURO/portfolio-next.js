import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { loadProjectOrNotFound } from "../../load-project";
import { ProjectStatus } from "../../project-status";
import { PublicationForm } from "../../publication-form";
import { projectPath } from "../../routes";

export const metadata: Metadata = {
  title: "Statut d’un projet",
};

/**
 * Confirmation du changement de statut (publier ou retirer de la
 * publication), utilisable sans JavaScript : seul endroit où le statut change.
 */
export default async function ProjectPublicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const project = await loadProjectOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={projectPath(project.id)} className="inline-flex items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir au projet
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">
          {project.isPublished ? `Retirer « ${project.title} » de la publication ?` : `Publier « ${project.title} » ?`}
        </h1>
      </div>
      <p className="flex flex-wrap items-center gap-2">
        Statut actuel : <ProjectStatus isPublished={project.isPublished} />
      </p>
      <PublicationForm project={{ id: project.id, title: project.title, isPublished: project.isPublished }} />
    </div>
  );
}
