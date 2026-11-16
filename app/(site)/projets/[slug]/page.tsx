import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Crosses } from "@/components/site/Crosses";
import { SiteImage } from "@/components/site/SiteImage";
import { formatMonth } from "@/lib/public/content";
import { getPublicProject, getPublicProjects } from "@/lib/public/queries";
import { openGraphImages } from "@/lib/public/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublicProjects()).map((project) => ({ slug: project.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getPublicProject((await params).slug);
  if (!project) return { title: "Projet introuvable" };
  const description = project.description.slice(0, 200);
  return {
    title: project.title,
    description,
    alternates: { canonical: `/projets/${project.slug}` },
    openGraph: { title: project.title, description, images: openGraphImages(project.image, project.title) },
  };
}

function Section({ title, order, children }: { title: string; order: number; children: React.ReactNode }) {
  return (
    <section className="site-reveal border-t border-ink pt-5" style={{ "--order": order } as CSSProperties}>
      <h2 className="site-eyebrow">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Détail d'un projet publié : description, technologies, liens ordonnés, collaborateurs. */
export default async function ProjectPage({ params }: Props) {
  const project = await getPublicProject((await params).slug);
  if (!project) notFound();
  // Sans image, la colonne (image et bloc rouge) n'est pas rendue : pas d'image par défaut.
  const hasImage = !project.image.isDefault;

  return (
    <main id="contenu">
      <header className="site-shell pt-8 sm:pt-12">
        <div className="relative px-3 py-8 sm:px-10 sm:py-12">
          <Crosses thirds />
          <Link href="/projets" className="site-reveal relative inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.06em]">
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Tous les projets
          </Link>
          <p className="site-eyebrow site-reveal relative mt-6">Projet{project.date ? ` · ${formatMonth(project.date)}` : ""}</p>
          <h1
            className="site-wide site-reveal relative mt-3 max-w-5xl text-[clamp(2rem,7vw,5.5rem)] leading-[0.95] [overflow-wrap:anywhere]"
            style={{ "--order": 1 } as CSSProperties}
          >
            {project.title}
          </h1>
        </div>
      </header>

      <div
        className={
          hasImage
            ? "site-shell mt-8 grid gap-12 sm:mt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16"
            : "site-shell mt-8 sm:mt-12"
        }
      >
        {hasImage ? (
          <div className="relative">
            <div aria-hidden="true" className="site-block absolute -left-2 -top-4 h-2/3 w-1/3 rounded-[1.25rem] bg-signal sm:-left-4 sm:-top-6" />
            <div className="site-card-face site-reveal relative aspect-[4/5] -rotate-2" style={{ "--order": 2 } as CSSProperties}>
              <SiteImage image={project.image} alt="" sizes="(min-width: 1024px) 640px, 100vw" eager />
            </div>
          </div>
        ) : null}

        <div className={hasImage ? "grid content-start gap-10" : "grid max-w-3xl content-start gap-10 sm:px-10"}>
          <Section title="Description" order={3}>
            <p className="whitespace-pre-line text-lg leading-relaxed [overflow-wrap:anywhere]">{project.description}</p>
          </Section>

          {project.technologies.length > 0 ? (
            <Section title="Technologies" order={4}>
              <ul className="flex flex-wrap gap-2">
                {project.technologies.map((technology) => (
                  <li key={technology.name} className="site-chip bg-white">
                    <span className="relative size-5 shrink-0 overflow-hidden rounded">
                      <SiteImage image={technology.icon} alt="" sizes="20px" className="object-contain" />
                    </span>
                    {technology.name}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {project.links.length > 0 ? (
            <Section title="Liens" order={5}>
              <ul className="flex flex-col gap-2">
                {project.links.map((link) => (
                  <li key={`${link.label}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="site-button site-button-secondary w-full justify-between sm:w-auto"
                    >
                      <span className="[overflow-wrap:anywhere]">{link.label}</span>
                      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {project.collaborators.length > 0 ? (
            <Section title="Collaborateurs" order={6}>
              <ul className="flex flex-wrap gap-2">
                {project.collaborators.map((collaborator) => (
                  <li key={collaborator.name}>
                    {collaborator.profileUrl ? (
                      <a
                        href={collaborator.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-chip min-h-11 underline-offset-4 hover:underline"
                      >
                        {collaborator.name}
                        <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                        <span className="sr-only"> (profil, nouvel onglet)</span>
                      </a>
                    ) : (
                      <span className="site-chip min-h-11">{collaborator.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
