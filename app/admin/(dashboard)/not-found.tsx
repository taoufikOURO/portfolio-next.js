import { ArrowLeft, SearchX } from "lucide-react";

import { ButtonLink } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

/** Page introuvable dans l'administration (rendue dans la coque, session déjà vérifiée). */
export default function AdminNotFound() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="admin-page-title">Page introuvable</h1>
            <EmptyState
                icon={SearchX}
                title="Cette page n’existe pas"
                description="L’adresse ne correspond à aucune page de l’administration."
            >
                <ButtonLink href={ADMIN_HOME_PATH} icon={ArrowLeft}>
                    Retour au tableau de bord
                </ButtonLink>
            </EmptyState>
        </div>
    );
}
