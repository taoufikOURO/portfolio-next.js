"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Send, Sparkles, Undo2 } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field } from "@/components/admin/Field";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextArea } from "@/components/admin/TextArea";
import { useHydrated } from "@/components/admin/use-hydrated";
import type { ArticleDisplayStatus } from "@/lib/articles/rules";
import { slugify, SLUG_MAX_LENGTH } from "@/lib/slug";
import {
  ARTICLE_FIELDS,
  ARTICLE_LIMITS,
  ARTICLE_MESSAGES,
  AUTOSAVE_DELAY_MS,
  duplicateSlugMessage,
  formatDay,
  formatDayTime,
  formatTime,
  hasErrors,
  publishBlockers,
  slugProblem,
  type ArticleDraftState,
  type ArticleDraftValues,
  type ArticleField,
  type PublishField,
} from "@/lib/validation/article";
import type { FieldErrors } from "@/lib/validation/auth";

import { discardChangesAction, saveDraftAction } from "./actions";
import { ArticleStatus } from "./article-status";
import { CoverForm, type ArticleWriter } from "./cover-form";
import { shouldWarnBeforeLeaving } from "./leave-guard";
import { articlePublicationPath, discardArticlePath, publicArticlePath } from "./routes";

export const ARTICLE_FIELD_IDS = {
  title: "article-titre",
  slug: "article-slug",
  description: "article-description",
  category: "article-categorie",
  author: "article-auteur",
  content: "article-contenu",
} as const satisfies Record<ArticleField, string>;

const CATEGORIES_LIST_ID = "article-categories";
const PUBLISH_FIELDS: readonly PublishField[] = ["title", "slug", "content"];

export type ArticleEditorProps = {
  article: {
    id: string;
    /** Jeton de version : date de dernière modification de l'article (ISO). */
    version: string;
    displayStatus: ArticleDisplayStatus;
    publishedAt: string | null;
    lastPublishedAt: string | null;
    /** Slug de la version en ligne. */
    publishedSlug: string | null;
    coverUrl: string | null;
  };
  initialValues: ArticleDraftValues;
  categories: string[];
  /** Champs qui ont empêché la publication (retour de la page de confirmation, E55 a). */
  publishErrors?: FieldErrors<PublishField>;
};

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string }
  | { kind: "conflict" };

/** « Enregistré à 14:05 » le jour même, sinon avec la date. */
function savedLabel(iso: string): string {
  const date = new Date(iso);
  return formatDay(date) === formatDay(new Date())
    ? `Enregistré à ${formatTime(date)}`
    : `Enregistré le ${formatDayTime(date)}`;
}

/**
 * Éditeur d'un article. Toute modification est enregistrée dans la version de
 * travail (jamais la version en ligne) : 1,5 s après la dernière frappe, à la
 * sortie d'un champ, ou par « Enregistrer le brouillon ». Les écritures d'un
 * même onglet (texte, couverture, abandon) passent en série par une file :
 * chacune envoie le dernier jeton de version connu. Si un autre onglet a
 * enregistré entre-temps, l'enregistrement est refusé, l'autosave s'arrête et
 * un avertissement s'affiche : rien n'est écrasé, le texte reste dans l'éditeur.
 *
 * Sans JavaScript : formulaire classique (« Enregistrer le brouillon »), liens
 * vers les pages de confirmation de la publication et de l'abandon.
 */
