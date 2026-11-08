"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Faux au rendu serveur et pendant l'hydratation, vrai ensuite. Sert aux
 * contrôles qui ont une version sans JavaScript (lien vers une page de
 * confirmation) et une version enrichie (dialogue) : le HTML initial est
 * toujours la version sans JavaScript.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
