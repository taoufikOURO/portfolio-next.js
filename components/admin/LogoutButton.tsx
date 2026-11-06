"use client";

import { LogOut } from "lucide-react";
import { SubmitButton } from "./SubmitButton";

/**
 * Bouton « Se déconnecter », à placer dans un `<form action={logout}>`.
 * Composant client : l'icône (une fonction) ne peut pas être passée à
 * `SubmitButton` depuis un composant serveur (E36).
 */
export function LogoutButton() {
    return (
        <SubmitButton variant="secondary" icon={LogOut} pendingLabel="Déconnexion en cours…">
            Se déconnecter
        </SubmitButton>
    );
}
