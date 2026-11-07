import type { Metadata } from "next";

import { LinkProblem } from "@/components/admin/LinkProblem";
import { inspectLink } from "@/lib/auth/account";
import { FORGOT_PASSWORD_PATH } from "@/lib/auth/routes";

import { LINK_FAILURE_MESSAGES, tokenFromSearchParams } from "../link-messages";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  // Le jeton est dans l'URL : il ne doit pas partir dans l'en-tête Referer.
  referrer: "no-referrer",
};

/**
 * Page du lien de réinitialisation (publique). Ouvrir le lien ne le consomme
 * pas : seul l'envoi du formulaire l'utilise.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = tokenFromSearchParams(await searchParams);
  const check = await inspectLink("PASSWORD_RESET", token);

  return (
    <>
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      {check.status === "valid" && token ? (
        <>
          <p className="mt-2 mb-6">
            Choisissez un nouveau mot de passe. Toutes les sessions ouvertes seront ensuite fermées.
          </p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div className="mt-6">
          <LinkProblem
            message={LINK_FAILURE_MESSAGES[check.status === "valid" ? "invalid" : check.status]}
            actionHref={FORGOT_PASSWORD_PATH}
            actionLabel="Demander un nouveau lien"
          />
        </div>
      )}
    </>
  );
}
