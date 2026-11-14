import { Download } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { EmptyList } from "@/components/site/Cards";
import { PageHero } from "@/components/site/PageHero";
import { formatGrade, formatMonth } from "@/lib/public/content";
import { getPublicEducations, getPublicProfile } from "@/lib/public/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Formations",
  description: "Parcours de formation : diplômes, établissements et compétences acquises.",
  alternates: { canonical: "/formations" },
};

export default async function EducationsPage() {
  const [educations, profile] = await Promise.all([getPublicEducations(), getPublicProfile()]);
  return (
    <main id="contenu">
      <PageHero eyebrow={`Formations · ${educations.length}`} title="Formations" intro="Diplômes, établissements et compétences acquises.">
        {profile.resumeHref ? (
          <a
            href={profile.resumeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="site-button site-button-primary site-reveal relative mt-8"
            style={{ "--order": 3 } as CSSProperties}
          >
            <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Voir le CV
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        ) : null}
      </PageHero>

      <section aria-label="Liste des formations" className="site-shell mt-12 sm:mt-16">
        {educations.length === 0 ? (
          <EmptyList>Aucune formation renseignée pour le moment.</EmptyList>
        ) : (
          <ol className="grid gap-6">
            {educations.map((education, index) => (
              <li
                key={`${education.title}-${education.startDate.toISOString()}`}
                className="site-reveal relative grid gap-6 rounded-[1.25rem] bg-white p-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:p-10"
                style={{ "--order": Math.min(index, 8) } as CSSProperties}
              >
                <div>
                  <p className="site-wide text-sm leading-snug">
                    {formatMonth(education.startDate)}
                    <br />
                    <span aria-hidden="true">↓ </span>
                    <span className="sr-only">à </span>
                    {education.endDate ? formatMonth(education.endDate) : "en cours"}
                  </p>
                  <span aria-hidden="true" className="mt-4 block h-1.5 w-12 bg-signal" />
                </div>
                <div className="min-w-0">
                  <h2 className="site-wide text-xl leading-tight sm:text-2xl [overflow-wrap:anywhere]">{education.title}</h2>
                  <p className="mt-2 font-semibold">
                    {education.institution}
                    <span className="text-muted"> · {education.location}</span>
                  </p>
                  {education.honors || education.grade ? (
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.06em]">
                      {[education.honors ? `Mention ${education.honors}` : null, education.grade ? `Moyenne ${formatGrade(education.grade)}/20` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-4 whitespace-pre-line leading-relaxed text-muted [overflow-wrap:anywhere]">{education.description}</p>
                  {education.skills.length > 0 ? (
                    <ul aria-label="Compétences acquises" className="mt-5 flex flex-wrap gap-2">
                      {education.skills.map((skill) => (
                        <li key={skill.name} className="site-chip">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
