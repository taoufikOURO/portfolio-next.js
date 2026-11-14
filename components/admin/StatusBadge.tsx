import { cn } from "@/lib/cn";

export type Status = "draft" | "pending" | "published";

const LABELS: Record<Status, string> = {
    draft: "Brouillon",
    pending: "Modifications en attente",
    published: "Publié",
};

/**
 * Pilule de statut, une seule forme pour tous les statuts de l'admin (étape 18, E60) :
 * - publié : vert (texte #137a3e sur #d9f5e3, 4,67) ;
 * - brouillon : bleu (texte #2a4bd7 sur #dde6ff, 5,46) ;
 * - modifications en attente : rouge (texte #b42318 sur #fde3df, 5,39).
 * Le statut est toujours écrit en toutes lettres : la couleur ne porte jamais seule le sens.
 */
const TONES: Record<Status, string> = {
    published: "bg-done-bg text-done-ink",
    draft: "bg-progress-bg text-progress-ink",
    pending: "bg-waiting-bg text-waiting-ink",
};

export function StatusBadge({
    status,
    label,
    className,
}: {
    status: Status;
    /** Remplace le libellé par défaut (ex. « Non publié »). */
    label?: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm leading-tight font-medium",
                TONES[status],
                className,
            )}
        >
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
            {label ?? LABELS[status]}
        </span>
    );
}
