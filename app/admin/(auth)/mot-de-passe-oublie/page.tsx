import type { Metadata } from "next";
import Link from "next/link";

import { ADMIN_LOGIN_PATH } from "@/lib/auth/routes";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

/** Page publique (sans session) : demande d'un lien de réinitialisation. */
export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
      <p className="mt-2 mb-6">
        Saisissez l’adresse e-mail du compte. Si elle est reconnue, vous recevrez un lien pour
        choisir un nouveau mot de passe.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6">
        <Link href={ADMIN_LOGIN_PATH} className="font-semibold underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
