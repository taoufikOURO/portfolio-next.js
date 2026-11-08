"use client";

import { RefreshCw } from "lucide-react";

import { SubmitButton } from "@/components/admin/SubmitButton";

/**
 * Bouton « Relancer la récupération » : composant client pour que l'icône
 * (fonction) ne passe pas d'un composant serveur à un composant client (E36).
 */
export function ResyncButton({ username }: { username: string }) {
  return (
    <SubmitButton variant="secondary" icon={RefreshCw} pendingLabel="Récupération en cours…">
      Relancer la récupération<span className="sr-only"> de « {username} »</span>
    </SubmitButton>
  );
}
