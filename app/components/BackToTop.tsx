"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setVisible(scrollTop > 300);
        };
        window.addEventListener("scroll", handler);
        handler(); // run once on mount
        return () => window.removeEventListener("scroll", handler);
    }, []);

    // Visible on lg+ (desktop), hidden on mobile
    const baseClasses =
        "fixed bottom-6 right-6 lg:block transition-opacity opacity-0 group-hover:opacity-100";

    const hiddenClasses = "hidden";

    return (
        <button
            onClick={() => {
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }}
            aria-label="Retour en haut"
            className={visible ? baseClasses : hiddenClasses}
            title="Retour en haut"
        >
            <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden />
            ↑ Remontée
        </button>
    );
}