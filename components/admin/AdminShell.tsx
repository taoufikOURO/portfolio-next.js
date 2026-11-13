"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "./Button";
import { ADMIN_NAV, type NavItem } from "./nav-items";
import { MOBILE_MENU_ID, Sidebar } from "./Sidebar";
import { ToastProvider } from "./Toast";

/**
 * Coque de l'administration : lien d'évitement, barre latérale (fixe à partir
 * de 1024 px, panneau « Menu » en dessous), zone de contenu et notifications.
 *
 * `navItems` contient des icônes (fonctions) : il ne peut être passé que par un
 * composant client. Un layout serveur utilise la navigation par défaut.
 * `footer` (ReactNode) est le seul point d'extension depuis un layout serveur.
 */
export function AdminShell({
    children,
    navItems = ADMIN_NAV,
    footer,
}: {
    children: ReactNode;
    navItems?: NavItem[];
    footer?: ReactNode;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    return (
        <ToastProvider>
            <a
                href="#contenu"
                className="sr-only rounded-md border-2 border-slate-blue bg-cream px-4 py-2 font-semibold text-slate-blue focus:not-sr-only focus:fixed focus:inline-flex focus:min-h-11 focus:items-center focus:left-4 focus:top-4 focus:z-50"
            >
                Aller au contenu principal
            </a>

            <Sidebar
                items={navItems}
                open={menuOpen}
                onClose={closeMenu}
                triggerRef={menuButtonRef}
                footer={footer}
            />

            <div className="lg:pl-64">
                <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-blue/25 bg-cream px-4 py-3 lg:hidden">
                    <Button
                        ref={menuButtonRef}
                        variant="secondary"
                        icon={Menu}
                        aria-haspopup="dialog"
                        aria-expanded={menuOpen}
                        aria-controls={MOBILE_MENU_ID}
                        onClick={() => setMenuOpen(true)}
                    >
                        Menu
                    </Button>
                    <p className="font-bold">Administration</p>
                </header>

                <main
                    id="contenu"
                    tabIndex={-1}
                    className="mx-auto w-full max-w-5xl px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
                >
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
