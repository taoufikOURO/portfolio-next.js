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
        <label htmlFor={htmlFor} className="font-semibold">
            {children}
            {required ? <span aria-hidden="true"> *</span> : null}
        </label>
    );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
    return (
        <p id={id} className="text-sm">
            {children}
        </p>
    );
}

/** Erreur liée à un champ : icône + préfixe « Erreur : », jamais la couleur seule. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
    return (
        <p id={id} className="flex items-start gap-2 text-sm font-semibold">
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
 * Styles d'une zone de saisie : bordure bleu-gris sur crème (8,87).
 * En erreur, la bordure passe à 2 px (le padding compense pour ne pas décaler
 * la mise en page) ; le message d'erreur et `aria-invalid` complètent.
 */
export function controlClasses(invalid: boolean) {
    return cn(
        "block w-full min-h-11 rounded-md border-slate-blue bg-cream text-slate-blue",
        "placeholder:italic placeholder:text-slate-blue",
        "disabled:cursor-not-allowed disabled:border-dashed",
        invalid
            ? "border-2 px-[calc(0.75rem-1px)] py-[calc(0.5rem-1px)]"
            : "border px-3 py-2",
    );
}
