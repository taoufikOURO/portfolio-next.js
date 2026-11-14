import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";
import { collaboratorsOrphanedByDeletion } from "@/lib/projects";

import { DeleteProjectForm } from "../../delete-project";
import { loadProjectOrNotFound } from "../../load-project";
import { PROJECTS_PATH } from "../../routes";

export const metadata: Metadata = {
  title: "Supprimer un projet",
};

/** Confirmation de suppression sans JavaScript (avec JavaScript, un dialogue s'ouvre à la place). */
export default async function DeleteProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const project = await loadProjectOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={PROJECTS_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir aux projets
        </Link>
        <h1 className="admin-page-title mt-4">Supprimer le projet « {project.title} » ?</h1>
      </div>
      <DeleteProjectForm
        project={{ id: project.id, title: project.title, orphans: collaboratorsOrphanedByDeletion(project) }}
      />
    </div>
  );
}
