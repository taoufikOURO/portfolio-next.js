"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import type { NavItem } from "./nav-items";
import { useHydrated } from "./use-hydrated";
import { useModalDialog } from "./use-modal-dialog";

export const MOBILE_MENU_ID = "menu-mobile";

/** Largeur à partir de laquelle la barre de navigation affiche ses liens (classe `xl` de Tailwind). */
const DESKTOP_QUERY = "(min-width: 1280px)";

function isActive(pathname: string, href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
}

/** Retrait du trait sous le libellé, de chaque côté (`after:inset-x-3`). */
const INDICATOR_INSET = 12;

/**
 * Liens horizontaux de la barre (à partir de 1280 px) : lien actif en gras,
 * souligné d'un trait noir épais. Sans JavaScript, chaque lien porte son propre
 * trait. Avec JavaScript (E61), un seul trait glisse en 250 ms jusqu'au lien
 * survolé ou focalisé, puis revient au lien actif ; il ne bouge que par
 * `transform` (position et largeur), sans transition sous « réduire les animations ».
 */
export function DesktopNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    const hydrated = useHydrated();
    const navRef = useRef<HTMLElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);
    const placed = useRef(false);
    const [target, setTarget] = useState<string | null>(null);
    const activeHref = items.find((item) => isActive(pathname, item.href))?.href ?? null;
    const shownHref = target ?? activeHref;

    useLayoutEffect(() => {
        const nav = navRef.current;
        const indicator = indicatorRef.current;
        if (!hydrated || !nav || !indicator) return;

        // `instant` : premier placement et changement de taille, sans glissement.
        const place = (instant: boolean) => {
            const link = shownHref
                ? nav.querySelector<HTMLElement>(`[data-nav-href="${shownHref}"]`)
                : null;
            if (!link || link.offsetWidth === 0) {
                indicator.style.opacity = "0";
                return;
            }
            if (instant) indicator.style.transition = "none";
            indicator.style.transform = `translateX(${link.offsetLeft + INDICATOR_INSET}px) scaleX(${link.offsetWidth - 2 * INDICATOR_INSET})`;
            indicator.style.opacity = "1";
            if (instant) {
                void indicator.offsetWidth; // applique la position avant de rétablir la transition
                indicator.style.transition = "";
            }
        };

        place(!placed.current);
        placed.current = true;
        // Le premier rappel suit immédiatement `observe()` : l'ignorer, sinon il couperait le glissement.
        let initial = true;
        const observer = new ResizeObserver(() => {
            if (initial) initial = false;
            else place(true);
        });
        observer.observe(nav);
        return () => observer.disconnect();
    }, [hydrated, shownHref]);

    return (
        <nav
            ref={navRef}
            aria-label="Navigation principale"
            className="relative hidden self-stretch xl:block"
            onPointerLeave={() => setTarget(null)}
        >
            <ul className="flex h-full items-stretch gap-0.5">
                {items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                        <li key={item.href} className="flex">
                            {/* aria-current="page" aussi sur la section parente d'une sous-page. */}
                            <Link
                                href={item.href}
                                data-nav-href={item.href}
                                aria-current={active ? "page" : undefined}
                                onPointerEnter={() => setTarget(item.href)}
                                onFocus={() => setTarget(item.href)}
                                onBlur={() => setTarget(null)}
                                className={cn(
                                    "relative flex items-center gap-2 rounded-full px-3 text-[0.9375rem] whitespace-nowrap transition-colors duration-150",
                                    !hydrated &&
                                        "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full",
                                    active && "font-medium",
                                    !hydrated && (active ? "after:bg-ink" : "hover:after:bg-line"),
                                )}
                            >
                                <Icon aria-hidden="true" className="size-5 shrink-0" />
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {hydrated ? (
                <span
                    ref={indicatorRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-px origin-left rounded-full bg-ink opacity-0 transition-[translate,scale,transform,opacity] duration-[250ms] ease-out"
                />
            ) : null}
        </nav>
    );
}

/** Pastille ronde avec l'initiale de l'adresse du compte (pas de photo de compte dans le projet). */
function Avatar({ email }: { email: string }) {
    return (
        <span
            aria-hidden="true"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-base font-medium text-panel uppercase"
        >
            {email.charAt(0)}
        </span>
    );
}

function SiteLink() {
    return (
        <a
            href="/"
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center gap-3 rounded-full px-4 transition-colors duration-150 hover:bg-card"
        >
            <ExternalLink aria-hidden="true" className="size-5 shrink-0" />
            <span>
                Voir le site
                <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
            </span>
        </a>
    );
}

/**
 * Menu du compte (à partir de 1280 px) : avatar, adresse, chevron. Élément
 * natif `<details>` : il s'ouvre aussi sans JavaScript. Avec JavaScript, Échap
 * et un clic à l'extérieur le referment.
 */
export function UserMenu({ email, children }: { email: string; children?: ReactNode }) {
    const ref = useRef<HTMLDetailsElement>(null);
    const pathname = usePathname();

    // Fermé à chaque changement de page.
    useEffect(() => {
        if (ref.current) ref.current.open = false;
    }, [pathname]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const details = ref.current;
            if (details?.open && !details.contains(event.target as Node)) details.open = false;
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    return (
        <details
            ref={ref}
            className="group relative hidden xl:block"
            onKeyDown={(event) => {
                if (event.key === "Escape" && ref.current?.open) {
                    ref.current.open = false;
                    ref.current.querySelector("summary")?.focus();
                }
            }}
        >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-full py-1 pr-2 pl-1 transition-colors duration-150 hover:bg-card [&::-webkit-details-marker]:hidden">
                <Avatar email={email} />
                <span className="sr-only">Compte : </span>
                <span className="max-w-44 truncate text-[0.9375rem]">{email}</span>
                <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 transition-transform duration-150 group-open:rotate-180"
                />
            </summary>
            <div className="admin-menu absolute top-full right-0 z-30 mt-3 flex w-80 flex-col gap-1 rounded-[var(--radius-dialog)] bg-panel p-3 shadow-menu">
                <p className="px-4 pt-1 pb-2 text-sm break-all text-muted">
                    <span className="sr-only">Connecté en tant que </span>
                    {email}
                </p>
                <SiteLink />
                {children}
            </div>
        </details>
    );
}

/**
 * Panneau de navigation sous 1280 px : `<dialog>` modal ouvert par le bouton
 * « Menu » (focus piégé, Échap ou bouton « Fermer », focus rendu au
 * déclencheur). Mêmes liens, même repère du lien actif que la barre.
 */
export function MobileMenu({
    items,
    open,
    onClose,
    triggerRef,
    email,
    children,
}: {
    items: NavItem[];
    open: boolean;
    onClose: () => void;
    /** Bouton « Menu » à refocaliser à la fermeture du panneau. */
    triggerRef: RefObject<HTMLElement | null>;
    email?: string;
    /** Contenu ajouté sous « Voir le site » (ex. déconnexion). */
    children?: ReactNode;
}) {
    const pathname = usePathname();
    const { ref, onKeyDown, onMouseDown } = useModalDialog({
        open,
        onClose,
        returnFocusRef: triggerRef,
    });

    // Le panneau n'a plus de raison d'être dès que la barre complète apparaît.
    useEffect(() => {
        const query = window.matchMedia(DESKTOP_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) onClose();
        };
        query.addEventListener("change", handleChange);
        return () => query.removeEventListener("change", handleChange);
    }, [onClose]);

    return (
        <dialog
            ref={ref}
            id={MOBILE_MENU_ID}
            aria-label="Menu de navigation"
            onKeyDown={onKeyDown}
            onMouseDown={onMouseDown}
            className="admin-drawer m-2 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-80 max-w-[calc(100vw-1rem)] rounded-[var(--radius-dialog)] border-0 bg-panel p-0 text-ink shadow-dialog backdrop:bg-ink/40 open:flex open:flex-col xl:hidden"
        >
            <div className="flex items-center justify-end gap-3 px-4 py-3">
                <Button variant="secondary" icon={X} onClick={onClose}>
                    Fermer
                </Button>
            </div>
            <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
                <ul className="flex flex-col gap-1">
                    {items.map((item) => {
                        const active = isActive(pathname, item.href);
                        const Icon = item.icon;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={onClose}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex min-h-11 items-center gap-3 rounded-full px-4 py-2 transition-colors duration-150",
                                        active ? "bg-card font-medium" : "hover:bg-card",
                                    )}
                                >
                                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                                    <span
                                        className={cn(
                                            active && "underline decoration-[3px] underline-offset-[7px]",
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
                {email ? (
                    <p className="px-4 pb-1 text-sm break-all text-muted">
                        <span className="sr-only">Connecté en tant que </span>
                        {email}
                    </p>
                ) : null}
                <SiteLink />
                {children}
            </div>
        </dialog>
    );
}
