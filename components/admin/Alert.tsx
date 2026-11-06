import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { TONES, type Tone } from "./tones";

/**
 * Message en ligne (succès, erreur, avertissement, information).
 * Icône + libellé explicite (« Erreur : »…) : la couleur du filet est décorative.
 * `role="alert"` pour les erreurs, `role="status"` pour le reste.
 */
export function Alert({
    tone = "info",
    children,
    onDismiss,
    className,
}: {
    tone?: Tone;
    children: ReactNode;
    /** Affiche un bouton « Fermer ». */
    onDismiss?: () => void;
    className?: string;
}) {
    const { label, icon: Icon, surface } = TONES[tone];

    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "flex items-start gap-3 rounded-md border border-l-8 border-slate-blue/25 p-4 text-slate-blue",
                surface,
                className,
            )}
        >
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p className="min-w-0 flex-1">
                <strong>{label} :</strong> {children}
            </p>
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Fermer le message"
                    className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            ) : null}
        </div>
    );
}
