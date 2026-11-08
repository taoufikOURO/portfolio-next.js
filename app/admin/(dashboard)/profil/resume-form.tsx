"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { FileField } from "@/components/admin/FileField";
import { FieldError } from "@/components/admin/field-parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { BODY_TOO_LARGE_MESSAGE, exceedsBodyLimit } from "@/components/admin/upload-guard";
import {
  PROFILE_MESSAGES,
  resumeInputFromFormData,
  resumeSchema,
  type ResumeFormState,
} from "@/lib/validation/profile";

import { saveResumeAction } from "./actions";

const URL_ID = "profil-cv-lien";
const FILE_ID = "profil-cv-fichier";
const REMOVE_ID = "profil-cv-supprimer";
const FIELDS = [
  ["resumeUrl", URL_ID],
  ["resumeFile", FILE_ID],
  ["removePdf", REMOVE_ID],
] as const;

export type ResumeFormProps = {
  /** Lien externe actuel, ou `null`. */
  resumeUrl: string | null;
  /** URL publique du PDF actuel, ou `null`. */
  pdfUrl: string | null;
};

/**
 * CV : un lien externe OU un PDF, jamais les deux. Le champ du lien est
 * prérempli avec le lien actuel ; pour envoyer un PDF, il faut donc le vider
 * (le formulaire refuse les deux à la fois, avec le même schéma que l'action).
 * Vider le champ sans choisir de fichier supprime le lien ; un PDF enregistré
 * est conservé, sauf si « Supprimer le PDF actuel » est coché.
 */
export function ResumeForm({ resumeUrl, pdfUrl }: ResumeFormProps) {
  const [state, formAction] = useActionState<ResumeFormState, FormData>(saveResumeAction, null);
  const { clientErrors, onSubmit: validateBeforeSend } = useClientValidation(
    resumeSchema,
    FIELDS,
    resumeInputFromFormData,
    state?.fieldErrors,
  );

  const [seenState, setSeenState] = useState(state);
  const [fileFieldKey, setFileFieldKey] = useState(0);
  const [fileEdited, setFileEdited] = useState(false);
  const [bodyTooLarge, setBodyTooLarge] = useState(false);
  if (seenState !== state) {
    setSeenState(state);
    setFileFieldKey((key) => key + 1);
    setFileEdited(false);
    setBodyTooLarge(false);
  }
  const [seenClientErrors, setSeenClientErrors] = useState(clientErrors);
  if (seenClientErrors !== clientErrors) {
    setSeenClientErrors(clientErrors);
    setFileEdited(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    validateBeforeSend(event);
    if (event.defaultPrevented) {
      setBodyTooLarge(false);
      return;
    }
    if (exceedsBodyLimit(new FormData(event.currentTarget))) {
      event.preventDefault();
      setBodyTooLarge(true);
      document.getElementById(FILE_ID)?.focus();
    } else {
      setBodyTooLarge(false);
    }
  }

  const fieldErrors = bodyTooLarge ? { resumeFile: BODY_TOO_LARGE_MESSAGE } : (clientErrors ?? state?.fieldErrors ?? {});
  const refused = bodyTooLarge || clientErrors !== null;
  const message = refused ? PROFILE_MESSAGES.formInvalid : state?.message;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !refused ? "success" : "error"}>{message}</Alert> : null}

      <Alert tone="info">
        Le CV est soit un lien externe, soit un PDF envoyé ici. Renseignez un seul des deux : le formulaire refuse les
        deux à la fois. Enregistrer l’un remplace l’autre.
      </Alert>

      <div className="flex flex-col gap-2">
        <p className="font-semibold">CV actuel</p>
        {pdfUrl ? (
          <p>
            PDF enregistré :{" "}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
              ouvrir le PDF<span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
            </a>
          </p>
        ) : resumeUrl ? (
          <p className="break-all">Lien externe : {resumeUrl}</p>
        ) : (
          <p>Aucun CV enregistré.</p>
        )}
      </div>

      <Field
        id={URL_ID}
        name="resumeUrl"
        type="text"
        inputMode="url"
        label="Lien externe vers le CV"
        hint="Par exemple https://exemple.fr/cv.pdf. « https:// » est ajouté s’il manque. À laisser vide si vous envoyez un PDF."
        autoComplete="off"
        defaultValue={state?.values?.resumeUrl ?? resumeUrl ?? ""}
        error={fieldErrors.resumeUrl}
        className="max-w-xl"
      />

      <FileField
        key={fileFieldKey}
        id={FILE_ID}
        name="resumeFile"
        kind="resume"
        label="PDF du CV"
        error={fileEdited && !bodyTooLarge ? undefined : fieldErrors.resumeFile}
        onFileChange={() => {
          setFileEdited(true);
          setBodyTooLarge(false);
        }}
        className="max-w-xl"
      />

      {pdfUrl ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={REMOVE_ID} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              id={REMOVE_ID}
              type="checkbox"
              name="removePdf"
              value="1"
              aria-invalid={fieldErrors.removePdf ? true : undefined}
              aria-describedby={fieldErrors.removePdf ? `${REMOVE_ID}-error` : undefined}
              className="size-5 shrink-0 cursor-pointer accent-slate-blue"
            />
            <span>Supprimer le PDF actuel (sans lien ni nouveau fichier)</span>
          </label>
          {fieldErrors.removePdf ? <FieldError id={`${REMOVE_ID}-error`}>{fieldErrors.removePdf}</FieldError> : null}
        </div>
      ) : null}

      <div>
        <SubmitButton icon={Check}>Enregistrer le CV</SubmitButton>
      </div>
    </form>
  );
}
