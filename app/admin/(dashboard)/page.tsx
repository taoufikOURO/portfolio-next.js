import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Ellipsis,
  FilePlus,
  FileText,
  FolderPlus,
  GraduationCap,
  ImageOff,
  LayoutDashboard,
  Layers,
  UserPen,
  UserRound,
  Wrench,
} from "lucide-react";

import { BarChart } from "@/components/admin/BarChart";
import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { DonutChart } from "@/components/admin/DonutChart";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatCard, ValueBadge } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireSession } from "@/lib/auth/require-session";
import {
  getDashboard,
  PENDING_ARTICLES_LIMIT,
  type MonthCount,
  type ProfileCompleteness,
  type RequiredProfileField,
} from "@/lib/dashboard";
import { projectImageUrl } from "@/lib/projects";
import { ADMIN_TIME_ZONE, formatDayTime } from "@/lib/validation/article";

import { ArticleStatus } from "./articles/article-status";
import { articlePath, ARTICLES_PATH, NEW_ARTICLE_PATH } from "./articles/routes";
import { SKILLS_PATH } from "./competences/routes";
import { EDUCATIONS_PATH, NEW_EDUCATION_PATH } from "./formations/routes";
import { PROFILE_PATH } from "./profil/routes";
import { NEW_PROJECT_PATH, projectPath, PROJECTS_PATH } from "./projets/routes";
import { STACK_PATH } from "./stack/routes";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

const MISSING_FIELD_LABELS: Record<RequiredProfileField, string> = {
  firstName: "le prénom",
  lastName: "le nom",
  email: "l’adresse e-mail de contact",
  jobTitle: "le titre professionnel",
};

/** Nombre de champs obligatoires du profil (prénom, nom, e-mail de contact, titre). */
const REQUIRED_FIELD_COUNT = Object.keys(MISSING_FIELD_LABELS).length;

