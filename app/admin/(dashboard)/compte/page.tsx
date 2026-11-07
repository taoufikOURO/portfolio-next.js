import type { Metadata } from "next";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { getPendingEmailChange } from "@/lib/auth/account";
import { requireSession } from "@/lib/auth/require-session";
import { listActiveSessions } from "@/lib/auth/session";

import { EmailChangeForm } from "./email-change-form";
import { formatDateTime } from "./format";
import { PasswordChangeForm } from "./password-change-form";
import { RevokeSessionsForm } from "./revoke-sessions-form";

export const metadata: Metadata = {
  title: "Compte",
};

const USER_AGENT_DISPLAY_LENGTH = 120;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-md border border-slate-blue/25 p-4 sm:p-6">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  );
}

/** Paramètres du compte : adresse e-mail, mot de passe, sessions ouvertes. */
export default async function AccountPage() {
  const session = await requireSession();
  const [pendingChange, sessions] = await Promise.all([
    getPendingEmailChange(session.adminId, session.email),
    listActiveSessions(session.adminId),
  ]);
  const otherSessions = sessions.filter((item) => item.id !== session.id);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Compte</h1>
        <p className="mt-2">Adresse e-mail, mot de passe et sessions ouvertes du compte d’administration.</p>
      </div>

      <Section id="compte-adresse" title="Adresse e-mail">
        <div className="flex flex-wrap items-center gap-3">
          <p>
            Adresse actuelle : <strong className="break-all">{session.email}</strong>
          </p>
          {session.emailVerifiedAt ? (
            <StatusBadge status="published" label="Validée" />
          ) : (
            <StatusBadge status="pending" label="Non validée" />
          )}
        </div>
        {pendingChange ? (
          <p className="rounded-md border border-l-8 border-slate-blue/25 border-l-slate-blue bg-sand p-4">
            <strong>Changement en attente :</strong> un lien a été envoyé à{" "}
            <strong className="break-all">{pendingChange.targetEmail}</strong>. L’adresse du compte ne
            changera qu’après un clic sur ce lien, valable jusqu’au {formatDateTime(pendingChange.expiresAt)}.
            Une nouvelle demande remplace celle-ci.
          </p>
        ) : null}
        <EmailChangeForm />
      </Section>

      <Section id="compte-mot-de-passe" title="Mot de passe">
        <p>Après le changement, les autres sessions sont fermées ; celle-ci reste ouverte.</p>
        <PasswordChangeForm email={session.email} />
      </Section>

      <Section id="compte-sessions" title="Sessions ouvertes">
        <ul className="flex flex-col gap-3">
          {sessions.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-blue/25 p-3">
              <p className="font-semibold">
                {item.id === session.id ? "Cette session" : "Autre session"}
              </p>
              <p className="text-sm">
                Ouverte le {formatDateTime(item.createdAt)} · dernière activité le{" "}
                {formatDateTime(item.lastSeenAt)}
              </p>
              {item.userAgent ? (
                <p className="text-sm break-all">
                  Navigateur : {item.userAgent.slice(0, USER_AGENT_DISPLAY_LENGTH)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <RevokeSessionsForm otherSessionCount={otherSessions.length} />
      </Section>
    </div>
  );
}
