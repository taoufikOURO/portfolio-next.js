import Image from "next/image";

import { technologyIconUrl } from "@/lib/technologies";

/**
 * Icône d'une technologie : l'URL publique est calculée ici à partir du
 * chemin enregistré (E11). Décorative (`alt` vide) : le nom de la technologie
 * est toujours affiché à côté.
 */
export function TechnologyIcon({ iconPath, size = 40 }: { iconPath: string; size?: number }) {
  return (
    <Image
      src={technologyIconUrl(iconPath)}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-md border border-slate-blue/25 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