export function ArticleEditor({ article, initialValues, categories, publishErrors }: ArticleEditorProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  // Sans JavaScript, le formulaire est envoyé à l'action et la page est rendue avec son état.
  const [formState, formAction] = useActionState<ArticleDraftState, FormData>(saveDraftAction, null);

  const [values, setValues] = useState<ArticleDraftValues>(formState?.values ?? initialValues);
  const [savedAt, setSavedAt] = useState(formState?.savedAt ?? article.version);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ArticleField>>(
    formState && !formState.ok ? formState.fieldErrors : {},
  );
  // Slug refusé par le serveur car déjà pris : l'erreur reste affichée tant que le champ n'a pas changé.
  const [slugTakenFor, setSlugTakenFor] = useState<string | null>(null);
  const [shownPublishErrors, setShownPublishErrors] = useState<FieldErrors<PublishField>>(publishErrors ?? {});
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(formState?.isDraft ?? article.displayStatus !== "published");
  const [coverUrl, setCoverUrl] = useState(article.coverUrl);
  const [leaving, setLeaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  // Dernier jeton connu de cet onglet (miroir de `versionRef`, lisible pendant le rendu).
  const [clientVersion, setClientVersion] = useState(formState?.version ?? article.version);
  // Remise à zéro quand la page est rendue de nouveau avec une version venue d'ailleurs
  // (abandon par le dialogue, puis redirection vers cette même page). Les enregistrements de
  // cet onglet ne font pas re-rendre la page : la version reçue est alors la sienne.
  const [serverVersion, setServerVersion] = useState(article.version);
  const [resets, setResets] = useState(0);
  if (serverVersion !== article.version) {
    setServerVersion(article.version);
    if (article.version !== clientVersion) {
      setClientVersion(article.version);
      setValues(initialValues);
      setSavedAt(article.version);
      setStatus({ kind: "idle" });
      setFieldErrors({});
      setSlugTakenFor(null);
      setShownPublishErrors(publishErrors ?? {});
      setPublishMessage(null);
      setIsDraft(article.displayStatus !== "published");
      setCoverUrl(article.coverUrl);
      setLeaving(false);
      setDiscardOpen(false);
      setResets((count) => count + 1);
    }
  }

  const valuesRef = useRef(values);
  const versionRef = useRef(formState?.version ?? article.version);
  const dirtyRef = useRef(false);
  const lastOkRef = useRef(true);
  const conflictRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const busyRef = useRef(0);

  function clearTimer() {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  /** File des écritures de l'onglet : une à la fois, dans l'ordre. */
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    busyRef.current += 1;
    const run = queueRef.current.then(task).finally(() => {
      busyRef.current -= 1;
    });
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function markConflict() {
    conflictRef.current = true;
    clearTimer();
    setStatus({ kind: "conflict" });
  }

  async function saveTask(): Promise<boolean> {
    if (conflictRef.current) return false;
    if (!dirtyRef.current) return lastOkRef.current;
    dirtyRef.current = false;
    const snapshot = valuesRef.current;
    const data = new FormData();
    data.set("id", article.id);
    data.set("version", versionRef.current);
    for (const field of ARTICLE_FIELDS) data.set(field, snapshot[field]);
    setStatus({ kind: "saving" });

    let result: ArticleDraftState = null;
    try {
      result = await saveDraftAction(null, data);
    } catch {
      result = null;
    }
    if (result?.status === "saved" || result?.status === "unchanged") {
      versionRef.current = result.version ?? versionRef.current;
      setClientVersion(versionRef.current);
      setSavedAt(result.savedAt ?? versionRef.current);
      setIsDraft(result.isDraft ?? true);
      setFieldErrors({});
      const slug = snapshot.slug.trim();
      setSlugTakenFor(result.fieldErrors.slug && slugProblem(slug) === null ? slug : null);
      setStatus({ kind: "saved" });
      lastOkRef.current = true;
      return true;
    }
    lastOkRef.current = false;
    if (result?.status === "conflict") {
      dirtyRef.current = true;
      markConflict();
      return false;
    }
    if (result?.status === "invalid") setFieldErrors(result.fieldErrors);
    // Nouvel essai à la prochaine modification, à la sortie d'un champ ou par le bouton.
    dirtyRef.current = true;
    setStatus({ kind: "error", message: result?.message ?? ARTICLE_MESSAGES.autosaveFailed });
    return false;
  }

  /** Enregistre tout de suite ce qui ne l'est pas encore ; `true` si tout est enregistré. */
  function flush(): Promise<boolean> {
    clearTimer();
    return enqueue(saveTask);
  }

  function change(field: ArticleField, value: string) {
    const next = { ...valuesRef.current, [field]: value };
    valuesRef.current = next;
    setValues(next);
    dirtyRef.current = true;
    if (conflictRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }

  function saveOnBlur() {
    if (dirtyRef.current && !conflictRef.current) void flush();
  }

  // Après une remise à zéro (voir plus haut), les références suivent le nouvel état.
  useEffect(() => {
    if (resets === 0) return;
    clearTimer();
    valuesRef.current = values;
    versionRef.current = clientVersion;
    dirtyRef.current = false;
    lastOkRef.current = true;
    conflictRef.current = false;
    // Seulement à chaque remise à zéro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resets]);

  // Quitter la page avec des modifications non enregistrées : le navigateur demande confirmation (E57).
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (
        shouldWarnBeforeLeaving({
          dirty: dirtyRef.current,
          inFlight: busyRef.current,
          lastSaveOk: lastOkRef.current,
        })
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimer();
    };
  }, []);

  const writer: ArticleWriter = {
    async run(task) {
      await flush();
      if (conflictRef.current) return null;
      return enqueue(async () => {
        if (conflictRef.current) return null;
        return task(versionRef.current);
      });
    },
    setVersion(version) {
      versionRef.current = version;
      setClientVersion(version);
      setSavedAt(version);
      setIsDraft(true);
      setStatus({ kind: "saved" });
    },
    markConflict,
  };

  // Erreurs affichées : saisie (navigateur), refus du serveur, champs exigés pour publier.
  const slug = values.slug.trim();
  const blockers = publishBlockers(values);
  const errors: FieldErrors<ArticleField> = { ...fieldErrors };
  for (const field of PUBLISH_FIELDS) {
    if (shownPublishErrors[field] && blockers[field]) errors[field] = blockers[field];
  }
  const slugError =
    slugProblem(slug) ??
    (slugTakenFor !== null && slugTakenFor === slug ? duplicateSlugMessage(slug) : undefined) ??
    (formState?.fieldErrors.slug && formState.values?.slug.trim() === slug ? formState.fieldErrors.slug : undefined);
  if (slugError) errors.slug = slugError;

  const displayStatus: ArticleDisplayStatus =
    article.displayStatus === "draft" ? "draft" : isDraft ? "pending" : "published";

  async function goToPublication() {
    setPublishMessage(null);
    const current = valuesRef.current;
    const missing = publishBlockers(current);
    const currentSlug = current.slug.trim();
    const slugBlocked =
      slugProblem(currentSlug) !== null || (slugTakenFor !== null && slugTakenFor === currentSlug);
    if (hasErrors(missing) || slugBlocked) {
      setShownPublishErrors(missing);
      setPublishMessage(slugBlocked && !hasErrors(missing) ? ARTICLE_MESSAGES.publishSlugToFix : ARTICLE_MESSAGES.publishIncomplete);
      const first = PUBLISH_FIELDS.find((field) => missing[field] || (field === "slug" && slugBlocked));
      if (first) document.getElementById(ARTICLE_FIELD_IDS[first])?.focus();
      return;
    }
    setLeaving(true);
    const saved = await flush();
    if (!saved) {
      setLeaving(false);
      return;
    }
    router.push(articlePublicationPath(article.id));
  }

  async function confirmDiscard() {
    setDiscardError(null);
    clearTimer();
    // Les modifications non enregistrées sont abandonnées elles aussi.
    const hadUnsaved = dirtyRef.current;
    dirtyRef.current = false;
    const result = await enqueue(async () => {
      const data = new FormData();
      data.set("id", article.id);
      data.set("version", versionRef.current);
      data.set("confirmed", "1");
      // En cas de succès, l'action redirige vers l'éditeur, qui affiche la version en ligne.
      return discardChangesAction(null, data);
    });
    if (result && !result.ok) {
      dirtyRef.current = hadUnsaved;
      setDiscardError(result.message);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // Avec JavaScript, le bouton enregistre tout de suite (même chemin que l'autosave).
    event.preventDefault();
    if (conflictRef.current) return;
    dirtyRef.current = true;
    void flush();
  }

  const noJsMessage = formState ? formState.message : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="article-statut" className="admin-card">
        <h2 id="article-statut" className="admin-section-title">
          Statut
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ArticleStatus status={displayStatus} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">Publié le</dt>
          <dd>{article.publishedAt ? formatDay(new Date(article.publishedAt)) : "Jamais publié"}</dd>
          <dt className="font-semibold">Mis à jour le</dt>
          <dd>{article.lastPublishedAt ? formatDay(new Date(article.lastPublishedAt)) : "Aucune republication"}</dd>
          {article.publishedSlug ? (
            <>
              <dt className="font-semibold">Adresse en ligne</dt>
              <dd className="break-all">{publicArticlePath(article.publishedSlug)}</dd>
            </>
          ) : null}
        </dl>
        <p className="mt-4 text-sm">
          {displayStatus === "draft"
            ? "Cet article n’a jamais été publié. Il ne sera visible qu’après « Publier » et une confirmation."
            : displayStatus === "pending"
              ? "Des modifications sont enregistrées dans un brouillon. La version en ligne ne change pas tant qu’elles ne sont pas publiées."
              : "Aucune modification en attente : l’éditeur affiche la version en ligne. Toute modification sera enregistrée dans un brouillon."}
        </p>

        {publishMessage ? (
          <Alert tone="error" className="mt-4">
            {publishMessage}
          </Alert>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {displayStatus !== "published" ? (
            hydrated ? (
              <Button icon={Send} onClick={() => void goToPublication()} disabled={leaving}>
                {leaving ? "Enregistrement…" : "Publier"}
              </Button>
            ) : (
              <ButtonLink href={articlePublicationPath(article.id)} icon={Send}>
                Publier
              </ButtonLink>
            )
          ) : null}
          {displayStatus === "pending" ? (
            hydrated ? (
              <Button
                variant="secondary"
                icon={Undo2}
                onClick={() => {
                  setDiscardError(null);
                  setDiscardOpen(true);
                }}
              >
                Abandonner les modifications
              </Button>
            ) : (
              <ButtonLink href={discardArticlePath(article.id)} variant="secondary" icon={Undo2}>
                Abandonner les modifications
              </ButtonLink>
            )
          ) : null}
        </div>
        {!hydrated && displayStatus !== "published" ? (
          <p className="mt-3 text-sm">Enregistrez le brouillon avant de publier : la page de confirmation montre la version enregistrée.</p>
        ) : null}
      </section>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={confirmDiscard}
        tone="destructive"
        title="Abandonner les modifications ?"
        description={
          <div className="flex flex-col gap-3">
            {discardError ? <Alert tone="error">{discardError}</Alert> : null}
            <p>
              Le brouillon est supprimé définitivement, avec son image de couverture si elle n’est pas celle de la
              version en ligne. L’éditeur affichera de nouveau la version en ligne, qui ne change pas.
            </p>
          </div>
        }
        confirmLabel="Abandonner"
        pendingLabel="Abandon en cours…"
      />

      <CoverForm
        key={resets}
        articleId={article.id}
        version={article.version}
        coverUrl={coverUrl}
        published={article.displayStatus !== "draft"}
        writer={writer}
        onSaved={setCoverUrl}
      />

      <form
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="article-redaction"
        className="admin-card flex flex-col gap-6"
      >
        <h2 id="article-redaction" className="admin-section-title">
          Rédaction
        </h2>
        <input type="hidden" name="id" value={article.id} />
        <input type="hidden" name="version" value={formState?.version ?? article.version} />

        {noJsMessage ? <Alert tone={formState?.ok ? (formState.fieldErrors.slug ? "warning" : "success") : "error"}>{noJsMessage}</Alert> : null}
        {status.kind === "conflict" ? (
          <Alert tone="warning">
            <span className="flex flex-col items-start gap-3">
              <span>{ARTICLE_MESSAGES.conflict}</span>
              <Button variant="secondary" icon={RotateCcw} onClick={() => window.location.reload()}>
                Recharger la page
              </Button>
            </span>
          </Alert>
        ) : null}
        {status.kind === "error" ? <Alert tone="error">{status.message}</Alert> : null}

        <p className="text-sm">
          Chaque modification est enregistrée automatiquement dans le brouillon, jamais dans la version en ligne. Le
          titre, le slug et le contenu sont exigés pour publier.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id={ARTICLE_FIELD_IDS.title}
            name="title"
            label="Titre"
            maxLength={ARTICLE_LIMITS.title}
            value={values.title}
            onChange={(event) => change("title", event.target.value)}
            onBlur={saveOnBlur}
            error={errors.title}
          />
          <div className="flex flex-col gap-2">
            <Field
              id={ARTICLE_FIELD_IDS.slug}
              name="slug"
              label="Slug (adresse de l’article)"
              hint={`Minuscules sans accent, chiffres et tirets, ${SLUG_MAX_LENGTH} caractères au plus. Il ne change jamais tout seul. Deux articles ne peuvent pas avoir le même slug, même en brouillon.${
                article.publishedSlug ? ` Adresse en ligne : ${publicArticlePath(article.publishedSlug)} ; un nouveau slug ne s’applique qu’à la publication.` : ""
              }`}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              maxLength={SLUG_MAX_LENGTH}
              value={values.slug}
              onChange={(event) => change("slug", event.target.value)}
              onBlur={saveOnBlur}
              error={errors.slug}
            />
            {hydrated ? (
              <div>
                <Button
                  variant="secondary"
                  icon={Sparkles}
                  disabled={slugify(values.title) === "" || slugify(values.title) === slug}
                  onClick={() => {
                    change("slug", slugify(valuesRef.current.title));
                    document.getElementById(ARTICLE_FIELD_IDS.slug)?.focus();
                  }}
                >
                  Proposer à partir du titre
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <TextArea
          id={ARTICLE_FIELD_IDS.description}
          name="description"
          label="Description"
          hint={`Résumé de l’article, ${ARTICLE_LIMITS.description} caractères au plus.`}
          rows={3}
          maxLength={ARTICLE_LIMITS.description}
          value={values.description}
          onChange={(event) => change("description", event.target.value)}
          onBlur={saveOnBlur}
          error={errors.description}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id={ARTICLE_FIELD_IDS.category}
            name="category"
            label="Catégorie"
            hint={
              categories.length > 0
                ? "Texte libre ; les catégories déjà utilisées sont proposées pendant la saisie."
                : "Texte libre."
            }
            list={categories.length > 0 ? CATEGORIES_LIST_ID : undefined}
            autoComplete="off"
            maxLength={ARTICLE_LIMITS.category}
            value={values.category}
            onChange={(event) => change("category", event.target.value)}
            onBlur={saveOnBlur}
            error={errors.category}
          />
          {categories.length > 0 ? (
            <datalist id={CATEGORIES_LIST_ID}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          ) : null}
          <Field
            id={ARTICLE_FIELD_IDS.author}
            name="author"
            label="Auteur"
            hint="Prérempli avec le nom du profil à la création ; modifiable."
            autoComplete="off"
            maxLength={ARTICLE_LIMITS.author}
            value={values.author}
            onChange={(event) => change("author", event.target.value)}
            onBlur={saveOnBlur}
            error={errors.author}
          />
        </div>

        <MarkdownEditor
          id={ARTICLE_FIELD_IDS.content}
          name="content"
          label="Contenu (Markdown)"
          hint="Markdown : **gras**, _italique_, ## titre, [lien](https://…), `code`, - liste. Le HTML n’est pas interprété. Les images dans le corps de l’article ne sont pas prises en charge."
          maxLength={ARTICLE_LIMITS.content}
          value={values.content}
          onChange={(value) => change("content", value)}
          onBlur={saveOnBlur}
          error={errors.content}
        />

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton variant="secondary" icon={Check} pendingLabel="Enregistrement…">
            Enregistrer le brouillon
          </SubmitButton>
          {/* Annoncé poliment, seulement quand l'heure affichée change (pas à chaque frappe). */}
          <p role="status" className="text-sm font-semibold" suppressHydrationWarning>
            {status.kind === "conflict" ? "Enregistrement automatique arrêté" : savedLabel(savedAt)}
          </p>
          {status.kind === "saving" ? (
            <span aria-hidden="true" className="text-sm">
              Enregistrement en cours…
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
