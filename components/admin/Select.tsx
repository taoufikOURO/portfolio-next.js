import { useId, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
    FieldError,
    FieldHint,
    FieldLabel,
    controlClasses,
    describedBy,
} from "./field-parts";

export type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type SelectProps = Omit<ComponentProps<"select">, "id" | "children"> & {
    label: string;
    options: SelectOption[];
    id?: string;
    hint?: string;
    error?: string;
    /** Première option vide (ex. « Choisir une catégorie »). */
    placeholder?: string;
};

/** Liste déroulante native (pleinement accessible au clavier et aux lecteurs d'écran). */
export function Select({
    label,
    options,
    id,
    hint,
    error,
    required,
    placeholder,
    className,
    ...props
}: SelectProps) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const ids = describedBy(selectId, hint, error);

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <FieldLabel htmlFor={selectId} required={required}>
                {label}
            </FieldLabel>
            {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}
            <div className="relative">
                <select
                    {...props}
                    id={selectId}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={ids.value}
                    className={cn(controlClasses(Boolean(error)), "appearance-none pr-10")}
                >
                    {placeholder ? <option value="">{placeholder}</option> : null}
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2"
                />
            </div>
            {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
        </div>
    );
}
