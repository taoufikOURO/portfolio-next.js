/**
 * Défilement synchronisé de l'éditeur Markdown et de son aperçu : chaque zone
 * suit la proportion de défilement de l'autre, sans animation. Fonctions pures
 * (testées sans navigateur) : les éléments sont réduits aux trois mesures utiles.
 */

export type ScrollBox = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/** Écart (px) en dessous duquel deux positions sont tenues pour égales (positions fractionnaires). */
export const SCROLL_SYNC_TOLERANCE = 1;

function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

/** Proportion de défilement d'une zone, entre 0 (haut) et 1 (bas) ; 0 si rien ne défile. */
export function scrollRatio(box: ScrollBox): number {
  const max = box.scrollHeight - box.clientHeight;
  if (!(max > 0)) return 0;
  return clampRatio(box.scrollTop / max);
}

/** Position (px, arrondie) d'une zone pour une proportion donnée, bornée à [0, défilement maximal]. */
export function scrollTopForRatio(ratio: number, box: Omit<ScrollBox, "scrollTop">): number {
  const max = box.scrollHeight - box.clientHeight;
  if (!(max > 0)) return 0;
  return Math.round(clampRatio(ratio) * max);
}

/** Position que doit prendre `target` pour suivre la proportion de défilement de `source`. */
export function syncedScrollTop(source: ScrollBox, target: Omit<ScrollBox, "scrollTop">): number {
  return scrollTopForRatio(scrollRatio(source), target);
}

/**
 * Synchronisation dans les deux sens, sans boucle : déplacer la zone cible
 * déclenche chez elle un événement `scroll` (l'écho) ; il est reconnu à la
 * position posée et ignoré, au lieu de redéplacer la source. Une cible déjà
 * à la bonne position n'est pas touchée (aucun écho attendu).
 */
export function createScrollSync<T extends ScrollBox>() {
  let echo: { target: T; top: number } | null = null;

  return {
    /** À appeler au défilement de `source` ; renvoie `true` si `target` a été déplacée. */
    sync(source: T, target: T): boolean {
      if (echo && echo.target === source) {
        const isEcho = Math.abs(source.scrollTop - echo.top) <= SCROLL_SYNC_TOLERANCE;
        echo = null;
        if (isEcho) return false;
      }
      const top = syncedScrollTop(source, target);
      if (Math.abs(target.scrollTop - top) <= SCROLL_SYNC_TOLERANCE) return false;
      echo = { target, top };
      target.scrollTop = top;
      return true;
    },
  };
}
