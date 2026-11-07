import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert } from "@/components/admin/Alert";
import { getCurrentSession } from "@/lib/auth/require-session";
import { ADMIN_HOME_PATH, FORGOT_PASSWORD_PATH } from "@/lib/auth/routes";

import { linkResultMessage } from "../link-messages";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Déjà connecté : inutile de se reconnecter. La validité est vérifiée en
  // base (pas seulement la signature), sinon un cookie révoqué bouclerait.
  if (await getCurrentSession()) redirect(ADMIN_HOME_PATH);

  // Retour d'une réinitialisation réussie (`?resultat=mot-de-passe-reinitialise`).
  const success = linkResultMessage(await searchParams, ["mot-de-passe-reinitialise"]);

  return (
    <>
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-2 mb-6">Espace d’administration du portfolio.</p>
      {success ? (
        <Alert tone="success" className="mb-5">
          {success}
        </Alert>
      ) : null}
      <LoginForm />
      <p className="mt-6">
        <Link href={FORGOT_PASSWORD_PATH} className="font-semibold underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </>
  );
}
