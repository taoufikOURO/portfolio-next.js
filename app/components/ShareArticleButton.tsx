"use client";

import { Check, Link2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

async function copyToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) throw new Error("Clipboard unavailable");
}

export default function ShareArticleButton() {
    const pathname = usePathname();
    const [state, setState] = useState<"idle" | "copied" | "error">("idle");
    const timeoutRef = useRef<number | undefined>(undefined);

    useEffect(
        () => () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        },
        [],
    );

    const handleCopy = async () => {
        const url = `${window.location.origin}${pathname}`;

        try {
            await copyToClipboard(url);
            setState("copied");
        } catch {
            setState("error");
        }

        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setState("idle"), 2000);
    };

    return (
        <span className="inline-flex items-center gap-2">
            <button
                type="button"
                onClick={handleCopy}
                aria-label={
                    state === "copied"
                        ? "Lien copié"
                        : "Copier le lien de l’article"
                }
                className="inline-flex items-center gap-1.5 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                {state === "copied" ? (
                    <Check className="h-4 w-4" aria-hidden />
                ) : (
                    <Link2 className="h-4 w-4" aria-hidden />
                )}
                {state === "copied"
                    ? "Lien copié"
                    : state === "error"
                      ? "Copie impossible"
                      : "Copier le lien"}
            </button>
            <span role="status" aria-live="polite" className="sr-only">
                {state === "copied"
                    ? "Le lien de l’article a été copié."
                    : state === "error"
                      ? "Impossible de copier le lien."
                      : ""}
            </span>
        </span>
    );
}
