import { ButtonLink } from "@/components/admin/Button";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

/** Page introuvable dans l'administration (rendue dans la coque, session déjà vérifiée). */
export default function AdminNotFound() {
    return (
        <div className="flex max-w-3xl flex-col items-start gap-4">
            <h1 className="text-3xl font-bold">Page introuvable</h1>
            <p>Cette page n’existe pas dans l’administration.</p>
            <ButtonLink href={ADMIN_HOME_PATH} variant="secondary">
                Retour au tableau de bord
            </ButtonLink>
        </div>
    );
}
