"use client";

import profile from "@/data/profile.json";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuPanel, motion } from "./Motion";

export default function Header() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const links = [
        ["/", "Accueil"],
        ["/#about", "À propos"],
        ["/#stack", "Stack"],
        ["/#projets", "Projets"],
        ["/articles", "Notes"],
        ["/#contact", "Contact"],
    ];
    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 md:px-8">
            <nav className="mx-auto flex max-w-7xl items-center justify-between border border-(--line) bg-[rgba(243,244,237,.86)] px-4 py-3 shadow-sm backdrop-blur-xl md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                >
                <Link
                    href="/"
                    className="group flex items-center gap-3"
                    onClick={() => setOpen(false)}
                >
                    <span className="flex h-9 w-9 items-center justify-center bg-(--ink) font-mono text-sm font-bold text-(--lime) transition-transform group-hover:rotate-6">
                        TO
                    </span>
                    <span className="hidden text-xs font-bold uppercase tracking-[.16em] text-(--muted) sm:block">
                        Data / web / idées
                    </span>
                </Link>
                </motion.div>
                <div className="hidden items-center gap-1 lg:flex">
                    {links.map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            className={`px-3 py-2 text-xs font-bold uppercase tracking-[.12em] transition-colors hover:text-[#668b26] ${pathname === href ? "text-[#668b26]" : "text-(--muted)"}`}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden border-l border-(--line) pl-4 font-mono text-[10px] text-(--muted) md:block">
                        STATUS: OPEN_TO_WORK
                    </span>
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="border border-(--ink) px-3 py-2 text-xs font-bold lg:hidden"
                        aria-label="Ouvrir le menu"
                    >
                        {open ? "Fermer" : "Menu"}
                    </button>
                </div>
            </nav>
            <MenuPanel open={open}>
                <div className="data-card mx-auto mt-2 max-w-7xl border p-4 lg:hidden">
                    <div className="grid grid-cols-2 gap-1">
                        {links.map(([href, label], index) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setOpen(false)}
                                className="border-b border-(--line) p-4 font-bold text-(--ink)"
                            >
                                <span className="mr-3 font-mono text-xs text-[#668b26]">
                                    0{index + 1}
                                </span>
                                {label}
                            </Link>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-(--muted)">
                        {profile.email}
                    </p>
                </div>
            </MenuPanel>
        </header>
    );
}
