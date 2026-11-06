import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import {
    FieldError,
    FieldHint,
    FieldLabel,
    controlClasses,
    describedBy,
} from "./field-parts";

export type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
    label: string;
    id?: string;
    hint?: string;
    error?: string;
};

/** Zone de texte multiligne, avec libellé, aide et erreur. */
export function TextArea({
    label,
    id,
    hint,
    error,
    required,
    rows = 4,
    className,
    ...props
}: TextAreaProps) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const ids = describedBy(textareaId, hint, error);

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <FieldLabel htmlFor={textareaId} required={required}>
                {label}
            </FieldLabel>
            {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}
            <textarea
                {...props}
                id={textareaId}
                rows={rows}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={ids.value}
                className={cn(controlClasses(Boolean(error)), "resize-y")}
            />
            {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
        </div>
    );
}
