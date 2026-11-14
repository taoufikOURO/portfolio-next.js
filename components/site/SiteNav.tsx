"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { SITE_LINKS, sectionOfPath, type SectionId } from "./links";

const LINK = "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold uppercase tracking-[0.06em]";

/**
 * Section de l'accueil au milieu de l'écran (suivi du défilement). Sans
 * JavaScript, aucun lien n'est surligné ; les ancres fonctionnent quand même.
 */
function useSectionInView(enabled: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    if (!enabled || !("IntersectionObserver" in window)) return;
    const sections = SITE_LINKS.map((link) => document.getElementById(link.id)).filter((element): element is HTMLElement => element !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const current = SITE_LINKS.find((link) => visible.has(link.id));
        setActive(current ? current.id : null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

/**
 * Navigation par ancres vers les sections de l'accueil (E67). Écrans larges
 * (1280 px et plus) : liste en ligne. Petits écrans : menu `<details>` natif
 * (clavier et sans JavaScript), refermé après un choix.
 */
export function SiteNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const inView = useSectionInView(onHome);
  const current = onHome ? inView : sectionOfPath(pathname);
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };

  const items = SITE_LINKS.map((link) => ({ ...link, current: link.id === current }));

  return (
    <>
      <nav aria-label="Navigation principale" className="hidden xl:block">
        <ul className="flex items-center gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={item.current ? (onHome ? "location" : "true") : undefined}
                className={cn(LINK, item.current ? "bg-ink text-paper" : "text-ink hover:bg-tile")}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <details ref={menu} key={pathname} className="group relative xl:hidden">
        <summary className="site-button site-button-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <Menu aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Menu
        </summary>
        <nav
          aria-label="Navigation principale (menu)"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[1.25rem] bg-white p-2 shadow-[0_24px_48px_-24px_rgb(15_15_16/0.5)]"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={item.current ? (onHome ? "location" : "true") : undefined}
                  className={cn(LINK, "w-full", item.current ? "bg-ink text-paper" : "text-ink hover:bg-paper")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    </>
  );
}
