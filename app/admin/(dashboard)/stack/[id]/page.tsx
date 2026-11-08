import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";
import { technologyIconUrl } from "@/lib/technologies";

import { DeleteTechnologyButton } from "../delete-technology";
import { loadTechnologyOrNotFound } from "../load-technology";
import { STACK_PATH } from "../routes";
import { TechnologyForm } from "../technology-form";

export const metadata: Metadata = {
  title: "Modifier une technologie",
};

/** Modification du nom et de l'icône d'une technologie, projets qui l'utilisent, suppression. */
export default async function EditTechnologyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const technology = await loadTechnologyOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={STACK_PATH} className="inline-flex items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour à la stack
        </Link>
        <h1 className="mt-4 text-3xl font-bold break-words">Modifier « {technology.name} »</h1>
      </div>

      <TechnologyForm
        technology={{ id: technology.id, name: technology.name, iconUrl: technologyIconUrl(technology.iconPath) }}
      />

      <section aria-labelledby="technologie-usage" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="technologie-usage" className="text-xl font-bold">
          Projets qui l’utilisent
        </h2>
        {technology.projects.length === 0 ? (
          <p className="mt-4">Aucun projet.</p>
        ) : (
          <ul className="mt-4 list-disc pl-6">
            {technology.projects.map((project) => (
              <li key={project.id} className="break-words">
                {project.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="technologie-suppression" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
        <h2 id="technologie-suppression" className="text-xl font-bold">
          Supprimer la technologie
        </h2>
        <p className="mt-4">
          {technology.projects.length === 0
            ? "Cette technologie n’est utilisée par aucun projet."
            : "Cette technologie est utilisée : sa suppression demande une confirmation qui la détache des projets ci-dessus."}
        </p>
        <DeleteTechnologyButton technology={technology} className="mt-4" />
      </section>
    </div>
  );
}
