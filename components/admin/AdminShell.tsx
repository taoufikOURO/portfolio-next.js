"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "./Button";
import { ADMIN_NAV, type NavItem } from "./nav-items";
import { ToastProvider } from "./Toast";
import { DesktopNav, MOBILE_MENU_ID, MobileMenu, UserMenu } from "./TopNav";

/**
 * Coque de l'administration (étape 18, E60 ; E61) : lien d'évitement, barre de
 * navigation en pilule blanche flottante, sans logo (elle commence directement
 * par les liens à partir de 1280 px, par le bouton « Menu » en dessous),
 * panneau blanc du contenu et notifications. Chaque page entre en fondu
 * (`admin-page`, admin.css).
 *
 * `navItems` contient des icônes (fonctions) : il ne peut être passé que par un
 * composant client. Un layout serveur utilise la navigation par défaut.
 * `accountActions` (ReactNode, ex. formulaire de déconnexion) est le seul point
 * d'extension depuis un layout serveur ; il est rendu dans le menu du compte et
 * dans le panneau mobile.
 */
export function AdminShell({
    children,
    navItems = ADMIN_NAV,
    email,
    accountActions,
}: {
    children: ReactNode;
    navItems?: NavItem[];
    /** Adresse du compte connecté (menu du compte). */
    email?: string;
    accountActions?: ReactNode;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    return (
        <ToastProvider>
            <a
                href="#contenu"
                className="sr-only rounded-full bg-ink px-5 py-2 font-medium text-panel focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center"
            >
                Aller au contenu principal
            </a>

            <div className="min-h-dvh p-2 sm:p-4 lg:p-6">
                <div className="mx-auto flex max-w-[100rem] flex-col gap-2 rounded-[2rem] bg-frame p-2 sm:gap-3 sm:rounded-[2.5rem] sm:p-3">
                    <header className="relative z-20 flex min-h-16 items-center justify-between gap-4 rounded-full bg-panel p-2 sm:min-h-[4.5rem] sm:px-3">
                        <DesktopNav items={navItems} />
                        {email ? <UserMenu email={email}>{accountActions}</UserMenu> : null}
                        <Button
                            ref={menuButtonRef}
                            variant="secondary"
                            icon={Menu}
                            aria-haspopup="dialog"
                            aria-expanded={menuOpen}
                            aria-controls={MOBILE_MENU_ID}
                            onClick={() => setMenuOpen(true)}
                            className="xl:hidden"
                        >
                            Menu
                        </Button>
                    </header>

                    <main
                        id="contenu"
                        tabIndex={-1}
                        className="admin-page min-w-0 rounded-[1.5rem] bg-panel px-4 py-6 focus:outline-none sm:rounded-[var(--radius-panel)] sm:px-8 sm:py-8 lg:px-10 lg:py-10"
                    >
                        {children}
                    </main>
                </div>
            </div>

            <MobileMenu
                items={navItems}
                open={menuOpen}
                onClose={closeMenu}
                triggerRef={menuButtonRef}
                email={email}
            >
                {accountActions}
            </MobileMenu>
        </ToastProvider>
    );
}
