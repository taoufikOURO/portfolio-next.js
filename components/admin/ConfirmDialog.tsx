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
    /** `destructive` : suppression ou perte de données (bouton corail, focus initial sur « Annuler »). */
    tone?: "default" | "destructive";
    /** Libellé du bouton de confirmation pendant l'action. */
    pendingLabel?: string;
};

/**
 * Dialogue de confirmation modal (suppression, publication, abandon des
 * modifications…). Focus piégé, Échap pour fermer, focus rendu au déclencheur,
 * focus initial sur « Annuler » pour éviter une confirmation par réflexe.
 * Étape 18 (E60) : panneau blanc, rayon 24 px, ombre douce, voile gris foncé à
 * 40 % ; boutons pilule (secondaire « Annuler », principal ou destructif).
 * Ouverture (E61) : voile en fondu, panneau en fondu avec échelle de 0,96 à 1,
 * 200 ms (`admin-dialog`, admin.css).
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
            className="admin-dialog m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-dialog)] border-0 bg-panel p-0 text-ink shadow-dialog backdrop:bg-ink/40"
        >
            <div className="flex flex-col gap-4 p-6 sm:p-7">
                <h2 id={titleId} className="admin-section-title">
                    {title}
                </h2>
                {description ? (
                    <div id={descriptionId} className="text-muted">{description}</div>
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
                                    className="size-5 shrink-0"
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
