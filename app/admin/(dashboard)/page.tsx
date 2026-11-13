import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus, FolderPlus, GraduationCap, LayoutDashboard, Pencil, UserPen } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { requireSession } from "@/lib/auth/require-session";
import { getDashboard, PENDING_ARTICLES_LIMIT, type DashboardCounts, type RequiredProfileField } from "@/lib/dashboard";
import { formatDayTime } from "@/lib/validation/article";

import { ArticleStatus } from "./articles/article-status";
import { articlePath, ARTICLES_PATH, NEW_ARTICLE_PATH } from "./articles/routes";
import { NEW_EDUCATION_PATH } from "./formations/routes";
import { PROFILE_PATH } from "./profil/routes";
import { NEW_PROJECT_PATH } from "./projets/routes";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

const MISSING_FIELD_LABELS: Record<RequiredProfileField, string> = {
  firstName: "le prénom",
  lastName: "le nom",
  email: "l’adresse e-mail de contact",
  jobTitle: "le titre professionnel",
};

/** « le prénom », « le prénom et le nom », « le prénom, le nom et le titre professionnel ». */
function listMissing(missing: RequiredProfileField[]): string {
  const labels = missing.map((field) => MISSING_FIELD_LABELS[field]);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}` : (labels[0] ?? "");
}

function counterGroups(counts: DashboardCounts): { title: string; items: { label: string; value: number }[] }[] {
  return [
    {
      title: "Articles",
      items: [
        { label: "Articles publiés", value: counts.articlesPublished },
        { label: "Brouillons", value: counts.articlesDraft },
        { label: "Modifications en attente", value: counts.articlesPending },
      ],
    },
    {
      title: "Projets",
      items: [
        { label: "Projets publiés", value: counts.projectsPublished },
        { label: "Projets non publiés", value: counts.projectsUnpublished },
      ],
    },
    {
      title: "Parcours et compétences",
      items: [
        { label: "Formations", value: counts.educations },
        { label: "Compétences", value: counts.skills },
        { label: "Technologies de la stack", value: counts.technologies },
      ],
    },
  ];
}

/** Accueil de l'administration : articles à reprendre, compteurs, état du profil, accès rapides. */
export default async function AdminHomePage() {
  // Le layout vérifie déjà la session, mais il n'est pas rejoué à chaque
  // navigation côté client : chaque page la vérifie aussi (règle 6).
  await requireSession();
  const dashboard = await getDashboard();
  const { counts, pendingArticles, pendingArticlesTotal, profile } = dashboard;

  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="mt-2">Ce qui demande votre attention, l’état du contenu et les raccourcis.</p>
      </div>

      <section aria-labelledby="quick-links-title" className="flex flex-col gap-4">
        <h2 id="quick-links-title" className="text-2xl font-bold">
          Accès rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={NEW_ARTICLE_PATH} icon={FilePlus}>
            Nouvel article
          </ButtonLink>
          <ButtonLink href={NEW_PROJECT_PATH} icon={FolderPlus}>
            Nouveau projet
          </ButtonLink>
          <ButtonLink href={NEW_EDUCATION_PATH} icon={GraduationCap}>
            Nouvelle formation
          </ButtonLink>
          <ButtonLink href={PROFILE_PATH} icon={UserPen}>
            Modifier le profil
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="profile-title" className="flex flex-col gap-4">
        <h2 id="profile-title" className="text-2xl font-bold">
          Profil
        </h2>
        {profile.complete ? (
          <Alert tone="success">Le profil est complet.</Alert>
        ) : (
          <Alert tone="warning">
            Le profil est incomplet : il manque {listMissing(profile.missing)}.{" "}
            <Link href={PROFILE_PATH} className="underline">
              Compléter le profil
            </Link>
          </Alert>
        )}
      </section>

      {dashboard.empty ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Aucun contenu pour l’instant"
          description="Il n’y a encore ni article, ni projet, ni formation, ni compétence, ni technologie. Commencez par l’un des accès rapides ci-dessus."
        />
      ) : (
        <>
          <section aria-labelledby="pending-title" className="flex flex-col gap-4">
            <h2 id="pending-title" className="text-2xl font-bold">
              Brouillons et modifications en attente
            </h2>
            <DataTable
              caption={`Articles à reprendre, les plus récemment modifiés d’abord (${pendingArticles.length})`}
              rows={pendingArticles}
              getRowKey={(row) => row.id}
              empty={<p>Aucun brouillon ni modification en attente : tout est à jour.</p>}
              columns={[
                {
                  key: "title",
                  header: "Article",
                  isRowHeader: true,
                  // Sous 768 px, le statut passe sous le titre (la colonne « Statut » est masquée) : le bouton « Reprendre » reste entier à 390 px.
                  cell: (row) => (
                    <span className="flex flex-col gap-2">
                      <span className="font-semibold break-words">{row.title}</span>
                      <span className="md:hidden">
                        <ArticleStatus status={row.status} />
                      </span>
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Statut",
                  hideBelow: "md",
                  cell: (row) => <ArticleStatus status={row.status} />,
                },
                {
                  key: "updatedAt",
                  header: "Dernière modification",
                  hideBelow: "lg",
                  cell: (row) => <span>{formatDayTime(row.updatedAt)}</span>,
                },
                {
                  key: "actions",
                  header: "Action",
                  cell: (row) => (
                    <ButtonLink href={articlePath(row.id)} variant="secondary" icon={Pencil}>
                      Reprendre<span className="sr-only"> « {row.title} »</span>
                    </ButtonLink>
                  ),
                },
              ]}
            />
            {pendingArticlesTotal > PENDING_ARTICLES_LIMIT ? (
              <p>
                {pendingArticles.length} articles affichés sur {pendingArticlesTotal}.
              </p>
            ) : null}
            <p>
              <Link href={ARTICLES_PATH} className="underline">
                Voir tous les articles
              </Link>
            </p>
          </section>

          <section aria-labelledby="counters-title" className="flex flex-col gap-4">
            <h2 id="counters-title" className="text-2xl font-bold">
              Contenu
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {counterGroups(counts).map((group) => (
                <div key={group.title} className="rounded-md border-2 border-slate-blue p-4">
                  <h3 className="text-lg font-bold">{group.title}</h3>
                  <dl className="mt-3 flex flex-col gap-2">
                    {group.items.map((item) => (
                      <div key={item.label} className="flex items-baseline justify-between gap-4">
                        <dt>{item.label}</dt>
                        <dd className="text-2xl font-bold">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
