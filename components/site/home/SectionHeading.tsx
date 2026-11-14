import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

import { BigTitle } from "../BigTitle";
import { Crosses } from "../Crosses";

/**
 * En-tête d'une section de l'accueil : filet noir à croix de repère, numéro,
 * grand titre plein et contour (les lettres basculent quand il arrive à
 * l'écran, le contour glisse au défilement). Le lien vers la page complète
 * est le bouton « Voir plus » en fin de section (E67).
 */
export function SectionHeading({
  id,
  index,
  title,
  intro,
  dark = false,
}: {
  id: string;
  index: number;
  title: string;
  intro?: string;
  dark?: boolean;
}) {
  return (
    <div className={cn("relative border-t pt-5 sm:pt-7", dark ? "border-paper" : "border-ink")}>
      {dark ? null : <Crosses topOnly />}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className={cn("site-eyebrow", dark && "text-paper")}>
          <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
          <span aria-hidden="true"> — </span>
          <span className="sr-only"> : </span>
          {title}
        </p>
      </div>
      <div data-reveal className="relative mt-6 sm:mt-10">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-[55%] h-[calc(100%+1.5rem)] w-[18%] bg-signal sm:left-[60%] sm:w-[11%]"
        />
        <BigTitle
          as="h2"
          id={`${id}-title`}
          text={title}
          max={8}
          className="relative"
          outlineClassName={cn("site-heading-outline", dark && "site-outline-light")}
        />
      </div>
      {intro ? (
        <p
          data-reveal
          style={{ "--order": 1 } as CSSProperties}
          className={cn("relative mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl", dark ? "text-paper" : "text-muted")}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
