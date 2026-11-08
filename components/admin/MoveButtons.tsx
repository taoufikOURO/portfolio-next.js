"use client";

import { useActionState, useEffect, useRef, type MouseEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "./Button";

/** État renvoyé par une action de déplacement (formations, stack…). */
export type MoveState = {
  ok: boolean;
  message: string;
  /** Sens du déplacement demandé, pour placer le focus. */
  direction?: "up" | "down";
} | null;

export type MoveButtonsProps<State extends MoveState> = {
  /** Server Action de déplacement : lit `id` et `direction` (`up` ou `down`) dans le formulaire. */
  action: (previous: State, formData: FormData) => Promise<State>;
  id: string;
  /** Nom de l'élément, ajouté au libellé pour les lecteurs d'écran (« Monter « React » »). */
  label: string;
  index: number;
  total: number;
};

/**
 * « Monter » et « Descendre » (alternative au glisser-déposer, utilisable au
 * clavier et sans JavaScript), partagés par les listes ordonnables
 * (formations, stack). L'ordre est enregistré en base par l'action.
 *
 * Avec JavaScript, la ligne change de place sans rechargement : le focus
 * reste sur le bouton utilisé (ou passe à l'autre si l'élément arrive en tête
 * ou en fin de liste, où le bouton est désactivé), et la nouvelle position
 * est annoncée. Pendant l'enregistrement, les deux boutons sont marqués
 * `aria-disabled` (le focus reste en place) et un second clic est ignoré.
 */
export function MoveButtons<State extends MoveState>({ action, id, label, index, total }: MoveButtonsProps<State>) {
  // `action` reste la Server Action elle-même (sans enveloppe) : le formulaire fonctionne sans JavaScript.
  const [state, formAction, pending] = useActionState<State | null, FormData>(action as never, null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const handled = useRef<State | null>(null);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  useEffect(() => {
    if (!state?.ok || state === handled.current) return;
    handled.current = state;
    const target = state.direction === "up" ? (isFirst ? downRef : upRef) : isLast ? upRef : downRef;
    target.current?.focus();
  }, [state, isFirst, isLast]);

  if (total < 2) return null;

  const ignoreWhilePending = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) event.preventDefault();
  };

  // Un formulaire par bouton, direction en champ caché : la valeur du bouton
  // d'envoi n'arrive pas à l'action quand React envoie le formulaire (étape 9).
  return (
    <div className="flex flex-wrap gap-2">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <Button
          ref={upRef}
          type="submit"
          variant="secondary"
          icon={ArrowUp}
          disabled={isFirst}
          aria-disabled={pending || undefined}
          onClick={ignoreWhilePending}
        >
          Monter<span className="sr-only"> « {label} »</span>
        </Button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <Button
          ref={downRef}
          type="submit"
          variant="secondary"
          icon={ArrowDown}
          disabled={isLast}
          aria-disabled={pending || undefined}
          onClick={ignoreWhilePending}
        >
          Descendre<span className="sr-only"> « {label} »</span>
        </Button>
      </form>
      <p role="status" className={state && !state.ok ? "basis-full text-sm font-semibold" : "sr-only"}>
        {pending ? "Déplacement en cours…" : state ? (state.ok ? state.message : `Erreur : ${state.message}`) : ""}
      </p>
    </div>
  );
}
