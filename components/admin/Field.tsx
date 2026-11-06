import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import {
    FieldError,
    FieldHint,
    FieldLabel,
    controlClasses,
    describedBy,
} from "./field-parts";

export type FieldProps = Omit<ComponentProps<"input">, "id"> & {
    label: string;
    id?: string;
    /** Aide affichée sous le libellé, reliée au champ par `aria-describedby`. */
    hint?: string;
    /** Message d'erreur (sans préfixe) : le champ passe en `aria-invalid`. */
    error?: string;
};

/** Champ de saisie sur une ligne, avec libellé, aide et erreur. */
export function Field({
    label,
    id,
    hint,
    error,
    required,
    type = "text",
    className,
    ...props
}: FieldProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const ids = describedBy(inputId, hint, error);

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <FieldLabel htmlFor={inputId} required={required}>
                {label}
            </FieldLabel>
            {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}
            <input
                {...props}
                id={inputId}
                type={type}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={ids.value}
                className={controlClasses(Boolean(error))}
            />
            {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
        </div>
    );
}
