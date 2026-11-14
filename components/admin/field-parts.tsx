import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Éléments communs des champs de formulaire (Field, TextArea, Select,
 * FileField, MultiSelect) : libellé, aide, message d'erreur et styles.
 */

export function FieldLabel({
    htmlFor,
    required,
    children,
}: {
    htmlFor: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label htmlFor={htmlFor} className="font-medium">
            {children}
            {required ? <span aria-hidden="true"> *</span> : null}
        </label>
    );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
    return (
        <p id={id} className="text-sm text-muted">
            {children}
        </p>
    );
}

/**
 * Erreur liée à un champ : icône + préfixe « Erreur : », jamais la couleur seule.
 * Texte rouge foncé #b42318 (6,57 sur blanc, 6,08 sur carte) : le corail de la
 * capture échoue en texte (2,86).
 */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
    return (
        <p id={id} className="flex items-start gap-2 text-sm font-medium text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Erreur : {children}</span>
        </p>
    );
}

/** Identifiants des éléments d'aide et d'erreur reliés au champ par `aria-describedby`. */
export function describedBy(baseId: string, hint?: string, error?: string) {
    const hintId = hint ? `${baseId}-hint` : undefined;
    const errorId = error ? `${baseId}-error` : undefined;
    return {
        hintId,
        errorId,
        value: cn(hintId, errorId) || undefined,
    };
}

/**
 * Apparition du contour et de l'anneau de focus en 150 ms (E61) : l'anneau
 * existe toujours, transparent, et prend la couleur noire au focus (transition
 * de couleur seulement, aucun déplacement). Partagé par tous les champs.
 */
export const FOCUS_FADE =
    "outline-2 outline-offset-2 outline-transparent transition-[border-color,outline-color] duration-150 ease-out focus-visible:outline-ink";

/**
 * Styles d'une zone de saisie (étape 18, E60 ; E61) : fond blanc, bordure grise
 * `field-line` #8a8d93 (3,33 sur blanc, 3,08 sur carte), rayon 14 px ; au focus,
 * anneau noir et bordure noire, qui apparaissent en 150 ms. En erreur, bordure
 * rouge foncé de 2 px (le padding compense pour ne pas décaler la mise en page) ;
 * le message d'erreur et `aria-invalid` complètent.
 */
export function controlClasses(invalid: boolean) {
    return cn(
        "block w-full min-h-11 rounded-[var(--radius-field)] bg-panel text-ink",
        FOCUS_FADE,
        "placeholder:text-muted focus:border-ink",
        "disabled:cursor-not-allowed disabled:bg-card disabled:text-muted",
        invalid
            ? "border-2 border-danger px-[calc(1rem-1px)] py-[calc(0.5rem-1px)]"
            : "border border-field-line px-4 py-2",
    );
}
