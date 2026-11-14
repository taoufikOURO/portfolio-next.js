"use client";

import { useActionState, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, Plus } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { FileField } from "@/components/admin/FileField";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { useClientValidation } from "@/components/admin/use-client-validation";
import { BODY_TOO_LARGE_MESSAGE, exceedsBodyLimit } from "@/components/admin/upload-guard";
import {
  createTechnologySchema,
  TECHNOLOGY_MESSAGES,
  TECHNOLOGY_NAME_MAX_LENGTH,
  technologyInputFromFormData,
  updateTechnologySchema,
  type TechnologyFormState,
} from "@/lib/validation/technology";

import { createTechnologyAction, updateTechnologyAction } from "./actions";
import { STACK_PATH } from "./routes";

const NAME_ID = "technologie-nom";
const ICON_ID = "technologie-icone";
const FIELDS = [
  ["name", NAME_ID],
  ["icon", ICON_ID],
] as const;

export type TechnologyFormProps = {
  /** Technologie modifiée ; absente : création. */
  technology?: { id: string; name: string; iconUrl: string };
};

/**
 * Formulaire d'une technologie (création et modification). Validation avant
 * envoi avec le même schéma que l'action ; sans JavaScript, l'action valide
 * seule et renvoie les mêmes erreurs, avec le nom saisi. Un fichier ne peut
 * pas être réaffiché après un refus : il faut le choisir de nouveau.
 */
export function TechnologyForm({ technology }: TechnologyFormProps) {
  const editing = Boolean(technology);
  const [state, formAction] = useActionState<TechnologyFormState, FormData>(
    editing ? updateTechnologyAction : createTechnologyAction,
    null,
  );
  const { clientErrors, onSubmit: validateBeforeSend } = useClientValidation(
    editing ? updateTechnologySchema : createTechnologySchema,
    FIELDS,
    technologyInputFromFormData,
    state?.fieldErrors,
  );

  // Après chaque réponse du serveur, React vide le formulaire, fichier compris :
  // le champ est recréé pour ne plus afficher un fichier qui n'est plus joint.
  const [seenState, setSeenState] = useState(state);
  const [fileFieldKey, setFileFieldKey] = useState(0);
  // Une erreur d'icône (serveur ou avant envoi) cesse d'être affichée dès qu'un autre fichier est choisi : sinon
  // elle masquerait le contrôle du champ (taille, type) et resterait à l'écran après un bon choix.
  const [iconEdited, setIconEdited] = useState(false);
  // Un fichier juste sous 1 Mo peut, avec le reste du formulaire, dépasser la limite du corps d'une Server Action
  // (1 Mo) : Next.js ferait planter la page. L'envoi est alors évité et le message s'affiche sous le champ (E52).
  const [bodyTooLarge, setBodyTooLarge] = useState(false);
  if (seenState !== state) {
    setSeenState(state);
    setFileFieldKey((key) => key + 1);
    setIconEdited(false);
    setBodyTooLarge(false);
  }
  const [seenClientErrors, setSeenClientErrors] = useState(clientErrors);
  if (seenClientErrors !== clientErrors) {
    setSeenClientErrors(clientErrors);
    setIconEdited(false);
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
      document.getElementById(ICON_ID)?.focus();
    } else {
      setBodyTooLarge(false);
    }
  }

  const fieldErrors = bodyTooLarge ? { icon: BODY_TOO_LARGE_MESSAGE } : (clientErrors ?? state?.fieldErrors ?? {});
  const refused = bodyTooLarge || clientErrors !== null;
  const message = refused ? TECHNOLOGY_MESSAGES.formInvalid : state?.message;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="admin-card flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !refused ? "success" : "error"}>{message}</Alert> : null}
      {technology ? <input type="hidden" name="id" value={technology.id} /> : null}

      <p className="text-sm">Les champs marqués d’un astérisque (*) sont obligatoires.</p>

      <Field
        id={NAME_ID}
        name="name"
        label="Nom"
        hint={`${TECHNOLOGY_NAME_MAX_LENGTH} caractères au plus. Deux technologies ne peuvent pas porter le même nom, même avec des majuscules, des accents ou des espaces différents.`}
        autoComplete="off"
        required
        defaultValue={state?.values?.name ?? technology?.name}
        error={fieldErrors.name}
        className="max-w-xl"
      />

      {technology ? (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Icône actuelle</p>
          <Image
            src={technology.iconUrl}
            alt={`Icône actuelle de ${technology.name}`}
            width={64}
            height={64}
            unoptimized
            className="admin-thumb size-16 border border-line"
          />
        </div>
      ) : null}

      <FileField
        key={fileFieldKey}
        id={ICON_ID}
        name="icon"
        kind="icon"
        label={editing ? "Nouvelle icône (facultative)" : "Icône"}
        required={!editing}
        preview
        error={iconEdited && !bodyTooLarge ? undefined : fieldErrors.icon}
        onFileChange={() => {
          setIconEdited(true);
          setBodyTooLarge(false);
        }}
        className="max-w-xl"
      />
      {editing ? (
        <p className="text-sm">Sans nouveau fichier, l’icône actuelle est conservée. Un nouveau fichier remplace l’ancien.</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={editing ? Check : Plus}>
          {editing ? "Enregistrer les modifications" : "Ajouter la technologie"}
        </SubmitButton>
        <ButtonLink href={STACK_PATH} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
