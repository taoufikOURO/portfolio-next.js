import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/require-session";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage() {
  // Déjà connecté : inutile de se reconnecter. La validité est vérifiée en
  // base (pas seulement la signature), sinon un cookie révoqué bouclerait.
  if (await getCurrentSession()) redirect(ADMIN_HOME_PATH);

  return (
    <>
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-2 mb-6">Espace d’administration du portfolio.</p>
      <LoginForm />
    </>
  );
}
