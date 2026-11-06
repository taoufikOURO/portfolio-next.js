import { Clock, FilePen } from "lucide-react";
import { cn } from "@/lib/cn";

export type Status = "draft" | "pending" | "published";

const LABELS: Record<Status, string> = {
    draft: "Brouillon",
    pending: "Modifications en attente",
    published: "Publié",
};

/**
 * Plan §3.3 :
 * - brouillon, modifications en attente : texte bleu-gris sur sable (6,63) + icône ;
 * - publié : texte crème sur bleu-gris (8,87) + pastille vert sauge (4,21, non textuelle).
 * Le statut est toujours écrit en toutes lettres : la couleur ne porte jamais seule le sens.
 */
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
    const text = label ?? LABELS[status];
    const base =
        "inline-flex items-center gap-1.5 rounded-md border border-slate-blue px-2 py-0.5 text-sm font-semibold";

    if (status === "published") {
        return (
            <span className={cn(base, "bg-slate-blue text-cream", className)}>
                <span aria-hidden="true" className="size-2.5 rounded-full bg-sage" />
                {text}
            </span>
        );
    }

    const Icon = status === "draft" ? FilePen : Clock;
    return (
        <span className={cn(base, "bg-sand text-slate-blue", className)}>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {text}
        </span>
    );
}
