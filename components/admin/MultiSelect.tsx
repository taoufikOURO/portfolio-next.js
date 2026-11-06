"use client";

import { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldError, FieldHint, describedBy } from "./field-parts";

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
            <legend className="mb-1.5 p-0 font-semibold">
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
                        className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2"
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
                        className="block min-h-11 w-full rounded-md border border-slate-blue bg-cream py-2 pl-10 pr-3 text-slate-blue placeholder:italic placeholder:text-slate-blue"
                    />
                </div>
            ) : null}

            {options.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-blue px-3 py-4">
                    {emptyMessage}
                </p>
            ) : (
                <ul
                    className={cn(
                        "max-h-64 overflow-y-auto rounded-md bg-cream",
                        error ? "border-2 border-slate-blue" : "border border-slate-blue",
                    )}
                >
                    {options.map((option) => {
                        const checkboxId = `${baseId}-${option.value}`;
                        return (
                            <li
                                key={option.value}
                                hidden={!matches.has(option.value)}
                                className="border-b border-slate-blue/25 last:border-b-0"
                            >
                                <label
                                    htmlFor={checkboxId}
                                    className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:underline"
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
                                            className="peer size-5 cursor-pointer appearance-none rounded-sm border-2 border-slate-blue bg-cream checked:bg-slate-blue"
                                        />
                                        <Check
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0 size-5 p-0.5 text-cream opacity-0 peer-checked:opacity-100"
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
                <p className="text-sm">Aucun résultat pour « {query.trim()} ».</p>
            ) : null}

            <p aria-live="polite" className="text-sm">
                {summary(selected.length)}
                {normalizedQuery ? ` · ${matches.size} affiché(s)` : ""}
            </p>

            {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
        </fieldset>
    );
}
