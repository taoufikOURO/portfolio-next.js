import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";

/** Largeur moyenne d'un caractère d'Archivo à 125 %, graisse 800, capitales (mesurée : 0,845 em ; marge comprise). */
const CHAR_EM = 0.9;
/** Au-delà de ce nombre de caractères, le titre passe sur plusieurs lignes sous 640 px. */
const MOBILE_LINE_CHARS = 9;

/** Découpe un texte en lignes d'au plus `max` caractères, sans couper un mot. */
export function splitTitle(text: string, max = MOBILE_LINE_CHARS): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length > 0 ? lines : [""];
}

/** Taille qui fait tenir `chars` caractères dans la largeur du cadre, plafonnée à `max`. */
function fit(chars: number, max: number): string {
  return `min(${max}rem, calc((min(100vw, 84rem) - var(--frame-pad)) / ${(Math.max(chars, 1) * CHAR_EM).toFixed(2)}))`;
}

function Letters({ text }: { text: string }) {
  return (
    <>
      {[...text].map((char, index) => (
        <span key={index} className="site-letter" style={{ "--i": index } as CSSProperties}>
          {char === " " ? " " : char}
        </span>
      ))}
    </>
  );
}

/** Une ligne : pleine, puis la même en contour, décalée vers le haut (décor). */
function Pair({ text, outlineClassName }: { text: string; outlineClassName?: string }) {
  return (
    <span className="block">
      <span className="block whitespace-nowrap [perspective:40rem]">
        <Letters text={text} />
      </span>
      <span className={cn("site-outline -mt-[0.36em] block whitespace-nowrap [perspective:40rem]", outlineClassName)}>
        <Letters text={text} />
      </span>
    </span>
  );
}

/**
 * Grand titre plein et contour, dimensionné pour tenir dans la largeur du
 * cadre quelle que soit sa longueur. Sous 640 px, un titre long passe sur
 * plusieurs lignes (par mots). Le texte lu par les technologies d'assistance
 * est `label` (ou `text`) ; les lettres et le contour sont masqués.
 */
export function BigTitle({
  text,
  label,
  as: Tag = "h1",
  id,
  className,
  max = 10.5,
  outlineClassName,
}: {
  text: string;
  label?: string;
  as?: "h1" | "h2" | "p";
  id?: string;
  className?: string;
  /** Taille maximale (rem). */
  max?: number;
  /** Classe ajoutée aux lignes contour (ex. décalage au défilement). */
  outlineClassName?: string;
}) {
  const lines = splitTitle(text);
  const split = text.length > MOBILE_LINE_CHARS && lines.length > 1;
  const longest = Math.max(...lines.map((line) => line.length));

  return (
    <Tag id={id} className={cn("site-wide relative leading-[0.82]", className)}>
      <span className="sr-only">{label ?? text}</span>
      <span aria-hidden="true" className={cn("block", split && "max-sm:hidden")} style={{ fontSize: fit(text.length, max) }}>
        <Pair text={text} outlineClassName={outlineClassName} />
      </span>
      {split ? (
        <span aria-hidden="true" className="grid gap-[0.18em] sm:hidden" style={{ fontSize: fit(longest, max) }}>
          {lines.map((line, index) => (
            <Pair key={index} text={line} outlineClassName={outlineClassName} />
          ))}
        </span>
      ) : null}
    </Tag>
  );
}
