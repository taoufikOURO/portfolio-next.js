// PAGE DE DÉMONSTRATION TEMPORAIRE (étape 5).
// À supprimer à l'étape 15, ou dès que les vraies sections existent
// (dossier `app/admin/demo/` entier).
import { notFound } from "next/navigation";
import { DemoShell } from "./demo-shell";

// Lu à chaque requête : la garde ci-dessous dépend de l'environnement d'exécution.
export const dynamic = "force-dynamic";

export default function DemoLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    // Pas de session avant l'étape 7 : la démonstration n'est jamais servie en production.
    if (process.env.APP_ENV === "production") notFound();
    return <DemoShell>{children}</DemoShell>;
}
