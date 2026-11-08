"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, Plus } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { FileField } from "@/components/admin/FileField";
import { MultiSelect } from "@/components/admin/MultiSelect";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextArea } from "@/components/admin/TextArea";
import { FieldError } from "@/components/admin/field-parts";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { useHydrated } from "@/components/admin/use-hydrated";
import { BODY_TOO_LARGE_MESSAGE, exceedsBodyLimit } from "@/components/admin/upload-guard";
import { slugify, SLUG_MAX_LENGTH } from "@/lib/slug";
import { firstFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  createProjectSchema,
  GITHUB_USERNAME_MAX_LENGTH,
  linkErrorRow,
  needsSlugChangeConfirmation,
  PROJECT_FIELDS,
  PROJECT_LIMITS,
  PROJECT_MESSAGES,
  projectInputFromFormData,
  publishedSlugChangeMessage,
  updateProjectSchema,
  type ProjectField,
  type ProjectFormState,
  type ProjectFormValues,
} from "@/lib/validation/project";

import { createProjectAction, updateProjectAction } from "./actions";
import { linkLabelId, LinksField } from "./links-field";
import { PROJECTS_PATH } from "./routes";

const IDS = {
  title: "projet-titre",
  slug: "projet-slug",
  confirmSlugChange: "projet-slug-confirmation",
  description: "projet-description",
  date: "projet-date",
  image: "projet-image",
  // Pas d'identifiant fixe : le focus va à la ligne visée par l'erreur (voir `focusFirstError`).
  links: "",
  technologyIds: "",
  collaborators: "projet-collaborateurs",
} as const satisfies Record<ProjectField, string>;

const FIELDS = PROJECT_FIELDS.map((field) => [field, IDS[field]] as const);

const EMPTY_VALUES: ProjectFormValues = {
  title: "",
  slug: "",
  confirmSlugChange: "",
  description: "",
  date: "",
  collaborators: "",
  technologyIds: [],
  links: [],
};

/** Le premier champ en erreur (ordre d'affichage) reçoit le focus ; pour les liens, la ligne visée. */
function focusFirstError(errors: FieldErrors<ProjectField>) {
  const first = PROJECT_FIELDS.find((field) => errors[field]);
  if (first !== "links") return;
  const row = linkErrorRow(errors.links);
  document.getElementById(linkLabelId(row === null ? 0 : row - 1))?.focus();
}

export type ProjectFormProps = {
  /**
   * Projet modifié ; absent : création. `publishedSlug` : slug enregistré d'un
   * projet publié (le modifier exige une confirmation explicite, E54 point 5).
   */
  project?: { id: string; title: string; imageUrl: string | null; publishedSlug?: string };
  initialValues?: ProjectFormValues;
  technologyOptions: { id: string; name: string }[];
};

/**
 * Formulaire d'un projet (création et modification) : informations, image,
 * liens, technologies et collaborateurs, enregistrés par le bouton. Le statut
 * n'en fait pas partie (page de confirmation). Validation avant envoi avec le
 * même schéma que l'action ; sans JavaScript, l'action valide seule et
 * renvoie les mêmes erreurs, avec la saisie (sauf le fichier, à choisir de nouveau).
 */
