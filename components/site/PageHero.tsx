import type { CSSProperties, ReactNode } from "react";

import { BigTitle } from "./BigTitle";
import { Crosses, SideMarkers } from "./Crosses";

/**
 * En-tête des pages intérieures, même système que l'accueil : cadre à croix
 * de repère, mot géant plein et contour, bloc rouge vertical décalé derrière.
 */
export function PageHero({
  eyebrow,
  title,
  label,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Texte du titre pour les technologies d'assistance (par défaut : `title`). */
  label?: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <header className="site-shell pt-8 sm:pt-12">
      <div className="relative px-3 py-8 sm:px-10 sm:py-12">
        <Crosses thirds />
        <SideMarkers />
        <div aria-hidden="true" className="site-block absolute bottom-0 left-[58%] top-0 w-[22%] bg-signal sm:left-[62%] sm:w-[14%]" />
        <p className="site-eyebrow site-reveal relative">{eyebrow}</p>
        <BigTitle text={title} label={label} max={10} className="relative mt-4 sm:mt-6" />
        {intro ? (
          <p
            className="site-reveal relative mt-6 max-w-2xl text-base leading-relaxed text-muted sm:mt-8 sm:text-lg"
            style={{ "--order": 2 } as CSSProperties}
          >
            <span className="bg-paper">{intro}</span>
          </p>
        ) : null}
        {children}
      </div>
    </header>
  );
}
