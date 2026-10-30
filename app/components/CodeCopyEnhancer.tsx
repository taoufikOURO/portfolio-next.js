"use client";

import { useEffect } from "react";

async function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) throw new Error("Clipboard unavailable");
}

export default function CodeCopyEnhancer() {
    useEffect(() => {
        const handleClick = async (event: MouseEvent) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest<HTMLButtonElement>(
                ".copy-button",
            );
            if (!button) return;

            const code = button
                .closest(".code-block-wrapper")
                ?.querySelector("code");
            if (!code) return;

            const label = button.querySelector(".copy-text");
            if (label) label.textContent = "Copier";

            try {
                await copyText(code.innerText);
                button.classList.add("copied");
                if (label) label.textContent = "Copié !";
            } catch {
                if (label) label.textContent = "Erreur";
            }

            window.setTimeout(() => {
                button.classList.remove("copied");
                if (label) label.textContent = "Copier";
            }, 2000);
        };

        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    return null;
}
