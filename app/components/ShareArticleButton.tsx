"use client";

import { Check, Link2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function ShareArticleButton() {
    const pathname = usePathname();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            const url = `${window.location.origin}${pathname}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Erreur lors de la copie:", error);
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Lien copié" : "Copier le lien de l’article"}
            className="inline-flex items-center gap-1.5 text-sm text-(--muted) transition-colors hover:text-(--text)"
        >
            {copied ? (
                <Check className="h-4 w-4" aria-hidden />
            ) : (
                <Link2 className="h-4 w-4" aria-hidden />
            )}
            {copied ? "Lien copié" : "Copier le lien"}
        </button>
    );
}
