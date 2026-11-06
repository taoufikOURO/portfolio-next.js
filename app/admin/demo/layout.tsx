// PAGE DE DÉMONSTRATION TEMPORAIRE (étape 5).
// À supprimer à l'étape 15, ou dès que les vraies sections existent
// (dossier `app/admin/demo/` entier).
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { DemoShell } from "./demo-shell";

// Lu à chaque requête : la garde ci-dessous dépend de l'environnement d'exécution.
export const dynamic = "force-dynamic";

export default async function DemoLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    // Jamais servie en production ; en développement, réservée à une session valide (étape 7).
    if (process.env.APP_ENV === "production") notFound();
    await requireSession();
    return <DemoShell>{children}</DemoShell>;
}
