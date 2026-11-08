"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { Field } from "@/components/admin/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextArea } from "@/components/admin/TextArea";
import { useClientValidation } from "@/components/admin/use-client-validation";
import {
  PROFILE_LIMITS,
  PROFILE_MESSAGES,
  profileDetailsFromFormData,
  profileDetailsSchema,
  type ProfileDetailsField,
  type ProfileDetailsFormState,
} from "@/lib/validation/profile";

import { saveProfileDetailsAction } from "./actions";

const IDS = {
  firstName: "profil-prenom",
  lastName: "profil-nom",
  email: "profil-email",
  jobTitle: "profil-titre",
  bio: "profil-bio",
  about: "profil-apropos",
  githubUrl: "profil-github",
  linkedinUrl: "profil-linkedin",
} as const satisfies Record<ProfileDetailsField, string>;

const FIELDS = (Object.entries(IDS) as [ProfileDetailsField, string][]).map(([name, id]) => [name, id] as const);

export type ProfileDetailsFormProps = {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    bio: string;
    about: string;
    githubUrl: string | null;
    linkedinUrl: string | null;
  };
};

/**
 * Identité, textes et liens du profil. Validation avant envoi avec le même
 * schéma que l'action ; sans JavaScript, l'action valide seule et renvoie les
 * mêmes erreurs, avec la saisie. Une adresse sans `https://` est complétée à
 * l'enregistrement.
 */
export function ProfileDetailsForm({ profile }: ProfileDetailsFormProps) {
  const [state, formAction] = useActionState<ProfileDetailsFormState, FormData>(saveProfileDetailsAction, null);
  const { clientErrors, onSubmit } = useClientValidation(
    profileDetailsSchema,
    FIELDS,
    profileDetailsFromFormData,
    state?.fieldErrors,
  );

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? PROFILE_MESSAGES.formInvalid : state?.message;
  const value = (name: ProfileDetailsField): string => state?.values?.[name] ?? profile[name] ?? "";

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !clientErrors ? "success" : "error"}>{message}</Alert> : null}

      <p className="text-sm">Les champs marqués d’un astérisque (*) sont obligatoires.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          id={IDS.firstName}
          name="firstName"
          label="Prénom"
          autoComplete="off"
          required
          defaultValue={value("firstName")}
          error={fieldErrors.firstName}
        />
        <Field
          id={IDS.lastName}
          name="lastName"
          label="Nom"
          autoComplete="off"
          required
          defaultValue={value("lastName")}
          error={fieldErrors.lastName}
        />
      </div>

      <Field
        id={IDS.email}
        name="email"
        type="email"
        label="Adresse e-mail de contact"
        hint="Adresse affichée sur le site. Elle n’a aucun lien avec l’adresse de connexion (page « Compte »)."
        autoComplete="off"
        required
        defaultValue={value("email")}
        error={fieldErrors.email}
        className="max-w-xl"
      />

      <Field
        id={IDS.jobTitle}
        name="jobTitle"
        label="Titre professionnel"
        autoComplete="off"
        required
        defaultValue={value("jobTitle")}
        error={fieldErrors.jobTitle}
        className="max-w-xl"
      />

      <TextArea
        id={IDS.bio}
        name="bio"
        label="Bio"
        hint={`Présentation courte, ${PROFILE_LIMITS.bio} caractères au plus.`}
        rows={3}
        defaultValue={value("bio")}
        error={fieldErrors.bio}
        className="max-w-3xl"
      />

      <TextArea
        id={IDS.about}
        name="about"
        label="À propos"
        hint={`Présentation longue, ${PROFILE_LIMITS.about} caractères au plus.`}
        rows={8}
        defaultValue={value("about")}
        error={fieldErrors.about}
        className="max-w-3xl"
      />

      <Field
        id={IDS.githubUrl}
        name="githubUrl"
        type="text"
        inputMode="url"
        label="GitHub"
        hint="Adresse de votre profil, par exemple https://github.com/votre-nom. « https:// » est ajouté s’il manque."
        autoComplete="off"
        defaultValue={value("githubUrl")}
        error={fieldErrors.githubUrl}
        className="max-w-xl"
      />

      <Field
        id={IDS.linkedinUrl}
        name="linkedinUrl"
        type="text"
        inputMode="url"
        label="LinkedIn"
        hint="Adresse de votre profil, par exemple https://www.linkedin.com/in/votre-nom. « https:// » est ajouté s’il manque."
        autoComplete="off"
        defaultValue={value("linkedinUrl")}
        error={fieldErrors.linkedinUrl}
        className="max-w-xl"
      />

      <div>
        <SubmitButton icon={Check}>Enregistrer le profil</SubmitButton>
      </div>
    </form>
  );
}
