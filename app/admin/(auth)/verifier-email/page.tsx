import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { LinkProblem } from "@/components/admin/LinkProblem";
import { inspectLink } from "@/lib/auth/account";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

import { LINK_FAILURE_MESSAGES, linkResultMessage, tokenFromSearchParams } from "../link-messages";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = {
  title: "Validation de l’adresse e-mail",
  // Le jeton est dans l'URL : il ne doit pas partir dans l'en-tête Referer.
  referrer: "no-referrer",
};

/**
 * Page du lien de validation (publique : le lien peut être ouvert sur un
 * appareil où personne n'est connecté). Ouvrir le lien ne le consomme pas :
 * un logiciel qui pré-ouvre les liens d'un e-mail ne valide donc rien (E47).
 * La validation se fait par le bouton ; l'action redirige ensuite ici avec
 * `?resultat=…`, sans jeton.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = tokenFromSearchParams(params);
  const success = token ? undefined : linkResultMessage(params, ["adresse-validee", "adresse-modifiee"]);

  if (success) {
    return (
      <>
        <h1 className="text-2xl font-bold">Validation de l’adresse e-mail</h1>
        <div className="mt-6 flex flex-col gap-5">
          <Alert tone="success">{success}</Alert>
          <ButtonLink href={ADMIN_HOME_PATH} icon={ArrowRight} className="self-start">
            Aller à l’administration
          </ButtonLink>
        </div>
      </>
    );
  }

  const check = await inspectLink("EMAIL_VERIFICATION", token);

  return (
    <>
      <h1 className="text-2xl font-bold">Validation de l’adresse e-mail</h1>
      {check.status === "valid" && token && check.token.targetEmail ? (
        <VerifyEmailForm token={token} email={check.token.targetEmail} />
      ) : (
        <div className="mt-6">
          <LinkProblem
            message={LINK_FAILURE_MESSAGES[check.status === "valid" ? "invalid" : check.status]}
            actionHref={ADMIN_HOME_PATH}
            actionLabel="Aller à l’administration"
          />
          <p className="mt-4">
            Un nouveau lien se demande depuis l’administration, une fois connecté (bannière en
            haut des pages ou page « Compte »).
          </p>
        </div>
      )}
    </>
  );
}
