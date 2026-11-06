// Page provisoire (étape 2). Remplacée par le tableau de bord à l’étape 15.
import { requireSession } from "@/lib/auth/require-session";

export default async function AdminHomePage() {
    // Le layout vérifie déjà la session, mais il n'est pas rejoué à chaque
    // navigation côté client : chaque page la vérifie aussi (règle 6).
    await requireSession();

    return (
        <div className="max-w-3xl">
            <h1 className="text-3xl font-bold">Administration</h1>
            <p className="mt-4">L’espace d’administration est en construction.</p>
        </div>
    );
}