export function ProjectForm({ project, initialValues, technologyOptions }: ProjectFormProps) {
  const editing = Boolean(project);
  const schema = editing ? updateProjectSchema : createProjectSchema;
  const [state, formAction] = useActionState<ProjectFormState, FormData>(
    editing ? updateProjectAction : createProjectAction,
    null,
  );
  const { clientErrors, onSubmit: validateBeforeSend } = useClientValidation(
    schema,
    FIELDS,
    projectInputFromFormData,
    state?.fieldErrors,
  );

  // Après chaque réponse du serveur, React vide le formulaire : les champs sont recréés avec la saisie renvoyée.
  const [seenState, setSeenState] = useState(state);
  const [formKey, setFormKey] = useState(0);
  const [imageEdited, setImageEdited] = useState(false);
  // Un fichier juste sous 1 Mo peut, avec le reste du formulaire, dépasser la limite du corps d'une Server Action
  // (1 Mo) : l'envoi est alors évité et le message s'affiche sous le champ (E52).
  const [bodyTooLarge, setBodyTooLarge] = useState(false);
  // Même règle que le serveur pour le slug d'un projet publié, appliquée avant l'envoi.
  const [slugConfirmError, setSlugConfirmError] = useState<string | null>(null);
  if (seenState !== state) {
    setSeenState(state);
    setFormKey((key) => key + 1);
    setImageEdited(false);
    setBodyTooLarge(false);
    setSlugConfirmError(null);
  }
  const [seenClientErrors, setSeenClientErrors] = useState(clientErrors);
  if (seenClientErrors !== clientErrors) {
    setSeenClientErrors(clientErrors);
    setImageEdited(false);
  }

  // Erreur d'un lien renvoyée par le serveur : focus sur la ligne visée (après celui de `useClientValidation`).
  useEffect(() => {
    if (state?.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    validateBeforeSend(event);
    if (event.defaultPrevented) {
      setBodyTooLarge(false);
      setSlugConfirmError(null);
      const result = schema.safeParse(projectInputFromFormData(new FormData(event.currentTarget)));
      if (!result.success) focusFirstError(firstFieldErrors<ProjectField>(result.error));
      return;
    }
    const publishedSlug = project?.publishedSlug;
    if (publishedSlug !== undefined) {
      const parsed = schema.safeParse(projectInputFromFormData(new FormData(event.currentTarget)));
      if (
        parsed.success &&
        needsSlugChangeConfirmation({
          isPublished: true,
          currentSlug: publishedSlug,
          nextSlug: parsed.data.slug,
          confirmed: parsed.data.confirmSlugChange,
        })
      ) {
        event.preventDefault();
        setBodyTooLarge(false);
        setSlugConfirmError(publishedSlugChangeMessage(publishedSlug, parsed.data.slug));
        document.getElementById(IDS.confirmSlugChange)?.focus();
        return;
      }
    }
    setSlugConfirmError(null);
    if (exceedsBodyLimit(new FormData(event.currentTarget))) {
      event.preventDefault();
      setBodyTooLarge(true);
      document.getElementById(IDS.image)?.focus();
    } else {
      setBodyTooLarge(false);
    }
  }

  const fieldErrors: FieldErrors<ProjectField> = bodyTooLarge
    ? { image: BODY_TOO_LARGE_MESSAGE }
    : slugConfirmError
      ? { confirmSlugChange: slugConfirmError }
      : (clientErrors ?? state?.fieldErrors ?? {});
  const refused = bodyTooLarge || slugConfirmError !== null || clientErrors !== null;
  const message = refused ? PROJECT_MESSAGES.formInvalid : state?.message;
  const values = state?.values ?? initialValues ?? EMPTY_VALUES;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !refused ? "success" : "error"}>{message}</Alert> : null}
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <p className="text-sm">Les champs marqués d’un astérisque (*) sont obligatoires.</p>

      <TitleAndSlug
        key={`titre-${formKey}`}
        values={values}
        // En modification, le slug enregistré ne suit pas le titre : il ne change que si on le modifie.
        followTitle={!editing && values.slug === ""}
        publishedSlug={project?.publishedSlug}
        errors={fieldErrors}
      />

      <TextArea
        key={`description-${formKey}`}
        id={IDS.description}
        name="description"
        label="Description"
        required
        rows={6}
        maxLength={PROJECT_LIMITS.description}
        defaultValue={values.description}
        error={fieldErrors.description}
      />

      <Field
        key={`date-${formKey}`}
        id={IDS.date}
        name="date"
        type="month"
        label="Date (facultative)"
        hint="Mois et année. Si aucun calendrier ne s’affiche, saisissez AAAA-MM (par exemple 2024-06)."
        min={`${PROJECT_LIMITS.minYear}-01`}
        max={`${PROJECT_LIMITS.maxYear}-12`}
        placeholder="AAAA-MM"
        defaultValue={values.date}
        error={fieldErrors.date}
        className="max-w-xs"
      />

      {project ? (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Image actuelle</p>
          {project.imageUrl ? (
            <Image
              src={project.imageUrl}
              alt={`Image actuelle du projet ${project.title}`}
              width={320}
              height={180}
              unoptimized
              className="h-auto w-full max-w-xs rounded-md border border-slate-blue/25 object-contain"
            />
          ) : (
            <p>Aucune image enregistrée.</p>
          )}
        </div>
      ) : null}

      <FileField
        key={`image-${formKey}`}
        id={IDS.image}
        name="image"
        kind="image"
        label={project?.imageUrl ? "Nouvelle image (facultative)" : "Image (facultative)"}
        preview
        error={imageEdited && !bodyTooLarge ? undefined : fieldErrors.image}
        onFileChange={() => {
          setImageEdited(true);
          setBodyTooLarge(false);
        }}
        className="max-w-xl"
      />
      {project?.imageUrl ? (
        <p className="text-sm">Sans nouveau fichier, l’image actuelle est conservée. Un nouveau fichier remplace l’ancien.</p>
      ) : null}

      <LinksField key={`liens-${formKey}`} initialLinks={values.links} error={fieldErrors.links} />

      <MultiSelect
        key={`technologies-${formKey}`}
        name="technologyIds"
        label="Technologies"
        hint="Choisies parmi celles de la section « Stack »."
        options={technologyOptions.map((technology) => ({ value: technology.id, label: technology.name }))}
        defaultValue={values.technologyIds}
        emptyMessage="Aucune technologie pour l’instant : ajoutez-en depuis la section « Stack »."
        error={fieldErrors.technologyIds}
      />

      <TextArea
        key={`collaborateurs-${formKey}`}
        id={IDS.collaborators}
        name="collaborators"
        label="Collaborateurs (facultatifs)"
        hint={`Un nom d’utilisateur GitHub par ligne, ${PROJECT_LIMITS.collaborators} au plus (les doublons sont ignorés). Lettres sans accent, chiffres et tirets, ${GITHUB_USERNAME_MAX_LENGTH} caractères au plus, sans tiret au début, à la fin ni deux de suite. Le nom et l’avatar sont récupérés depuis GitHub pour un nouveau collaborateur.`}
        rows={5}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
        maxLength={PROJECT_LIMITS.collaboratorsText}
        defaultValue={values.collaborators}
        error={fieldErrors.collaborators}
        className="max-w-xl"
      />

      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={editing ? Check : Plus}>
          {editing ? "Enregistrer les modifications" : "Créer le projet"}
        </SubmitButton>
        <ButtonLink href={PROJECTS_PATH} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}

