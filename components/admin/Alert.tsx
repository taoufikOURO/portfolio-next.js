import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { TONES, type Tone } from "./tones";

/** Pastille blanche et ronde qui porte l'icône d'un message (Alert, Toast, bannière). */
export function ToneIcon({ tone }: { tone: Tone }) {
    const Icon = TONES[tone].icon;
    return (
        <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-panel"
        >
            <Icon className="size-5" />
        </span>
    );
}

/**
 * Message en ligne (succès, erreur, avertissement, information) : bloc de
 * 16 px de rayon, icône dans une pastille, libellé explicite en gras
 * (« Erreur : »…) puis le texte. La teinte du fond est décorative.
 * `role="alert"` pour les erreurs, `role="status"` pour le reste.
 * Apparition : fondu et glissement de 8 px, 250 ms (`admin-alert`, E61).
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
    const { label, surface } = TONES[tone];

    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn("admin-alert flex items-start gap-3 rounded-[var(--radius-alert)] p-4 text-ink", surface, className)}
        >
            <ToneIcon tone={tone} />
            <p className="min-w-0 flex-1 self-center">
                <strong className="font-semibold">{label} :</strong> {children}
            </p>
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Fermer le message"
                    className="-m-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 hover:bg-panel"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            ) : null}
        </div>
    );
}
