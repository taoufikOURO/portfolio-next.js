import Image from "next/image";

import { cn } from "@/lib/cn";
import type { SiteImage as SiteImageData } from "@/lib/public/content";

/**
 * Image du site public : `next/image` en mode `fill` dans un conteneur
 * dimensionné (aucun décalage de mise en page). Chargement différé, sauf
 * l'image principale de la page (`eager`). L'image par défaut et les SVG
 * (icônes de la stack) sont servis tels quels, sans l'optimiseur.
 */
export function SiteImage({
  image,
  alt,
  sizes,
  eager = false,
  className,
}: {
  image: SiteImageData;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  const unoptimized = image.isDefault || image.src.toLowerCase().endsWith(".svg");
  return (
    <Image
      src={image.src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={unoptimized}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={cn("object-cover", className)}
    />
  );
}
