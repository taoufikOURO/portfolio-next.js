"use client";

import { useActionState, useEffect, useRef, type MouseEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/admin/Button";

import { moveEducationAction, type MoveEducationState } from "./actions";

/**
 * « Monter » et « Descendre » (alternative au glisser-déposer, utilisable au
 * clavier et sans JavaScript). L'ordre est enregistré en base par l'action.
 *
 * Avec JavaScript, la ligne change de place sans rechargement : le focus
 * reste sur le bouton utilisé (ou passe à l'autre si la formation arrive en
 * tête ou en fin de liste, où le bouton est désactivé), et la nouvelle
 * position est annoncée. Pendant l'enregistrement, les deux boutons sont
 * marqués `aria-disabled` (le focus reste en place) et un second clic est ignoré.
 */
export function MoveButtons({ id, title, index, total }: { id: string; title: string; index: number; total: number }) {
  const [state, formAction, pending] = useActionState<MoveEducationState, FormData>(moveEducationAction, null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const handled = useRef<MoveEducationState>(null);

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
  // cliqué (`name`/`value` du bouton d'envoi) n'arrive pas à l'action quand
  // React envoie le formulaire (constaté au parcours réel, étape 9).
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
          Monter<span className="sr-only"> « {title} »</span>
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
          Descendre<span className="sr-only"> « {title} »</span>
        </Button>
      </form>
      <p role="status" className={state && !state.ok ? "basis-full text-sm font-semibold" : "sr-only"}>
        {pending ? "Déplacement en cours…" : state ? (state.ok ? state.message : `Erreur : ${state.message}`) : ""}
      </p>
    </div>
  );
}
