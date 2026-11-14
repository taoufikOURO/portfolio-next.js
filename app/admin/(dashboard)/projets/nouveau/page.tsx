import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";
import { listTechnologies } from "@/lib/technologies";

import { ProjectForm } from "../project-form";
import { PROJECTS_PATH } from "../routes";

export const metadata: Metadata = {
  title: "Nouveau projet",
};

export default async function NewProjectPage() {
  await requireSession();
  const technologies = await listTechnologies();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={PROJECTS_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux projets
        </Link>
        <h1 className="admin-page-title mt-4">Nouveau projet</h1>
        <p className="mt-3 text-muted">
          Il sera créé non publié, en dernière position. Le statut se change ensuite depuis la page du projet, avec une
          confirmation.
        </p>
      </div>
      <ProjectForm technologyOptions={technologies.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
