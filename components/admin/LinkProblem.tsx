import { RotateCcw } from "lucide-react";

import { Alert } from "./Alert";
import { ButtonLink } from "./Button";

/**
 * Lien par e-mail refusé (invalide, expiré, déjà utilisé) : message explicite
 * et bouton vers la page qui permet d'en obtenir un nouveau. Composant
 * serveur : l'icône est choisie ici, pas passée en propriété (E36).
 */
export function LinkProblem({
    message,
    actionHref,
    actionLabel,
}: {
    message: string;
    actionHref: string;
    actionLabel: string;
}) {
    return (
        <div className="flex flex-col gap-5">
            <Alert tone="error">{message}</Alert>
            <ButtonLink href={actionHref} variant="secondary" icon={RotateCcw} className="self-start">
                {actionLabel}
            </ButtonLink>
        </div>
    );
}
