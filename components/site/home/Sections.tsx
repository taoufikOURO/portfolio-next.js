import { ArrowRight, ArrowUpRight, Download, Mail } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import {
  formatDay,
  formatGrade,
  formatMonth,
  type PublicArticleSummary,
  type PublicEducation,
  type PublicProfile,
  type PublicProject,
  type SiteImage as SiteImageData,
} from "@/lib/public/content";

import { SiteImage } from "../SiteImage";
import { SectionHeading } from "./SectionHeading";

// Sections de l'accueil (E66, E67). Chacune montre un aperçu de son contenu
// (tiré de la base) et se termine par « Voir plus », seul accès à la page
// complète. Toutes les sections sont toujours présentes, pour que chaque
// ancre de la navigation mène quelque part : sans contenu, un état vide
// s'affiche. Chaque bloc porte `data-reveal` (apparition au défilement,
// `components/site/ScrollReveal.tsx`) et reste visible sans JavaScript.

/** Taille des aperçus de l'accueil (le reste est sur la page complète). */
export const PREVIEW = { projects: 3, educations: 2, technologies: 6, articles: 3 } as const;

const order = (value: number) => ({ "--order": Math.min(value, 6) }) as CSSProperties;

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function externalLinks(profile: PublicProfile) {
  return [
    profile.linkedinUrl ? { href: profile.linkedinUrl, label: "LinkedIn" } : null,
    profile.githubUrl ? { href: profile.githubUrl, label: "GitHub" } : null,
    profile.resumeHref ? { href: profile.resumeHref, label: "Voir le CV" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);
}

/**
 * Bouton « Voir plus » de fin de section : seul chemin vers la page complète
 * (E67). `context` complète le nom accessible (« Voir plus : tous les projets ») ;
 * `summary` indique ce que l'aperçu montre (« 3 projets sur 6 »).
 */
function MoreButton({ href, context, summary }: { href: string; context: string; summary?: string }) {
  return (
    <div data-reveal className="mt-12 flex flex-col items-center gap-3 sm:mt-16">
      <Link href={href} className="group site-button site-button-primary min-h-12 px-8 text-[0.95rem]">
        Voir plus
        <span className="sr-only"> : {context}</span>
        <ArrowRight aria-hidden="true" className="site-nudge size-4" strokeWidth={2} />
      </Link>
      {summary ? <p className="text-sm text-muted">{summary}</p> : null}
    </div>
  );
}

/** État vide d'une section (l'ancre reste valide). */
function EmptySection({ children }: { children: string }) {
  return (
    <p data-reveal className="mt-12 rounded-[1.25rem] border border-dashed border-ink px-6 py-12 text-center font-semibold sm:mt-16">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// À propos
// ---------------------------------------------------------------------------

export function AboutSection({
  index,
  profile,
  counts,
}: {
  index: number;
  profile: PublicProfile;
  counts: { label: string; value: number }[];
}) {
  return (
    <section id="a-propos" aria-labelledby="a-propos-title" className="site-shell mt-20 sm:mt-32">
      <SectionHeading id="a-propos" index={index} title="À propos" />

      <div className="mt-12 grid gap-12 sm:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div data-reveal data-from="left" className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <span aria-hidden="true" className="absolute -left-3 -top-4 h-3/5 w-1/2 rounded-[1.25rem] bg-signal" />
          <span className="site-card-face relative block aspect-[3/4] -rotate-2">
            <SiteImage image={profile.photo} alt={profile.fullName ? `Photo de ${profile.fullName}` : ""} sizes="(min-width: 1024px) 480px, 90vw" />
          </span>
        </div>

        <div className="min-w-0">
          {profile.bio ? (
            <p data-reveal className="text-2xl font-semibold leading-snug sm:text-3xl [overflow-wrap:anywhere]">
              {profile.bio}
            </p>
          ) : null}
          {profile.about ? (
            <div data-reveal style={order(1)} className="mt-6 grid gap-4 text-lg leading-relaxed text-muted">
              {paragraphs(profile.about)
                .slice(0, 2)
                .map((paragraph, position) => (
                  <p key={position} className="line-clamp-5 whitespace-pre-line [overflow-wrap:anywhere]">
                    {paragraph}
                  </p>
                ))}
            </div>
          ) : null}

          <dl className="mt-10 grid grid-cols-2 border-t border-ink sm:grid-cols-4">
            {counts.map((count, position) => (
              <div key={count.label} data-reveal style={order(position + 1)} className="border-b border-ink py-5 pr-4">
                <dt className="site-eyebrow">{count.label}</dt>
                <dd className="site-wide mt-2 text-4xl tabular-nums sm:text-5xl">{String(count.value).padStart(2, "0")}</dd>
              </div>
            ))}
          </dl>

          <ul data-reveal style={order(2)} className="mt-10 flex flex-wrap gap-3">
            {profile.email ? (
              <li>
                <a href={`mailto:${profile.email}`} className="site-button site-button-secondary">
                  <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  Écrire un e-mail
                </a>
              </li>
            ) : null}
            {externalLinks(profile).map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="site-button site-button-secondary">
                  {link.label}
                  <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <MoreButton href="/profil" context="profil complet" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Projets
// ---------------------------------------------------------------------------

function TechChip({ name, icon }: { name: string; icon: SiteImageData }) {
  return (
    <span className="site-chip bg-white">
      <span className="relative size-4 shrink-0 overflow-hidden rounded-sm">
        <SiteImage image={icon} alt="" sizes="16px" className="object-contain" />
      </span>
      {name}
    </span>
  );
}

export function ProjectsSection({ index, projects }: { index: number; projects: PublicProject[] }) {
  const shown = projects.slice(0, PREVIEW.projects);
  return (
    <section id="projets" aria-labelledby="projets-title" className="site-shell mt-28 sm:mt-40">
      <SectionHeading
        id="projets"
        index={index}
        title="Projets"
        intro={projects.length > 0 ? `${plural(projects.length, "projet publié", "projets publiés")}, de l'idée à la mise en ligne.` : undefined}
      />
      {shown.length === 0 ? (
        <EmptySection>Aucun projet publié pour le moment.</EmptySection>
      ) : (
        <>
          <ol className="mt-12 border-t border-ink sm:mt-16">
            {shown.map((project, position) => (
              <li key={project.slug} data-reveal data-from={position % 2 === 0 ? "left" : "right"}>
                <Link
                  href={`/projets/${project.slug}`}
                  className="group grid gap-6 border-b border-ink py-8 sm:py-10 lg:grid-cols-[7rem_minmax(0,1fr)_22rem] lg:items-center lg:gap-10"
                >
                  <span aria-hidden="true" className="site-wide site-outline text-5xl leading-none lg:text-6xl">
                    {String(position + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="site-wide site-nudge block text-2xl leading-[1.05] sm:text-4xl [overflow-wrap:anywhere]">{project.title}</span>
                    <span className="mt-4 line-clamp-3 block max-w-2xl leading-relaxed text-muted">{project.description}</span>
                    {project.technologies.length > 0 ? (
                      <span className="mt-5 flex flex-wrap gap-2">
                        {project.technologies.slice(0, 6).map((technology) => (
                          <TechChip key={technology.name} name={technology.name} icon={technology.icon} />
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="site-card-face site-lift block aspect-[4/3] w-full"
                    style={{ "--tilt": `${position % 2 === 0 ? 2 : -2}deg` } as CSSProperties}
                  >
                    <SiteImage image={project.image} alt="" sizes="(min-width: 1024px) 352px, 100vw" />
                    <span className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-paper">
                      <ArrowUpRight aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <MoreButton href="/projets" context="tous les projets" summary={`${shown.length} sur ${plural(projects.length, "projet")}`} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------

export function JourneySection({ index, educations }: { index: number; educations: PublicEducation[] }) {
  const shown = educations.slice(0, PREVIEW.educations);
  return (
    <section id="parcours" aria-labelledby="parcours-title" className="site-shell mt-28 sm:mt-40">
      <SectionHeading id="parcours" index={index} title="Parcours" />
      {shown.length === 0 ? (
        <EmptySection>Aucune formation renseignée pour le moment.</EmptySection>
      ) : (
        <>
          <ol data-reveal className="relative mt-12 sm:mt-16">
            <span aria-hidden="true" className="site-timeline-line absolute bottom-3 left-[7px] top-3 w-px bg-ink sm:left-[13.5rem]" />
            {shown.map((education, position) => (
              <li
                key={`${education.title}-${education.startDate.toISOString()}`}
                data-reveal
                style={order(position)}
                className="relative grid gap-3 pb-12 pl-9 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-12 sm:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="site-timeline-dot absolute left-0 top-1 size-3.5 rounded-full bg-signal ring-4 ring-paper sm:left-[calc(13.5rem-7px)]"
                />
                <p className="site-wide text-sm leading-snug">
                  {formatMonth(education.startDate)}
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> à </span>
                  {education.endDate ? formatMonth(education.endDate) : "en cours"}
                </p>
                <div className="min-w-0">
                  <h3 className="site-wide text-xl leading-tight sm:text-2xl [overflow-wrap:anywhere]">{education.title}</h3>
                  <p className="mt-2 font-semibold">
                    {education.institution}
                    <span className="text-muted"> · {education.location}</span>
                  </p>
                  {education.honors || education.grade ? (
                    <p className="mt-2 text-sm font-bold uppercase tracking-[0.06em]">
                      {[education.honors ? `Mention ${education.honors}` : null, education.grade ? `Moyenne ${formatGrade(education.grade)}/20` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-3 line-clamp-3 whitespace-pre-line leading-relaxed text-muted">{education.description}</p>
                  {education.skills.length > 0 ? (
                    <ul aria-label="Compétences acquises" className="mt-4 flex flex-wrap gap-2">
                      {education.skills.slice(0, 5).map((skill) => (
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
          <MoreButton href="/formations" context="toutes les formations" summary={`${shown.length} sur ${plural(educations.length, "formation")}`} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Compétences
// ---------------------------------------------------------------------------

/**
 * Aperçu des compétences : seulement la grille des icônes de la stack. La
 * liste des compétences n'est affichée que sur la page complète
 * (`/competences`), atteinte par « Voir plus ».
 */
export function SkillsSection({
  index,
  skillCount,
  technologies,
}: {
  index: number;
  skillCount: number;
  technologies: { name: string; icon: SiteImageData }[];
}) {
  const shownTechnologies = technologies.slice(0, PREVIEW.technologies);
  const empty = skillCount === 0 && technologies.length === 0;
  return (
    <section id="competences" aria-labelledby="competences-title" className="site-shell mt-28 sm:mt-40">
      <SectionHeading id="competences" index={index} title="Compétences" />
      {empty ? (
        <EmptySection>Aucune compétence renseignée pour le moment.</EmptySection>
      ) : (
        <>
          <div className="mt-12 sm:mt-16">
            <h3 data-reveal className="site-eyebrow">
              Stack technique
            </h3>
            {shownTechnologies.length > 0 ? (
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {shownTechnologies.map((technology, position) => (
                  <li
                    key={technology.name}
                    data-reveal
                    style={order(position % 6)}
                    className="flex items-center gap-3 rounded-[1.25rem] bg-white p-4"
                  >
                    <span className="relative size-9 shrink-0">
                      <SiteImage image={technology.icon} alt="" sizes="36px" className="object-contain" />
                    </span>
                    <span className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">{technology.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p data-reveal className="mt-5 text-muted">
                La stack technique n&apos;est pas encore renseignée.
              </p>
            )}
          </div>
          <MoreButton
            href="/competences"
            context="toutes les compétences et la stack technique"
            summary={[
              technologies.length > 0 ? `${shownTechnologies.length} sur ${plural(technologies.length, "technologie")}` : null,
              skillCount > 0 ? plural(skillCount, "compétence") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export function ArticlesSection({ index, articles }: { index: number; articles: PublicArticleSummary[] }) {
  const shown = articles.slice(0, PREVIEW.articles);
  return (
    <section id="articles" aria-labelledby="articles-title" className="site-shell mt-28 sm:mt-40">
      <SectionHeading id="articles" index={index} title="Articles" />
      {shown.length === 0 ? (
        <EmptySection>Aucun article publié pour le moment.</EmptySection>
      ) : (
        <>
          <ul className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-3 md:gap-8">
            {shown.map((article, position) => (
              <li key={article.slug} data-reveal style={order(position)}>
                <Link href={`/articles/${article.slug}`} className="group block rounded-[1.25rem]">
                  <span
                    className="site-card-face site-lift block aspect-[16/11]"
                    style={{ "--tilt": `${position % 2 === 0 ? -1.5 : 1.5}deg` } as CSSProperties}
                  >
                    <SiteImage image={article.cover} alt="" sizes="(min-width: 768px) 33vw, 100vw" />
                  </span>
                  <span className="mt-5 block">
                    {article.category ? <span className="site-eyebrow block">{article.category}</span> : null}
                    <span className="site-wide site-nudge mt-2 block text-xl leading-tight [overflow-wrap:anywhere]">{article.title}</span>
                    <span className="mt-2 block text-sm text-muted">
                      Publié le <time dateTime={article.publishedAt.toISOString()}>{formatDay(article.publishedAt)}</time>
                      {article.updatedAt ? (
                        <>
                          {" · "}mis à jour le <time dateTime={article.updatedAt.toISOString()}>{formatDay(article.updatedAt)}</time>
                        </>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <MoreButton href="/articles" context="tous les articles" summary={`${shown.length} sur ${plural(articles.length, "article")}`} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export function ContactSection({ index, profile }: { index: number; profile: PublicProfile }) {
  const links = externalLinks(profile);
  return (
    <section id="contact" aria-labelledby="contact-title" className="site-shell mt-28 sm:mt-40">
      <div className="site-dark relative overflow-hidden rounded-[2rem] bg-ink px-5 py-12 text-paper sm:px-12 sm:py-20">
        <SectionHeading id="contact" index={index} title="Contact" dark />
        <p data-reveal className="mt-10 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl">
          Un projet, une question ou une opportunité : écrivez-moi.
        </p>
        {profile.email ? (
          <a
            data-reveal
            style={order(1)}
            href={`mailto:${profile.email}`}
            className="site-wide mt-8 inline-flex min-h-11 items-center gap-3 text-[0.95rem] underline decoration-1 underline-offset-[0.25em] sm:text-3xl lg:text-4xl [overflow-wrap:anywhere]"
          >
            {profile.email}
            <ArrowUpRight aria-hidden="true" className="size-6 shrink-0 sm:size-9" strokeWidth={1.5} />
          </a>
        ) : null}
        {links.length > 0 ? (
          <ul data-reveal style={order(2)} className="mt-10 flex flex-wrap gap-3">
            {links.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="site-button border-paper bg-transparent text-paper">
                  {link.label === "Voir le CV" ? <Download aria-hidden="true" className="size-4" strokeWidth={1.75} /> : null}
                  {link.label}
                  <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
