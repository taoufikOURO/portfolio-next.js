import { ArrowDown, Crosshair } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { fanCards, ringTextOf, type PublicProfile, type PublicProject } from "@/lib/public/content";

import { BigTitle } from "./BigTitle";
import { Crosses, SideMarkers } from "./Crosses";
import { SiteImage } from "./SiteImage";

/**
 * Accroche en haut à gauche : le profil n'a pas de champ dédié. Texte neutre
 * (« Portfolio » et l'année), à valider par Taoufik (E62, E66). Le grand
 * titre est le titre professionnel du profil.
 */
export const HOME_TAGLINE = "Portfolio";

const FAN_SIZES = "(min-width: 1024px) 216px, (min-width: 640px) 176px, 136px";

const RING_RADIUS = 80;
const RING_PATH = `M100,100 m-${RING_RADIUS},0 a${RING_RADIUS},${RING_RADIUS} 0 1,1 ${RING_RADIUS * 2},0 a${RING_RADIUS},${RING_RADIUS} 0 1,1 -${RING_RADIUS * 2},0`;

/** Anneau de texte circulaire (décor) : texte composé du profil, rotation lente. */
function TextRing({ text, label }: { text: string; label: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 left-1/2 size-[11rem] -translate-x-1/2 translate-y-1/2 sm:size-[14.5rem] lg:size-[17.5rem]"
    >
      <div className="site-ring-spin size-full">
        <svg viewBox="0 0 200 200" className="size-full overflow-visible">
          <defs>
            <path id="site-ring-path" d={RING_PATH} />
          </defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 3" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 3" />
          {text ? (
            <text className="site-wide" fontSize="10.5" fill="currentColor" letterSpacing="1.5">
              <textPath href="#site-ring-path" textLength={2 * Math.PI * RING_RADIUS} lengthAdjust="spacing">
                {text}
              </textPath>
            </text>
          ) : null}
        </svg>
      </div>
      {/* Flèche vers la photo, et prénom du profil au centre. */}
      <div className="absolute inset-x-0 top-[18%] flex flex-col items-center gap-1">
        <svg viewBox="0 0 10 8" className="size-2.5 fill-ink sm:size-3">
          <path d="M5 0 10 8H0Z" />
        </svg>
        {label ? <span className="site-wide text-[0.7rem] sm:text-sm">{label}</span> : null}
      </div>
    </div>
  );
}

/** Éventail de cartes : photo du profil au centre, projets autour (lien vers leur page). */
function Fan({ profile, projects }: { profile: PublicProfile; projects: PublicProject[] }) {
  const cards = fanCards(profile, projects);
  const middle = Math.floor(cards.length / 2);

  return (
    <div className="site-fan">
      {cards.map((card, index) => {
        const slot = index - middle;
        const style = { "--slot": slot, "--depth": Math.abs(slot), "--tilt": `${slot < 0 ? -3 : 3}deg` } as CSSProperties;
        const face = (
          <span className="site-card-face site-lift site-fan-face block">
            <SiteImage image={card.image} alt="" sizes={FAN_SIZES} eager={card.kind === "profile"} />
          </span>
        );

        if (card.kind === "placeholder") {
          return (
            <span key={index} aria-hidden="true" className="site-fan-card" style={style}>
              <span className="site-card-face site-fan-face block">
                <SiteImage image={card.image} alt="" sizes={FAN_SIZES} />
              </span>
            </span>
          );
        }
        return (
          <Link
            key={index}
            href={card.kind === "profile" ? "#a-propos" : "#projets"}
            aria-label={card.kind === "profile" ? "Aller à la section À propos" : `Projet ${card.label} : aller à la section Projets`}
            className="site-fan-card"
            style={style}
          >
            {face}
          </Link>
        );
      })}
    </div>
  );
}

export function HomeHero({ profile, projects }: { profile: PublicProfile; projects: PublicProject[] }) {
  return (
    <section aria-labelledby="home-title" className="relative overflow-hidden">
      <div className="site-shell pt-6 sm:pt-10">
        <div className="relative px-3 py-7 sm:px-10 sm:py-10">
          <Crosses thirds />
          <SideMarkers />
          <div
            aria-hidden="true"
            className="site-block absolute bottom-[3.25rem] left-[35%] top-0 w-[24%] bg-signal sm:bottom-[3.75rem] sm:left-[38%] sm:w-[15%]"
          />

          <div className="relative flex items-start justify-between gap-4">
            <p className="site-wide site-reveal text-sm leading-[1.05] sm:text-xl">
              {HOME_TAGLINE}
              <br />
              {new Date().getFullYear()}
            </p>
            <Crosshair aria-hidden="true" className="size-7 shrink-0 sm:size-9" strokeWidth={1.5} />
          </div>

          <BigTitle
            id="home-title"
            text={profile.jobTitle || "Portfolio"}
            label={[profile.fullName, profile.jobTitle].filter(Boolean).join(", ") || "Portfolio"}
            max={11}
            className="site-drift relative mx-auto mt-8 w-fit sm:mt-12"
          />

          <div className="relative mt-10 flex items-end justify-between gap-4 text-xs font-bold uppercase tracking-[0.1em] sm:mt-16 sm:text-sm">
            <p className="site-reveal bg-paper" style={{ "--order": 3 } as CSSProperties}>
              {profile.fullName}
            </p>
            <a
              href="#a-propos"
              className="site-reveal group inline-flex min-h-11 items-center gap-2 bg-paper"
              style={{ "--order": 4 } as CSSProperties}
            >
              Découvrir
              <ArrowDown aria-hidden="true" className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-y-1" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </div>

      <div className="relative h-[19.5rem] sm:h-[25.5rem] lg:h-[30.5rem]">
        <Fan profile={profile} projects={projects} />
        <TextRing text={ringTextOf(profile)} label={profile.firstName} />
      </div>
    </section>
  );
}
