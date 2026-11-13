"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";

import { deleteArticleAction, type ArticleActionState } from "./actions";
import { deleteArticlePath } from "./routes";

type ArticleSummary = { id: string; title: string; published: boolean };

function Consequences({ article }: { article: ArticleSummary }) {
  return (
    <div className="flex flex-col gap-2">
      <p>
        La suppression de l’article « {article.title} » est définitive : la version en ligne et le brouillon sont
        supprimés, avec leurs images de couverture.
      </p>
      {article.published ? <p>L’article ne sera plus visible sur le site public.</p> : null}
    </div>
  );
}

/**
 * « Supprimer » dans la liste ou sur la page d'un article. Sans JavaScript :
 * lien vers la page de confirmation. Avec JavaScript : dialogue de confirmation.
 */
export function DeleteArticleButton({ article, className }: { article: ArticleSummary; className?: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <ButtonLink href={deleteArticlePath(article.id)} variant="secondary" icon={Trash2} className={className}>
        Supprimer<span className="sr-only"> « {article.title} »</span>
      </ButtonLink>
    );
  }

  async function confirm() {
    const data = new FormData();
    data.set("id", article.id);
    const state = await deleteArticleAction(null, data);
    // En cas de succès, l'action redirige vers la liste.
    if (state && !state.ok) setError(state.message);
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={Trash2}
        className={className}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Supprimer<span className="sr-only"> « {article.title} »</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        tone="destructive"
        title={`Supprimer l’article « ${article.title} » ?`}
        description={
          <div className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Consequences article={article} />
          </div>
        }
        confirmLabel="Supprimer"
        pendingLabel="Suppression en cours…"
      />
    </>
  );
}

/** Page de confirmation (utilisable sans JavaScript). */
export function DeleteArticleForm({ article }: { article: ArticleSummary }) {
  const [state, formAction] = useActionState<ArticleActionState, FormData>(deleteArticleAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <Consequences article={article} />
      <input type="hidden" name="id" value={article.id} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton variant="destructive" pendingLabel="Suppression en cours…">
          Supprimer l’article
        </SubmitButton>
      </div>
    </form>
  );
}
