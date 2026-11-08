"use client";

import { Button, ButtonLink } from "@/components/admin/Button";
import { ADMIN_HOME_PATH } from "@/lib/auth/routes";

/**
 * Erreur imprévue dans une page de l'administration (rendue dans la coque).
 * Elle sert notamment de filet pour un envoi de fichier refusé par Next.js
 * (« Body exceeded 1 MB limit »), par exemple sans JavaScript, où le contrôle
 * avant envoi n'existe pas (E52). Le détail de l'erreur n'est jamais affiché.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div role="alert" className="flex max-w-3xl flex-col items-start gap-4">
            <h1 className="text-3xl font-bold">Une erreur est survenue</h1>
            <p>
                L’opération n’a pas pu aboutir. Si vous envoyiez un fichier, vérifiez qu’il ne dépasse pas 1 Mo (formulaire compris), puis
                recommencez.
            </p>
            <div className="flex flex-wrap gap-3">
                <Button onClick={reset}>Réessayer</Button>
                <ButtonLink href={ADMIN_HOME_PATH} variant="secondary">
                    Retour au tableau de bord
                </ButtonLink>
            </div>
        </div>
    );
}
