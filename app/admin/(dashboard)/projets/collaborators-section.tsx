import Image from "next/image";
import { UserRound } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import type { Collaborator } from "@/lib/projects";

import { resyncCollaboratorAction } from "./actions";
import { ResyncButton } from "./resync-button";

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

function Avatar({ collaborator }: { collaborator: Collaborator }) {
  if (!collaborator.avatarUrl) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-slate-blue">
        <UserRound aria-hidden="true" className="size-6" />
      </span>
    );
  }
  // Avatar hébergé par GitHub (adresse vérifiée par `lib/github.ts`) ; décoratif : le nom est à côté.
  return (
    <Image
      src={collaborator.avatarUrl}
      alt=""
      width={48}
      height={48}
      unoptimized
      className="size-12 shrink-0 rounded-full border border-slate-blue/25"
    />
  );
}

/**
 * Collaborateurs d'un projet, tels qu'enregistrés. Un collaborateur dont le
 * profil n'a pas pu être récupéré affiche un avertissement avec la raison.
 * « Relancer la récupération » (formulaire simple, sans JavaScript) est le
 * seul moyen de mettre à jour un collaborateur déjà connu, partagé entre
 * plusieurs projets.
 */
export function CollaboratorsSection({ projectId, collaborators }: { projectId: string; collaborators: Collaborator[] }) {
  return (
    <section aria-labelledby="projet-collaborateurs-titre" className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
      <h2 id="projet-collaborateurs-titre" className="text-xl font-bold">
        Collaborateurs
      </h2>
      <p className="mt-2 text-sm">
        La liste se modifie dans le formulaire ci-dessus. Un collaborateur est partagé entre les projets : son profil
        GitHub n’est mis à jour que par « Relancer la récupération ».
      </p>
      {collaborators.length === 0 ? (
        <p className="mt-4">Aucun collaborateur.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {collaborators.map((collaborator) => (
            <li key={collaborator.id} className="flex flex-col gap-3 border-t border-slate-blue/25 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-3">
                <Avatar collaborator={collaborator} />
                <div className="min-w-0">
                  <p className="font-semibold break-words">{collaborator.name ?? collaborator.githubUsername}</p>
                  <p className="text-sm break-all">
                    {collaborator.profileUrl ? (
                      <a href={collaborator.profileUrl} className="underline" rel="noopener noreferrer" target="_blank">
                        @{collaborator.githubUsername}
                        <span className="sr-only"> (profil GitHub, nouvel onglet)</span>
                      </a>
                    ) : (
                      <>@{collaborator.githubUsername}</>
                    )}
                  </p>
                  {collaborator.syncedAt ? (
                    <p className="text-sm">Profil récupéré le {DATE_FORMAT.format(collaborator.syncedAt)}.</p>
                  ) : null}
                </div>
              </div>
              {collaborator.syncError ? (
                <Alert tone="warning">
                  {collaborator.syncedAt
                    ? "La dernière récupération a échoué ; les informations affichées datent de la précédente. "
                    : "Profil GitHub non récupéré : seul le nom d’utilisateur est enregistré. "}
                  {collaborator.syncError}
                </Alert>
              ) : null}
              <form action={resyncCollaboratorAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="collaboratorId" value={collaborator.id} />
                <ResyncButton username={collaborator.githubUsername} />
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
