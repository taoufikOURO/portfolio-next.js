"use client";

import { useActionState, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { FileField } from "@/components/admin/FileField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { BODY_TOO_LARGE_MESSAGE, exceedsBodyLimit } from "@/components/admin/upload-guard";
import {
  photoInputFromFormData,
  photoSchema,
  PROFILE_MESSAGES,
  type PhotoFormState,
  type PhotoSlot,
} from "@/lib/validation/profile";

import { savePhotoAction } from "./actions";

export type PhotoFormProps = {
  slot: PhotoSlot;
  /** Libellé du champ et de l'image (« Photo », « Photo détourée »). */
  label: string;
  /** URL publique de l'image actuelle, ou absente si aucune n'est enregistrée. */
  currentUrl?: string;
};

/**
 * Photo du profil (un formulaire par image : le total des fichiers d'un envoi
 * ne peut pas dépasser 1 Mo, E52). Le fichier part tel quel, sans compression
 * ni conversion ; un fichier trop lourd est refusé avec un message sous le
 * champ. Un fichier ne peut pas être réaffiché après un refus du serveur.
 */
export function PhotoForm({ slot, label, currentUrl }: PhotoFormProps) {
  const fileId = `profil-${slot}-fichier`;
  const [state, formAction] = useActionState<PhotoFormState, FormData>(savePhotoAction, null);
  const { clientErrors, onSubmit: validateBeforeSend } = useClientValidation(
    photoSchema,
    [["file", fileId]] as const,
    photoInputFromFormData,
    state?.fieldErrors,
  );

  // Après chaque réponse du serveur, React vide le formulaire, fichier compris : le champ est recréé.
  const [seenState, setSeenState] = useState(state);
  const [fileFieldKey, setFileFieldKey] = useState(0);
  const [edited, setEdited] = useState(false);
  const [bodyTooLarge, setBodyTooLarge] = useState(false);
  if (seenState !== state) {
    setSeenState(state);
    setFileFieldKey((key) => key + 1);
    setEdited(false);
    setBodyTooLarge(false);
  }
  const [seenClientErrors, setSeenClientErrors] = useState(clientErrors);
  if (seenClientErrors !== clientErrors) {
    setSeenClientErrors(clientErrors);
    setEdited(false);
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
      document.getElementById(fileId)?.focus();
    } else {
      setBodyTooLarge(false);
    }
  }

  const fieldErrors = bodyTooLarge ? { file: BODY_TOO_LARGE_MESSAGE } : (clientErrors ?? state?.fieldErrors ?? {});
  const refused = bodyTooLarge || clientErrors !== null;
  const message = refused ? PROFILE_MESSAGES.formInvalid : state?.message;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !refused ? "success" : "error"}>{message}</Alert> : null}
      <input type="hidden" name="slot" value={slot} />

      <div className="flex flex-col gap-2">
        <p className="font-semibold">{label} actuelle</p>
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={`${label} actuelle`}
            width={160}
            height={160}
            unoptimized
            className="admin-thumb size-40 border border-line"
          />
        ) : (
          <p>Aucune image enregistrée.</p>
        )}
      </div>

      <FileField
        key={fileFieldKey}
        id={fileId}
        name="file"
        kind="image"
        label={currentUrl ? `Nouvelle ${label.toLowerCase()}` : label}
        required
        preview
        error={edited && !bodyTooLarge ? undefined : fieldErrors.file}
        onFileChange={() => {
          setEdited(true);
          setBodyTooLarge(false);
        }}
        className="max-w-xl"
      />
      <p className="text-sm">
        Le fichier est enregistré tel quel, sans compression ni conversion. Un PNG garde sa transparence.
        {currentUrl ? " Un nouveau fichier remplace l’ancien." : ""}
      </p>

      <div>
        <SubmitButton icon={Check}>{`Enregistrer la ${label.toLowerCase()}`}</SubmitButton>
      </div>
    </form>
  );
}
