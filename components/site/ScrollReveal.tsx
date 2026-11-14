"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Apparition au défilement (E66). Amélioration progressive :
 * - sans JavaScript, rien n'est masqué (aucun attribut n'est posé) ;
 * - sous `prefers-reduced-motion: reduce`, rien n'est masqué ni animé ;
 * - sinon, chaque élément `[data-reveal]` encore sous la ligne de flottaison
 *   passe à « pending » (masqué par le CSS), puis à « shown » quand il entre
 *   dans la fenêtre : l'animation d'entrée (600 ms au plus) se joue alors.
 * Les éléments déjà visibles au chargement ne sont pas touchés.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal='shown'])")];
    const show = (element: Element) => element.setAttribute("data-reveal", "shown");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    for (const element of elements) {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.9) continue;
      element.setAttribute("data-reveal", "pending");
      observer.observe(element);
    }

    // Impression, ou focus clavier sur un élément encore masqué : tout s'affiche.
    const showAll = () => elements.forEach(show);
    const onFocus = (event: FocusEvent) => {
      const pending = (event.target as Element | null)?.closest?.("[data-reveal='pending']");
      if (pending) show(pending);
    };
    window.addEventListener("beforeprint", showAll);
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", showAll);
      document.removeEventListener("focusin", onFocus);
    };
  }, [pathname]);

  return null;
}
