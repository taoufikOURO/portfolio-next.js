import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { EmptyList } from "@/components/site/Cards";
import { PageHero } from "@/components/site/PageHero";
import { SiteImage } from "@/components/site/SiteImage";
import { getPublicSkills, getPublicTechnologies } from "@/lib/public/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compétences",
  description: "Compétences acquises en formation et stack technique.",
  alternates: { canonical: "/competences" },
};

export default async function SkillsPage() {
  const [skills, technologies] = await Promise.all([getPublicSkills(), getPublicTechnologies()]);
  return (
    <main id="contenu">
      <PageHero eyebrow={`Compétences · ${skills.length}`} title="Compétences" intro="Compétences acquises en formation, et outils utilisés au quotidien." />

      <section aria-labelledby="skills-title" className="site-shell mt-12 sm:mt-16">
        <h2 id="skills-title" className="site-wide text-2xl sm:text-3xl">
          Compétences
        </h2>
        {skills.length === 0 ? (
          <div className="mt-6">
            <EmptyList>Aucune compétence renseignée pour le moment.</EmptyList>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill, index) => (
              <li
                key={skill.name}
                className="site-reveal rounded-[1.25rem] bg-white p-5"
                style={{ "--order": Math.min(index, 8) } as CSSProperties}
              >
                <p className="text-lg font-bold">{skill.name}</p>
                {skill.educations.length > 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    <span className="sr-only">Formations : </span>
                    {skill.educations.join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="stack-title" className="site-shell mt-16 sm:mt-24">
        <h2 id="stack-title" className="site-wide text-2xl sm:text-3xl">
          Stack technique
        </h2>
        {technologies.length === 0 ? (
          <div className="mt-6">
            <EmptyList>Aucune technologie renseignée pour le moment.</EmptyList>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {technologies.map((technology, index) => (
              <li
                key={technology.name}
                className="site-reveal flex flex-col items-center gap-3 rounded-[1.25rem] bg-white p-5 text-center"
                style={{ "--order": Math.min(index, 8) } as CSSProperties}
              >
                <span className="relative size-12">
                  <SiteImage image={technology.icon} alt="" sizes="48px" className="object-contain" />
                </span>
                <span className="text-sm font-bold [overflow-wrap:anywhere]">{technology.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
