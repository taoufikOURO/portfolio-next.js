"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export default function ShareArticleButton() {
    const pathname = usePathname();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            // Construire l'URL complète avec le domaine actuel
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
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fca311]/10 hover:bg-[#fca311]/20 text-[#fca311] font-medium transition-all border border-[#fca311]/30 hover:border-[#fca311]/60"
        >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
            </svg>
            <span>{copied ? "Copié !" : "Partager"}</span>
        </button>
    );
}
