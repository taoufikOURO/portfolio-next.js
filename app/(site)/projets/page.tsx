import type { Metadata } from "next";

import { EmptyList, ProjectCard } from "@/components/site/Cards";
import { PageHero } from "@/components/site/PageHero";
import { getPublicProjects } from "@/lib/public/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Projets",
  description: "Projets réalisés : description, technologies, liens et collaborateurs.",
  alternates: { canonical: "/projets" },
};

export default async function ProjectsPage() {
  const projects = await getPublicProjects();
  return (
    <main id="contenu">
      <PageHero
        eyebrow={`Projets · ${projects.length} publié${projects.length > 1 ? "s" : ""}`}
        title="Projets"
        intro="Une sélection de projets, de l'idée à la mise en ligne."
      />
      <section aria-label="Liste des projets" className="site-shell mt-12 sm:mt-16">
        {projects.length === 0 ? (
          <EmptyList>Aucun projet publié pour le moment.</EmptyList>
        ) : (
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard key={project.slug} project={project} index={index} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
