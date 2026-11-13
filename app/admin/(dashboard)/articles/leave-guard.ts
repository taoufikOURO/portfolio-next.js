// Avertissement du navigateur en quittant l'éditeur (E57). Module pur : la
// décision est testée seule ; l'éditeur l'appelle dans son écouteur
// `beforeunload`.

export type EditorSaveState = {
  /** Une modification n'a pas encore été envoyée (délai de 1,5 s en cours, ou nouvel essai prévu). */
  dirty: boolean;
  /** Écritures en cours ou en file (texte, couverture, abandon). */
  inFlight: number;
  /** Le dernier enregistrement a abouti (faux après un échec, un refus ou un conflit). */
  lastSaveOk: boolean;
};

/**
 * Avertir tant qu'un enregistrement est en attente ou n'a pas abouti ; jamais
 * après un enregistrement réussi. Aucune sauvegarde hors ligne : quitter malgré
 * l'avertissement perd ce qui n'est pas enregistré.
 */
export function shouldWarnBeforeLeaving(state: EditorSaveState): boolean {
  return state.dirty || state.inFlight > 0 || !state.lastSaveOk;
}