/** « le prénom », « le prénom et le nom », « le prénom, le nom et le titre professionnel ». */
function listMissing(missing: RequiredProfileField[]): string {
  const labels = missing.map((field) => MISSING_FIELD_LABELS[field]);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}` : (labels[0] ?? "");
}

function filledFields(profile: ProfileCompleteness): number {
  return profile.complete ? REQUIRED_FIELD_COUNT : REQUIRED_FIELD_COUNT - profile.missing.length;
}

const MONTH_SHORT = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: ADMIN_TIME_ZONE });
const MONTH_LONG = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: ADMIN_TIME_ZONE });

/** Mois `AAAA-MM` → libellés court (« juin ») et complet (« juin 2026 »). Milieu du mois : aucun effet de fuseau. */
function monthLabels({ month }: MonthCount) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1, 15, 12));
  return { label: MONTH_SHORT.format(date), fullLabel: MONTH_LONG.format(date) };
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * Accueil de l'administration : profil, chiffres, publications, répartition, articles à reprendre, projets récents.
 * Les cartes apparaissent l'une après l'autre (`admin-stagger`, 60 ms d'écart fixé par `--admin-order`, E61).
 */
export default async function AdminHomePage() {
  // Le layout vérifie déjà la session, mais il n'est pas rejoué à chaque
  // navigation côté client : chaque page la vérifie aussi (règle 6).
  await requireSession();
  const dashboard = await getDashboard();
  const { counts, pendingArticles, pendingArticlesTotal, profile, publishedByMonth, recentProjects } = dashboard;
  const projectsTotal = counts.projectsPublished + counts.projectsUnpublished;
  const articlesTotal = counts.articlesPublished + counts.articlesDraft;
  const publishedInPeriod = publishedByMonth.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="max-w-3xl">
          <h1 className="admin-page-title">Tableau de bord</h1>
          <p className="mt-3 text-muted">Ce qui demande votre attention, l’état du contenu et les raccourcis.</p>
        </div>
        <section aria-labelledby="quick-links-title" className="flex flex-col gap-2">
          <h2 id="quick-links-title" className="sr-only">
            Accès rapides
          </h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={NEW_ARTICLE_PATH} icon={FilePlus}>
              Nouvel article
            </ButtonLink>
            <ButtonLink href={NEW_PROJECT_PATH} variant="secondary" icon={FolderPlus}>
              Nouveau projet
            </ButtonLink>
            <ButtonLink href={NEW_EDUCATION_PATH} variant="secondary" icon={GraduationCap}>
              Nouvelle formation
            </ButtonLink>
            <ButtonLink href={PROFILE_PATH} variant="secondary" icon={UserPen}>
              Modifier le profil
            </ButtonLink>
          </div>
        </section>
      </div>

      {dashboard.empty ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <ProfileCard profile={profile} className="admin-stagger" />
          <EmptyState
            className="admin-stagger [--admin-order:1]"
            icon={LayoutDashboard}
            title="Aucun contenu pour l’instant"
            description="Il n’y a encore ni article, ni projet, ni formation, ni compétence, ni technologie. Commencez par l’un des accès rapides ci-dessus."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <ProfileCard profile={profile} className="admin-stagger" />
              <StatCard
                className="admin-stagger [--admin-order:1]"
                titleId="stat-articles"
                title="Articles publiés"
                value={counts.articlesPublished}
                icon={FileText}
                link={{ href: ARTICLES_PATH, label: "Voir les articles" }}
              >
                {plural(counts.articlesDraft, "brouillon", "brouillons")} ·{" "}
                {plural(counts.articlesPending, "article", "articles")} avec des modifications en attente
              </StatCard>
            </div>

            <section aria-labelledby="publications-title" className="admin-card admin-stagger flex flex-col gap-4 [--admin-order:2]">
              <div>
                <h2 id="publications-title" className="text-lg leading-snug">
                  Articles publiés par mois
                </h2>
                <p className="mt-3 text-5xl leading-none font-semibold tracking-tight tabular-nums">
                  {publishedInPeriod}
                </p>
                <p className="mt-2 text-muted">sur les six derniers mois, d’après la date de première publication</p>
              </div>
              <BarChart
                caption="Articles publiés pour la première fois, par mois, sur les six derniers mois"
                seriesLabel="Articles publiés"
                data={publishedByMonth.map((entry) => ({ key: entry.month, value: entry.count, ...monthLabels(entry) }))}
              />
            </section>

            <section
              aria-labelledby="repartition-title"
              className="admin-card admin-stagger flex flex-col gap-6 [--admin-order:3] lg:col-span-2 xl:col-span-1"
            >
              <h2 id="repartition-title" className="text-lg leading-snug">
                Répartition du contenu
              </h2>
              <DonutChart
                totalLabel="contenus"
                segments={[
                  { key: "articles", label: "Articles", value: articlesTotal, tone: "ink" },
                  { key: "projets", label: "Projets", value: projectsTotal, tone: "muted" },
                  { key: "formations", label: "Formations", value: counts.educations, tone: "chart-1" },
                  { key: "technologies", label: "Technologies", value: counts.technologies, tone: "chart-2" },
                ]}
              />
            </section>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              className="admin-stagger [--admin-order:4]"
              titleId="stat-projets"
              title="Projets"
              value={projectsTotal}
              icon={Briefcase}
              link={{ href: PROJECTS_PATH, label: "Gérer les projets" }}
            >
              {plural(counts.projectsPublished, "publié", "publiés")} ·{" "}
              {plural(counts.projectsUnpublished, "non publié", "non publiés")}
            </StatCard>
            <StatCard
              className="admin-stagger [--admin-order:5]"
              titleId="stat-formations"
              title="Formations"
              value={counts.educations}
              icon={GraduationCap}
              link={{ href: EDUCATIONS_PATH, label: "Gérer les formations" }}
            />
            <StatCard
              className="admin-stagger [--admin-order:6]"
              titleId="stat-competences"
              title="Compétences"
              value={counts.skills}
              icon={Wrench}
              link={{ href: SKILLS_PATH, label: "Gérer les compétences" }}
            />
            <StatCard
              className="admin-stagger [--admin-order:7]"
              titleId="stat-technologies"
              title="Technologies de la stack"
              value={counts.technologies}
              icon={Layers}
              link={{ href: STACK_PATH, label: "Gérer la stack" }}
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="pending-title" className="admin-card admin-stagger flex min-w-0 flex-col gap-5 px-0 [--admin-order:8] sm:px-0">
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 sm:px-7">
                <div>
                  <h2 id="pending-title" className="admin-section-title">
                    Articles à reprendre
                  </h2>
                  <p className="mt-1 text-muted">Brouillons et modifications en attente, les plus récemment modifiés d’abord.</p>
                </div>
                <ButtonLink href={ARTICLES_PATH} variant="secondary">
                  Tous les articles
                  <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
                </ButtonLink>
              </div>
              <DataTable
                surface="card"
                captionHidden
                caption={`Articles à reprendre, les plus récemment modifiés d’abord (${pendingArticles.length})`}
                rows={pendingArticles}
                getRowKey={(row) => row.id}
                empty={<p className="px-5 sm:px-7">Aucun brouillon ni modification en attente : tout est à jour.</p>}
                columns={[
                  {
                    key: "title",
                    header: "Article",
                    isRowHeader: true,
                    // Sous 768 px, le statut passe sous le titre (la colonne « Statut » est masquée) : le bouton reste entier à 390 px.
                    cell: (row) => (
                      <span className="flex flex-col gap-2">
                        <span className="font-medium [overflow-wrap:anywhere]">{row.title}</span>
                        <span className="md:hidden">
                          <ArticleStatus status={row.status} />
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: "updatedAt",
                    header: "Dernière modification",
                    hideBelow: "lg",
                    cell: (row) => <span className="whitespace-nowrap">{formatDayTime(row.updatedAt)}</span>,
                  },
                  {
                    key: "status",
                    header: "Statut",
                    hideBelow: "md",
                    cell: (row) => <ArticleStatus status={row.status} />,
                  },
                  {
                    key: "actions",
                    header: "Action",
                    align: "right",
                    cell: (row) => (
                      <Link
                        href={articlePath(row.id)}
                        className="inline-flex size-11 items-center justify-center rounded-full bg-panel transition-colors duration-150 hover:bg-line"
                      >
                        <Ellipsis aria-hidden="true" className="size-5" />
                        <span className="sr-only">Reprendre « {row.title} »</span>
                      </Link>
                    ),
                  },
                ]}
              />
              {pendingArticlesTotal > PENDING_ARTICLES_LIMIT ? (
                <p className="px-5 text-muted sm:px-7">
                  {pendingArticles.length} articles affichés sur {pendingArticlesTotal}.
                </p>
              ) : null}
            </section>

            <section aria-labelledby="recent-projects-title" className="admin-card admin-stagger flex flex-col gap-5 [--admin-order:9]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h2 id="recent-projects-title" className="admin-section-title">
                  Projets récents
                </h2>
                <Link href={PROJECTS_PATH} className="admin-link">
                  Tous les projets
                </Link>
              </div>
              {recentProjects.length === 0 ? (
                <p className="text-muted">Aucun projet pour l’instant.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recentProjects.map((project) => (
                    <li key={project.id} className="flex items-center gap-4 rounded-2xl bg-panel p-3">
                      {project.imagePath ? (
                        <Image
                          src={projectImageUrl(project.imagePath)}
                          alt=""
                          width={64}
                          height={64}
                          unoptimized
                          className="admin-thumb size-16 shrink-0 bg-card"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-card"
                        >
                          <ImageOff className="size-6 text-muted" />
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          href={projectPath(project.id)}
                          className="inline-flex min-h-11 items-center font-medium [overflow-wrap:anywhere] underline-offset-4 hover:underline"
                        >
                          {project.title}
                        </Link>
                        <p className="text-sm text-muted">
                          {project.technologies.length > 0 ? project.technologies.join(", ") : "Aucune technologie"}
                        </p>
                        <StatusBadge
                          status={project.isPublished ? "published" : "draft"}
                          label={project.isPublished ? "Publié" : "Non publié"}
                          className="self-start"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/** Complétude du profil : la place la plus visible du bloc de tête. */
function ProfileCard({ profile, className }: { profile: ProfileCompleteness; className?: string }) {
  return (
    <StatCard
      className={className}
      titleId="profile-title"
      title="Profil"
      value={
        <>
          {filledFields(profile)}
          <span className="text-muted">/{REQUIRED_FIELD_COUNT}</span>
        </>
      }
      badge={
        profile.complete ? (
          <ValueBadge tone="positive">Complet</ValueBadge>
        ) : (
          <ValueBadge tone="negative">Incomplet</ValueBadge>
        )
      }
      icon={UserRound}
      link={{ href: PROFILE_PATH, label: profile.complete ? "Voir le profil" : "Compléter le profil" }}
    >
      {profile.complete
        ? "Champs obligatoires renseignés : prénom, nom, e-mail de contact et titre professionnel."
        : `Il manque ${listMissing(profile.missing)}.`}
    </StatCard>
  );
}