/**
 * Titre et slug. Tant que le slug n'a pas été modifié à la main (création),
 * il suit le titre. Sans JavaScript, un slug laissé vide est généré par le serveur.
 */
function TitleAndSlug({
  values,
  followTitle,
  publishedSlug,
  errors,
}: {
  values: ProjectFormValues;
  followTitle: boolean;
  publishedSlug?: string;
  errors: FieldErrors<ProjectField>;
}) {
  const hydrated = useHydrated();
  const [slug, setSlug] = useState(values.slug);
  const [follow, setFollow] = useState(followTitle);
  // Sans JavaScript, la case est toujours proposée pour un projet publié ; avec JavaScript, dès que le slug
  // diffère de l'adresse publiée (ou après un refus qui la concerne).
  const showConfirmation =
    publishedSlug !== undefined && (!hydrated || slug.trim() !== publishedSlug || Boolean(errors.confirmSlugChange));

  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6 sm:grid-cols-2">
      <Field
        id={IDS.title}
        name="title"
        label="Titre"
        required
        maxLength={PROJECT_LIMITS.title}
        defaultValue={values.title}
        onChange={(event) => {
          if (follow) setSlug(slugify(event.target.value));
        }}
        error={errors.title}
      />
      <Field
        id={IDS.slug}
        name="slug"
        label="Slug (adresse du projet)"
        hint={`Généré depuis le titre et modifiable : minuscules sans accent, chiffres et tirets, ${SLUG_MAX_LENGTH} caractères au plus. Laissé vide, il est généré à l’enregistrement. Deux projets ne peuvent pas avoir le même slug.`}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="none"
        maxLength={SLUG_MAX_LENGTH}
        value={slug}
        onChange={(event) => {
          setSlug(event.target.value);
          setFollow(event.target.value === "");
        }}
        error={errors.slug}
      />
    </div>
      {showConfirmation ? (
        <div className="flex flex-col gap-2 rounded-md border border-slate-blue p-4">
          <p className="text-sm">
            Ce projet est publié à l’adresse /projets/{publishedSlug}. Modifier le slug changera son adresse publique :
            les liens existants vers l’ancienne adresse ne fonctionneront plus.
          </p>
          <label htmlFor={IDS.confirmSlugChange} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              id={IDS.confirmSlugChange}
              type="checkbox"
              name="confirmSlugChange"
              value="1"
              defaultChecked={values.confirmSlugChange === "1"}
              aria-invalid={errors.confirmSlugChange ? true : undefined}
              aria-describedby={errors.confirmSlugChange ? `${IDS.confirmSlugChange}-error` : undefined}
              className="size-5 shrink-0 cursor-pointer accent-slate-blue"
            />
            <span>Je confirme le changement d’adresse publique</span>
          </label>
          {errors.confirmSlugChange ? (
            <FieldError id={`${IDS.confirmSlugChange}-error`}>{errors.confirmSlugChange}</FieldError>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
