import {
    CircleAlert,
    CircleCheck,
    Info,
    TriangleAlert,
    type LucideIcon,
} from "lucide-react";

export type Tone = "success" | "error" | "warning" | "info";

/**
 * Tonalités des messages (Alert, Toast, bannière), étape 18 (E60) :
 * fond teinté, texte noir (au moins 15,3), icône dans une pastille blanche,
 * libellé explicite en gras. Le sens n'est jamais porté par la couleur seule.
 * - succès : fond vert pâle ;
 * - erreur : fond corail pâle ;
 * - avertissement : fond vert anis pâle ;
 * - information : fond bleu pâle.
 */
export const TONES = {
    success: {
        label: "Succès",
        icon: CircleCheck,
        surface: "bg-done-bg",
    },
    error: {
        label: "Erreur",
        icon: CircleAlert,
        surface: "bg-waiting-bg",
    },
    warning: {
        label: "Attention",
        icon: TriangleAlert,
        surface: "bg-lime-soft",
    },
    info: {
        label: "Information",
        icon: Info,
        surface: "bg-progress-bg",
    },
} as const satisfies Record<
    Tone,
    { label: string; icon: LucideIcon; surface: string }
>;
