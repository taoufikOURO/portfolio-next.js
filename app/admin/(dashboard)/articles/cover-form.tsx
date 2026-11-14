"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { FileField } from "@/components/admin/FileField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useHydrated } from "@/components/admin/use-hydrated";
import { BODY_TOO_LARGE_MESSAGE, exceedsBodyLimit } from "@/components/admin/upload-guard";
import { ARTICLE_MESSAGES, type CoverState } from "@/lib/validation/article";

import { saveCoverAction } from "./actions";

const FILE_ID = "article-couverture";

/** Écritures de l'éditeur, partagées avec ce formulaire (file d'attente et jeton de version). */
export type ArticleWriter = {
  /**
   * Enregistre d'abord le texte en attente, puis exécute `task` à son tour dans
   * la file, avec le dernier jeton connu. `null` : arrêté par un conflit.
   */
  run: (task: (version: string) => Promise<CoverState>) => Promise<CoverState>;
  /** Nouveau jeton après un enregistrement réussi. */
  setVersion: (version: string) => void;
  markConflict: () => void;
};

/**
 * Image de couverture (E55 b) : formulaire séparé de l'éditeur, pour que
 * l'autosave n'envoie jamais le fichier et que l'envoi tienne dans 1 Mo (E52).
 * Avec JavaScript, l'image part dès qu'elle est choisie (après l'enregistrement
 * du texte en attente) ; sans JavaScript, par le bouton « Envoyer l'image ».
 * Le garde-fou du corps (`exceedsBodyLimit`) est appelé dans le `onSubmit`.
 */
export function CoverForm({
  articleId,
  version,
  coverUrl,
  published,
  writer,
  onSaved,
}: {
  articleId: string;
  /** Jeton affiché par le serveur (utilisé sans JavaScript). */
  version: string;
  coverUrl: string | null;
  /** L'article a déjà été publié : la version en ligne garde son image jusqu'à la publication. */
  published: boolean;
  writer: ArticleWriter;
  onSaved: (coverUrl: string) => void;
}) {
  const hydrated = useHydrated();
  const formRef = useRef<HTMLFormElement>(null);
  // Sans JavaScript : la page est rendue avec l'état renvoyé par l'action.
  const [formState, formAction] = useActionState<CoverState, FormData>(saveCoverAction, null);
  const [state, setState] = useState<CoverState>(null);
  const [pending, setPending] = useState(false);
  const [bodyTooLarge, setBodyTooLarge] = useState(false);
  const [edited, setEdited] = useState(false);
  const [fieldKey, setFieldKey] = useState(0);

  const shown = state ?? formState;

  async function send(form: HTMLFormElement) {
    setPending(true);
    const data = new FormData(form);
    const result = await writer.run(async (current) => {
      data.set("version", current);
      try {
        return await saveCoverAction(null, data);
      } catch {
        return { ok: false, tone: "error", message: ARTICLE_MESSAGES.unexpected, fieldErrors: {} };
      }
    });
    const final: CoverState = result ?? {
      ok: false,
      tone: "error",
      message: ARTICLE_MESSAGES.coverConflict,
      fieldErrors: {},
      conflict: true,
    };
    if (final?.ok && final.version) {
      writer.setVersion(final.version);
      if (final.coverUrl) onSaved(final.coverUrl);
    }
    if (final?.conflict) writer.markConflict();
    setState(final);
    setEdited(false);
    // Le champ est recréé vide : l'image enregistrée s'affiche au-dessus.
    setFieldKey((key) => key + 1);
    setPending(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Garde-fou du corps de la requête (E52) : appelé ici, avant tout envoi.
    if (exceedsBodyLimit(new FormData(event.currentTarget))) {
      event.preventDefault();
      setBodyTooLarge(true);
      document.getElementById(FILE_ID)?.focus();
      return;
    }
    setBodyTooLarge(false);
    if (!hydrated) return;
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({ ok: false, tone: "error", message: ARTICLE_MESSAGES.formInvalid, fieldErrors: { file: ARTICLE_MESSAGES.coverRequired } });
      document.getElementById(FILE_ID)?.focus();
      return;
    }
    void send(event.currentTarget);
  }

  const fileError = bodyTooLarge ? BODY_TOO_LARGE_MESSAGE : edited ? undefined : shown?.fieldErrors.file;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="article-couverture-titre"
      className="admin-card flex flex-col gap-4"
    >
      <h2 id="article-couverture-titre" className="admin-section-title">
        Image de couverture
      </h2>
      <input type="hidden" name="id" value={articleId} />
      <input type="hidden" name="version" value={formState?.version ?? version} />

      {shown && !bodyTooLarge ? <Alert tone={shown.tone ?? (shown.ok ? "success" : "error")}>{shown.message}</Alert> : null}

      <div className="flex flex-col gap-2">
        <p className="font-semibold">Image actuelle du brouillon</p>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt="Image de couverture actuelle"
            width={320}
            height={180}
            unoptimized
            className="admin-thumb h-auto w-full max-w-xs border border-line"
          />
        ) : (
          <p>Aucune image de couverture.</p>
        )}
      </div>

      <FileField
        key={fieldKey}
        id={FILE_ID}
        name="file"
        kind="image"
        label={coverUrl ? "Nouvelle image de couverture" : "Image de couverture"}
        preview={!hydrated}
        error={fileError}
        onFileChange={(file) => {
          setEdited(true);
          setBodyTooLarge(false);
          // Avec JavaScript, l'image part dès qu'elle est choisie (contrôles de `onSubmit` compris).
          if (file && hydrated) formRef.current?.requestSubmit();
        }}
        className="max-w-xl"
      />
      <p className="text-sm">
        {hydrated ? "L’image est envoyée dès qu’elle est choisie. " : ""}
        {published
          ? "Elle remplace celle du brouillon ; la version en ligne garde la sienne jusqu’à la publication."
          : "Elle remplace l’image actuelle."}
      </p>
      {pending ? (
        <p role="status" className="text-sm font-semibold">
          Envoi de l’image en cours…
        </p>
      ) : null}

      {hydrated ? null : (
        <div>
          <SubmitButton variant="secondary" icon={Upload} pendingLabel="Envoi en cours…">
            Envoyer l’image
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
