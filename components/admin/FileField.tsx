"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { FILE_KIND_RULES, validateFile, type FileKind } from "./file-rules";
import { FieldError, FieldHint, FieldLabel, describedBy } from "./field-parts";

export type FileFieldProps = {
    label: string;
    name: string;
    id?: string;
    /**
     * Usage du fichier (`image`, `icon`, `resume`) : fixe les types acceptés,
     * les tailles maximales et l'aide, avec les valeurs du serveur
     * (`lib/storage/rules.ts`). `accept`, `maxSizeMB` et `hint` le remplacent s'ils sont fournis.
     */
    kind?: FileKind;
    /** Même syntaxe que l'attribut HTML `accept`. Vérifié ici pour le confort, revérifié par le serveur. */
    accept?: string;
    /** Taille maximale en Mo. Vérifiée ici pour le confort, revérifiée par le serveur. */
    maxSizeMB?: number;
    hint?: string;
    /** Erreur venant du serveur ; prime sur l'erreur de contrôle locale. */
    error?: string;
    required?: boolean;
    /** Affiche une miniature du fichier choisi quand c'est une image. */
    preview?: boolean;
    /** Nom du fichier déjà enregistré, rappelé tant qu'aucun nouveau fichier n'est choisi. */
    currentFileName?: string;
    onFileChange?: (file: File | null) => void;
    className?: string;
};

/**
 * Champ de choix de fichier : vrai `<input type="file">` (clavier et lecteurs
 * d'écran natifs). Le contrôle de type et de taille ne sert qu'au confort.
 */
export function FileField({
    label,
    name,
    id,
    kind,
    accept: acceptProp,
    maxSizeMB: maxSizeMBProp,
    hint: hintProp,
    error,
    required,
    preview = false,
    currentFileName,
    onFileChange,
    className,
}: FileFieldProps) {
    const kindRules = kind ? FILE_KIND_RULES[kind] : undefined;
    const accept = acceptProp ?? kindRules?.accept;
    const maxSizeMB = maxSizeMBProp ?? kindRules?.maxSizeMB;
    // Les tailles par type (SVG à 1 Mo) ne valent que pour les règles du préréglage.
    const maxSizeMBByType = maxSizeMBProp === undefined ? kindRules?.maxSizeMBByType : undefined;
    const hint = hintProp ?? kindRules?.hint;

    const generatedId = useId();
    const inputId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const shownError = error ?? localError ?? undefined;
    const ids = describedBy(inputId, hint, shownError);

    // Libère l'URL de la miniature au démontage.
    useEffect(() => {
        return () => {
            if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        };
    }, []);

    function updatePreview(next: File | null) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current =
            next && preview && next.type.startsWith("image/")
                ? URL.createObjectURL(next)
                : null;
        setPreviewUrl(previewRef.current);
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const next = event.target.files?.[0] ?? null;
        const problem = next ? validateFile(next, { accept, maxSizeMB, maxSizeMBByType }) : null;
        if (problem) {
            event.target.value = "";
            setLocalError(problem);
            setFile(null);
            updatePreview(null);
            onFileChange?.(null);
            return;
        }
        setLocalError(null);
        setFile(next);
        updatePreview(next);
        onFileChange?.(next);
    }

    function clear() {
        if (inputRef.current) inputRef.current.value = "";
        setLocalError(null);
        setFile(null);
        updatePreview(null);
        onFileChange?.(null);
        inputRef.current?.focus();
    }

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <FieldLabel htmlFor={inputId} required={required}>
                {label}
            </FieldLabel>
            {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}
            {currentFileName && !file ? (
                <p className="text-sm">Fichier actuel : {currentFileName}</p>
            ) : null}
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                name={name}
                accept={accept}
                required={required}
                onChange={handleChange}
                aria-invalid={shownError ? true : undefined}
                aria-describedby={ids.value}
                className={cn(
                    "block w-full cursor-pointer rounded-md bg-cream text-slate-blue",
                    "file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-md file:border-2 file:border-slate-blue file:bg-cream file:px-4 file:py-2 file:font-semibold file:text-slate-blue hover:file:underline",
                    shownError
                        ? "border-2 border-slate-blue p-[calc(0.375rem-1px)]"
                        : "border border-slate-blue p-1.5",
                )}
            />
            {file ? (
                <div className="flex flex-wrap items-center gap-3">
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt={`Aperçu de ${file.name}`}
                            width={96}
                            height={96}
                            unoptimized
                            className="size-24 rounded-md border border-slate-blue/25 object-contain"
                        />
                    ) : null}
                    <p className="min-w-0 break-all text-sm">Fichier choisi : {file.name}</p>
                    <Button variant="secondary" icon={X} onClick={clear}>
                        Retirer le fichier
                    </Button>
                </div>
            ) : null}
            {shownError ? <FieldError id={ids.errorId!}>{shownError}</FieldError> : null}
        </div>
    );
}
