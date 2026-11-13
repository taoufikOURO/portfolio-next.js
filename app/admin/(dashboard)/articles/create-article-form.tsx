"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import {
  ARTICLE_LIMITS,
  ARTICLE_MESSAGES,
  createArticleSchema,
  type CreateArticleState,
} from "@/lib/validation/article";

import { createArticleAction } from "./actions";
import { ARTICLES_PATH } from "./routes";

const TITLE_ID = "nouvel-article-titre";

/**
 * Création d'un article : seul le titre est demandé. L'article est créé en
 * brouillon (slug proposé depuis le titre, auteur prérempli avec le nom du
 * profil), puis l'éditeur s'ouvre ; la suite est enregistrée automatiquement.
 */
export function CreateArticleForm() {
  const [state, formAction] = useActionState<CreateArticleState, FormData>(createArticleAction, null);
  const { clientErrors, onSubmit } = useClientValidation(
    createArticleSchema,
    [["title", TITLE_ID]] as const,
    undefined,
    state?.fieldErrors,
  );
  const errors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? ARTICLE_MESSAGES.formInvalid : state?.message;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone="error">{message}</Alert> : null}
      <Field
        id={TITLE_ID}
        name="title"
        label="Titre"
        required
        hint="Le slug est proposé à partir du titre ; tout reste modifiable dans l’éditeur."
        maxLength={ARTICLE_LIMITS.title}
        defaultValue={state?.values?.title ?? ""}
        error={errors.title}
      />
      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={Plus} pendingLabel="Création en cours…">
          Créer le brouillon
        </SubmitButton>
        <ButtonLink href={ARTICLES_PATH} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
