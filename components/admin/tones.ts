import {
    CircleAlert,
    CircleCheck,
    Info,
    TriangleAlert,
    type LucideIcon,
} from "lucide-react";

export type Tone = "success" | "error" | "warning" | "info";

/**
 * Tonalités des messages (Alert, Toast). Plan §3.3 :
 * - succès : texte bleu-gris sur crème, filet gauche sauge ;
 * - erreur : texte bleu-gris sur crème, filet gauche terracotta ;
 * - avertissement : texte bleu-gris sur sable ;
 * - information : texte bleu-gris sur crème, filet gauche bleu-gris.
 * Les filets sont décoratifs : le sens est porté par l'icône et le libellé.
 */
export const TONES = {
    success: {
        label: "Succès",
        icon: CircleCheck,
        surface: "bg-cream border-l-sage",
    },
    error: {
        label: "Erreur",
        icon: CircleAlert,
        surface: "bg-cream border-l-terracotta",
    },
    warning: {
        label: "Attention",
        icon: TriangleAlert,
        surface: "bg-sand border-l-slate-blue",
    },
    info: {
        label: "Information",
        icon: Info,
        surface: "bg-cream border-l-slate-blue",
    },
} as const satisfies Record<
    Tone,
    { label: string; icon: LucideIcon; surface: string }
>;
