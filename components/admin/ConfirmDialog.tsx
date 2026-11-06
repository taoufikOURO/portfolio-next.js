"use client";

import { useId, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "./Button";
import { useModalDialog } from "./use-modal-dialog";

export type ConfirmDialogProps = {
    open: boolean;
    /** Appelé à la fermeture : Annuler, Échap ou clic sur le fond. */
    onClose: () => void;
    /**
     * Appelé au clic sur le bouton de confirmation. Si la fonction renvoie une
     * promesse, le dialogue affiche « en cours » jusqu'à sa résolution. Il
     * reste ouvert : c'est à l'appelant de passer `open` à `false`.
     */
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    /** `destructive` : suppression ou perte de données (bouton terracotta, focus initial sur « Annuler »). */
    tone?: "default" | "destructive";
    /** Libellé du bouton de confirmation pendant l'action. */
    pendingLabel?: string;
};

/**
 * Dialogue de confirmation modal (suppression, publication, abandon des
 * modifications…). Focus piégé, Échap pour fermer, focus rendu au déclencheur,
 * focus initial sur « Annuler » pour éviter une confirmation par réflexe.
 * Le panneau a une bordure bleu-gris de 2 px sur fond crème.
 */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel = "Annuler",
    tone = "default",
    pendingLabel = "En cours…",
}: ConfirmDialogProps) {
    const titleId = useId();
    const descriptionId = useId();
    const [pending, setPending] = useState(false);
    const { ref, onKeyDown, onMouseDown } = useModalDialog({ open, onClose });

    async function confirm() {
        if (pending) return;
        setPending(true);
        try {
            await onConfirm();
        } finally {
            setPending(false);
        }
    }

    return (
        <dialog
            ref={ref}
            role={tone === "destructive" ? "alertdialog" : undefined}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            onKeyDown={onKeyDown}
            onMouseDown={onMouseDown}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border-2 border-slate-blue bg-cream p-0 text-slate-blue backdrop:bg-slate-blue/70"
        >
            <div className="flex flex-col gap-4 p-6">
                <h2 id={titleId} className="text-xl font-bold">
                    {title}
                </h2>
                {description ? (
                    <div id={descriptionId}>{description}</div>
                ) : null}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={onClose} data-autofocus>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={tone === "destructive" ? "destructive" : "primary"}
                        onClick={confirm}
                        aria-disabled={pending || undefined}
                    >
                        {pending ? (
                            <>
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="size-5 shrink-0 motion-safe:animate-spin"
                                />
                                {pendingLabel}
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </div>
                <span role="status" className="sr-only">
                    {pending ? pendingLabel : ""}
                </span>
            </div>
        </dialog>
    );
}
