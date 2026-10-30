"use client";

import { cn } from "@/app/lib/format";
import { Briefcase, Code2, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface NavigationItem {
    label: string;
    href: string;
}

export default function HeaderNav({
    items,
    email,
    github,
    linkedin,
}: {
    items: NavigationItem[];
    email: string;
    github: string;
    linkedin: string;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [activeHash, setActiveHash] = useState("");

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    useEffect(() => {
        if (pathname !== "/") return;

        const sections = items
            .map((item) => item.href.split("#")[1])
            .filter(Boolean)
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => Boolean(element));

        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveHash(`#${entry.target.id}`);
                    } else {
                        setActiveHash((current) =>
                            current === `#${entry.target.id}` ? "" : current,
                        );
                    }
                }
            },
            { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
        );

        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [items, pathname]);

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/" && !activeHash;
        if (href.startsWith("/#")) {
            return pathname === "/" && activeHash === href.slice(1);
        }
        return pathname === href;
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-navigation"
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-(--surface) text-(--ink) transition-colors hover:bg-(--ink) hover:text-white lg:hidden"
            >
                {open ? (
                    <X className="h-5 w-5" aria-hidden />
                ) : (
                    <Menu className="h-5 w-5" aria-hidden />
                )}
            </button>

            <nav
                aria-label="Navigation principale"
                className="hidden items-center gap-6 lg:flex"
            >
                {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "relative text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition-colors hover:text-(--accent)",
                                active &&
                                    "text-(--accent) after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:bg-(--accent)",
                            )}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div
                id="mobile-navigation"
                hidden={!open}
                className="absolute inset-x-0 top-full rounded-b-3xl border-b border-(--line) bg-(--bg)/95 px-5 pb-6 pt-4 shadow-[0_24px_50px_rgba(9,7,8,0.12)] backdrop-blur-md lg:hidden"
            >
                <nav aria-label="Navigation mobile">
                    <ul className="flex flex-col">
                        {items.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        aria-current={
                                            active ? "page" : undefined
                                        }
                                        className={cn(
                                            "flex items-center justify-between border-b border-(--line) py-3 text-sm font-semibold uppercase tracking-[0.06em] transition-colors hover:text-(--accent)",
                                            active && "text-(--accent)",
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <a
                    href={`mailto:${email}`}
                    className="mt-5 inline-flex text-xs font-semibold text-(--muted) transition-colors hover:text-(--accent)"
                >
                    {email}
                </a>
                <div className="mt-4 flex items-center gap-2">
                    <a
                        href={github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub (nouvel onglet)"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                    >
                        <Code2 className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn (nouvel onglet)"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface) transition-colors hover:bg-(--accent) hover:text-white"
                    >
                        <Briefcase className="h-4 w-4" aria-hidden />
                    </a>
                </div>
            </div>
        </>
    );
}
