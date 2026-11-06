"use client";

import { useEffect, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import type { NavItem } from "./nav-items";
import { useModalDialog } from "./use-modal-dialog";

export const MOBILE_MENU_ID = "menu-mobile";

/** Largeur à partir de laquelle la barre latérale est fixe (classe `lg` de Tailwind). */
const DESKTOP_QUERY = "(min-width: 1024px)";

function isActive(pathname: string, href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
    items,
    onNavigate,
}: {
    items: NavItem[];
    onNavigate?: () => void;
}) {
    const pathname = usePathname();

    return (
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto py-4">
            <ul className="flex flex-col gap-1">
                {items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                        <li key={item.href}>
                            {/* aria-current="page" aussi sur la section parente d'une sous-page. */}
                            <Link
                                href={item.href}
                                onClick={onNavigate}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex min-h-11 items-center gap-3 border-l-4 px-4 py-2 hover:underline",
                                    active
                                        ? "border-terracotta font-semibold text-sand"
                                        : "border-transparent text-cream",
                                )}
                            >
                                <Icon aria-hidden="true" className="size-5 shrink-0" />
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function SidebarBrand() {
    return (
        <div className="border-b border-cream/20 px-4 py-5">
            <p className="text-lg font-bold">Administration</p>
            <p className="text-sm">Portfolio de Taoufik</p>
        </div>
    );
}

function SidebarFooter({ children }: { children?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 border-t border-cream/20 py-3">
            <a
                href="/"
                target="_blank"
                rel="noopener"
                className="flex min-h-11 items-center gap-3 border-l-4 border-transparent px-4 py-2 hover:underline"
            >
                <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
                <span>
                    Voir le site
                    <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
                </span>
            </a>
            {children}
        </div>
    );
}

/**
 * Barre latérale de l'administration (plan §3.3 : texte crème sur bleu-gris
 * 8,87 ; élément actif en sable 6,63 avec un filet terracotta ; anneau de
 * focus sable).
 * - À partir de 1024 px : fixe, toujours visible.
 * - En dessous : panneau modal (`<dialog>`) ouvert par le bouton « Menu »
 *   (focus piégé, Échap ou bouton « Fermer », focus rendu au déclencheur).
 */
export function Sidebar({
    items,
    open,
    onClose,
    triggerRef,
    footer,
}: {
    items: NavItem[];
    open: boolean;
    onClose: () => void;
    /** Bouton « Menu » à refocaliser à la fermeture du panneau. */
    triggerRef: RefObject<HTMLElement | null>;
    /** Contenu ajouté sous « Voir le site » (ex. déconnexion, étape 7). */
    footer?: ReactNode;
}) {
    const { ref, onKeyDown, onMouseDown } = useModalDialog({
        open,
        onClose,
        returnFocusRef: triggerRef,
    });

    // Le panneau n'a plus de raison d'être dès que la barre fixe apparaît.
    useEffect(() => {
        const query = window.matchMedia(DESKTOP_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) onClose();
        };
        query.addEventListener("change", handleChange);
        return () => query.removeEventListener("change", handleChange);
    }, [onClose]);

    return (
        <>
            <div
                data-surface="dark"
                className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-slate-blue text-cream lg:flex"
            >
                <SidebarBrand />
                <SidebarNav items={items} />
                <SidebarFooter>{footer}</SidebarFooter>
            </div>

            <dialog
                ref={ref}
                id={MOBILE_MENU_ID}
                aria-label="Menu de navigation"
                data-surface="dark"
                onKeyDown={onKeyDown}
                onMouseDown={onMouseDown}
                className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-0 bg-slate-blue p-0 text-cream backdrop:bg-cream open:flex open:flex-col lg:hidden"
            >
                <div className="flex items-center justify-between gap-3 border-b border-cream/20 px-4 py-3">
                    <p className="text-lg font-bold">Administration</p>
                    <Button variant="secondary" icon={X} onClick={onClose}>
                        Fermer
                    </Button>
                </div>
                <SidebarNav items={items} onNavigate={onClose} />
                <SidebarFooter>{footer}</SidebarFooter>
            </dialog>
        </>
    );
}
