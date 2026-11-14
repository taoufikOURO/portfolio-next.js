import { cn } from "@/lib/cn";

/** Positions des croix de repère « + » sur le cadre (coins et tiers des bords horizontaux). */
const POSITIONS = {
  corners: ["-left-[7px] -top-[7px]", "-right-[7px] -top-[7px]", "-bottom-[7px] -left-[7px]", "-bottom-[7px] -right-[7px]"],
  thirds: ["left-1/3 -top-[7px]", "left-2/3 -top-[7px]", "-bottom-[7px] left-1/3", "-bottom-[7px] left-2/3"],
} as const;

/** Croix de repère du cadre (décor, masquées des technologies d'assistance). */
export function Crosses({ thirds = false, topOnly = false }: { thirds?: boolean; topOnly?: boolean }) {
  const all = thirds ? [...POSITIONS.corners, ...POSITIONS.thirds] : POSITIONS.corners;
  const positions = topOnly ? all.filter((position) => position.includes("-top-")) : all;
  return (
    <>
      {positions.map((position) => (
        <span key={position} aria-hidden="true" className={cn("site-cross", position)} />
      ))}
    </>
  );
}

/** Flèches de repère (triangles pleins) au milieu des bords gauche et droit. */
export function SideMarkers() {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 10 12" className="absolute -left-1 top-1/2 size-3 -translate-y-1/2 fill-ink">
        <path d="M0 0 10 6 0 12Z" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 10 12" className="absolute -right-1 top-1/2 size-3 -translate-y-1/2 fill-ink">
        <path d="M10 0 0 6 10 12Z" />
      </svg>
    </>
  );
}
