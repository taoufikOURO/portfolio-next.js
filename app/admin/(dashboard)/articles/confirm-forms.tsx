"use client";

import { useActionState } from "react";
import { Send, Undo2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { SubmitButton } from "@/components/admin/SubmitButton";

import { discardChangesAction, publishArticleAction, type ArticleActionState } from "./actions";
import { articlePath } from "./routes";

/**
 * Confirmation de la publication (page `/publication`, fonctionne sans
 * JavaScript) : envoie `confirmed=1` et le jeton de la version affichée. Seul
 * formulaire de l'administration qui met un article en ligne.
 */
export function PublicationForm({ article }: { article: { id: string; version: string; first: boolean } }) {
  const [state, formAction] = useActionState<ArticleActionState, FormData>(publishArticleAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={article.id} />
      <input type="hidden" name="version" value={article.version} />
      <input type="hidden" name="confirmed" value="1" />
      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={Send} pendingLabel="Publication en cours…">
          {article.first ? "Confirmer la publication" : "Confirmer la publication des modifications"}
        </SubmitButton>
        <ButtonLink href={articlePath(article.id)} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}

/** Confirmation de l'abandon des modifications sans JavaScript (avec JavaScript : dialogue de l'éditeur). */
export function DiscardForm({ article }: { article: { id: string; version: string } }) {
  const [state, formAction] = useActionState<ArticleActionState, FormData>(discardChangesAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={article.id} />
      <input type="hidden" name="version" value={article.version} />
      <input type="hidden" name="confirmed" value="1" />
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="destructive" icon={Undo2} pendingLabel="Abandon en cours…">
          Abandonner les modifications
        </SubmitButton>
        <ButtonLink href={articlePath(article.id)} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
