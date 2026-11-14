"use client";

import { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldError, FieldHint, FOCUS_FADE, describedBy } from "./field-parts";

export type MultiSelectOption = {
    value: string;
    label: string;
};

export type MultiSelectProps = {
    /** Légende du groupe. */
    label: string;
    /** Nom des cases à cocher : le formulaire reçoit une valeur par option cochée (`formData.getAll`). */
    name: string;
    options: MultiSelectOption[];
    defaultValue?: string[];
    /** Mode contrôlé. */
    value?: string[];
    onChange?: (values: string[]) => void;
    hint?: string;
    error?: string;
    required?: boolean;
    /** Champ de filtre. Par défaut : affiché au-delà de 7 options. */
    searchable?: boolean;
    emptyMessage?: string;
    className?: string;
};

function normalize(text: string) {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
}

function summary(count: number) {
    if (count === 0) return "Aucune sélection";
    return count === 1 ? "1 sélectionné" : `${count} sélectionnés`;
}

/**
 * Sélection multiple : groupe de vraies cases à cocher (clavier et lecteurs
 * d'écran natifs), avec filtre facultatif. Le filtre masque les options sans
 * les retirer du formulaire : une option cochée puis masquée reste envoyée.
 */
export function MultiSelect({
    label,
    name,
    options,
    defaultValue = [],
    value,
    onChange,
    hint,
    error,
    required,
    searchable,
    emptyMessage = "Aucune option disponible.",
    className,
}: MultiSelectProps) {
    const baseId = useId();
    const [internal, setInternal] = useState<string[]>(defaultValue);
    const [query, setQuery] = useState("");
    const selected = value ?? internal;
    const ids = describedBy(baseId, hint, error);
    const showSearch = searchable ?? options.length > 7;
    const normalizedQuery = normalize(query.trim());
    const matches = new Set(
        options
            .filter((option) => normalize(option.label).includes(normalizedQuery))
            .map((option) => option.value),
    );

    function toggle(optionValue: string, checked: boolean) {
        const next = checked
            ? [...selected, optionValue]
            : selected.filter((item) => item !== optionValue);
        if (value === undefined) setInternal(next);
        onChange?.(next);
    }

    return (
        <fieldset
            aria-describedby={ids.value}
            className={cn("flex min-w-0 flex-col gap-1.5", className)}
        >
            <legend className="mb-1.5 p-0 font-medium">
                {label}
                {required ? <span aria-hidden="true"> *</span> : null}
            </legend>
            {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}

            {showSearch ? (
                <div className="relative">
                    <label htmlFor={`${baseId}-search`} className="sr-only">
                        Filtrer la liste : {label}
                    </label>
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
                    />
                    <input
                        id={`${baseId}-search`}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            // Entrée ne doit pas envoyer le formulaire depuis le filtre.
                            if (event.key === "Enter") event.preventDefault();
                        }}
                        placeholder="Filtrer…"
                        autoComplete="off"
                        className={cn(
                            "block min-h-11 w-full rounded-full border border-field-line bg-card py-2 pr-4 pl-11 text-ink placeholder:text-muted focus:border-ink",
                            FOCUS_FADE,
                        )}
                    />
                </div>
            ) : null}

            {options.length === 0 ? (
                <p className="rounded-[var(--radius-field)] bg-card px-4 py-4 text-muted">
                    {emptyMessage}
                </p>
            ) : (
                <ul
                    className={cn(
                        "max-h-64 overflow-y-auto rounded-[var(--radius-field)] bg-panel",
                        error ? "border-2 border-danger" : "border border-field-line",
                    )}
                >
                    {options.map((option) => {
                        const checkboxId = `${baseId}-${option.value}`;
                        return (
                            <li
                                key={option.value}
                                hidden={!matches.has(option.value)}
                                className="border-b border-line last:border-b-0"
                            >
                                <label
                                    htmlFor={checkboxId}
                                    className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-150 hover:bg-card"
                                >
                                    <span className="relative inline-flex size-5 shrink-0">
                                        <input
                                            id={checkboxId}
                                            type="checkbox"
                                            name={name}
                                            value={option.value}
                                            checked={selected.includes(option.value)}
                                            onChange={(event) =>
                                                toggle(option.value, event.target.checked)
                                            }
                                            className="peer size-5 cursor-pointer appearance-none rounded-md border-2 border-ink bg-panel checked:bg-ink"
                                        />
                                        <Check
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0 size-5 p-0.5 text-panel opacity-0 peer-checked:opacity-100"
                                        />
                                    </span>
                                    <span>{option.label}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}

            {options.length > 0 && matches.size === 0 ? (
                <p className="text-sm text-muted">Aucun résultat pour « {query.trim()} ».</p>
            ) : null}

            <p aria-live="polite" className="text-sm text-muted">
                {summary(selected.length)}
                {normalizedQuery ? ` · ${matches.size} affiché(s)` : ""}
            </p>

            {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
        </fieldset>
    );
}
