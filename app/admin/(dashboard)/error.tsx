"use client";

import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";

import { Button, ButtonLink } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

/**
 * Erreur imprévue dans une page de l'administration (rendue dans la coque).
 * Elle sert notamment de filet pour un envoi de fichier refusé par Next.js
 * (« Body exceeded 1 MB limit »), par exemple sans JavaScript, où le contrôle
 * avant envoi n'existe pas (E52). Le détail de l'erreur n'est jamais affiché.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div role="alert" className="flex flex-col gap-6">
            <h1 className="admin-page-title">Une erreur est survenue</h1>
            <EmptyState
                icon={TriangleAlert}
                title="L’opération n’a pas pu aboutir"
                description="Si vous envoyiez un fichier, vérifiez qu’il ne dépasse pas 1 Mo (formulaire compris), puis recommencez."
            >
                <Button onClick={reset} icon={RotateCcw}>
                    Réessayer
                </Button>
                <ButtonLink href={ADMIN_HOME_PATH} variant="secondary" icon={ArrowLeft}>
                    Retour au tableau de bord
                </ButtonLink>
            </EmptyState>
        </div>
    );
}
