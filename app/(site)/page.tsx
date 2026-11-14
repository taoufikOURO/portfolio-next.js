import type { Metadata } from "next";

import { HomeHero } from "@/components/site/HomeHero";
import {
  AboutSection,
  ArticlesSection,
  ContactSection,
  JourneySection,
  ProjectsSection,
  SkillsSection,
} from "@/components/site/home/Sections";
import { FAN_PROJECT_SLOTS, siteNameOf } from "@/lib/public/content";
import {
  getPublicArticles,
  getPublicEducations,
  getPublicProfile,
  getPublicProjects,
  getPublicSkills,
  getPublicTechnologies,
} from "@/lib/public/queries";
import { openGraphImages } from "@/lib/public/site";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublicProfile();
  const name = siteNameOf(profile);
  const title = profile.jobTitle ? `${name} — ${profile.jobTitle}` : name;
  return {
    title: { absolute: title },
    alternates: { canonical: "/" },
    openGraph: { title, images: openGraphImages(profile.photo, name) },
  };
}

/**
 * Accueil en une page (E66) : le haut reprend la référence (titre
 * professionnel géant, éventail, anneau), puis, en défilant, un aperçu de
 * chaque section (à propos, projets, parcours, compétences, articles, contact),
 * cibles des ancres de la navigation (E67). Les pages complètes ne s'ouvrent
 * que par le bouton « Voir plus » de chaque section. Tout vient de la base.
 */
export default async function HomePage() {
  const [profile, projects, educations, skills, technologies, articles] = await Promise.all([
    getPublicProfile(),
    getPublicProjects(),
    getPublicEducations(),
    getPublicSkills(),
    getPublicTechnologies(),
    getPublicArticles(),
  ]);

  const counts = [
    { label: projects.length > 1 ? "Projets" : "Projet", value: projects.length },
    { label: educations.length > 1 ? "Formations" : "Formation", value: educations.length },
    { label: technologies.length > 1 ? "Technologies" : "Technologie", value: technologies.length },
    { label: articles.length > 1 ? "Articles" : "Article", value: articles.length },
  ];

  return (
    <main id="contenu">
      <HomeHero profile={profile} projects={projects.slice(0, FAN_PROJECT_SLOTS)} />
      <AboutSection index={1} profile={profile} counts={counts} />
      <ProjectsSection index={2} projects={projects} />
      <JourneySection index={3} educations={educations} />
      <SkillsSection index={4} skills={skills} technologies={technologies} />
      <ArticlesSection index={5} articles={articles} />
      <ContactSection index={6} profile={profile} />
    </main>
  );
}
