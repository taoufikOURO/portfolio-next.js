"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";

import { Alert } from "@/components/admin/Alert";
import { ButtonLink } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { MultiSelect } from "@/components/admin/MultiSelect";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextArea } from "@/components/admin/TextArea";
import { useClientValidation } from "@/components/admin/use-client-validation";
import {
  EDUCATION_LIMITS,
  EDUCATION_MESSAGES,
  educationInputFromFormData,
  educationSchema,
  type EducationFormState,
  type EducationFormValues,
} from "@/lib/validation/education";

import { createEducationAction, updateEducationAction } from "./actions";
import { NEW_SKILL_FIELD_ID, NewSkillField } from "./new-skill-field";
import { EDUCATIONS_PATH } from "./routes";

const ID_PREFIX = "formation-";
const FIELDS = [
  ["title", `${ID_PREFIX}intitule`],
  ["institution", `${ID_PREFIX}etablissement`],
  ["location", `${ID_PREFIX}lieu`],
  ["startDate", `${ID_PREFIX}debut`],
  ["endDate", `${ID_PREFIX}fin`],
  ["honors", `${ID_PREFIX}mention`],
  ["grade", `${ID_PREFIX}moyenne`],
  ["description", `${ID_PREFIX}description`],
  // Pas d'identifiant : l'erreur des compétences reste affichée sous le groupe.
  ["skillIds", ""],
  ["newSkill", NEW_SKILL_FIELD_ID],
] as const;

const MONTH_HINT = "Mois et année. Si aucun calendrier ne s’affiche, saisissez AAAA-MM (par exemple 2021-09).";

export type EducationFormProps = {
  /** Absent : création. */
  educationId?: string;
  /** Valeurs initiales (formation existante), au format des champs. */
  initialValues?: EducationFormValues;
  skillOptions: { id: string; name: string }[];
};

/**
 * Formulaire d'une formation (création et modification). Validation avant
 * envoi avec le même schéma que l'action ; sans JavaScript, l'action valide
 * seule et renvoie les mêmes erreurs, avec la saisie.
 */
export function EducationForm({ educationId, initialValues, skillOptions }: EducationFormProps) {
  const [state, formAction] = useActionState<EducationFormState, FormData>(
    educationId ? updateEducationAction : createEducationAction,
    null,
  );
  const { clientErrors, onSubmit } = useClientValidation(educationSchema, FIELDS, educationInputFromFormData);

  const fieldErrors = clientErrors ?? state?.fieldErrors ?? {};
  const message = clientErrors ? EDUCATION_MESSAGES.formInvalid : state?.message;
  // Après un refus, React vide le formulaire : la saisie revient par `values`.
  const values = state?.values ?? initialValues;

  // Cases cochées (contrôlées) et compétences créées sur place avec « Créer et cocher ».
  const [selected, setSelected] = useState<string[]>(() => values?.skillIds ?? []);
  const [createdSkills, setCreatedSkills] = useState<{ id: string; name: string }[]>([]);
  const options = useMemo(() => {
    const byId = new Map([...skillOptions, ...createdSkills].map((skill) => [skill.id, skill]));
    return [...byId.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
      .map((skill) => ({ value: skill.id, label: skill.name }));
  }, [skillOptions, createdSkills]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {message ? <Alert tone={state?.ok && !clientErrors ? "success" : "error"}>{message}</Alert> : null}
      {educationId ? <input type="hidden" name="id" value={educationId} /> : null}

      <p className="text-sm">Les champs marqués d’un astérisque (*) sont obligatoires.</p>

      <Field
        id={fieldId("title")}
        name="title"
        label="Intitulé"
        required
        maxLength={EDUCATION_LIMITS.title}
        defaultValue={values?.title}
        error={fieldErrors.title}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={fieldId("institution")}
          name="institution"
          label="Établissement"
          required
          maxLength={EDUCATION_LIMITS.institution}
          defaultValue={values?.institution}
          error={fieldErrors.institution}
        />
        <Field
          id={fieldId("location")}
          name="location"
          label="Lieu"
          required
          maxLength={EDUCATION_LIMITS.location}
          defaultValue={values?.location}
          error={fieldErrors.location}
        />
      </div>

      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-2 p-0 font-semibold">Période</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id={fieldId("startDate")}
            name="startDate"
            type="month"
            label="Date de début"
            hint={MONTH_HINT}
            required
            min={`${EDUCATION_LIMITS.minYear}-01`}
            max={`${EDUCATION_LIMITS.maxYear}-12`}
            placeholder="AAAA-MM"
            defaultValue={values?.startDate}
            error={fieldErrors.startDate}
          />
          <Field
            id={fieldId("endDate")}
            name="endDate"
            type="month"
            label="Date de fin (facultative)"
            hint="Laisser vide si la formation est en cours. Ne peut pas précéder la date de début."
            min={`${EDUCATION_LIMITS.minYear}-01`}
            max={`${EDUCATION_LIMITS.maxYear}-12`}
            placeholder="AAAA-MM"
            defaultValue={values?.endDate}
            error={fieldErrors.endDate}
          />
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id={fieldId("honors")}
          name="honors"
          label="Mention (facultative)"
          maxLength={EDUCATION_LIMITS.honors}
          defaultValue={values?.honors}
          error={fieldErrors.honors}
        />
        <Field
          id={fieldId("grade")}
          name="grade"
          label="Moyenne sur 20 (facultative)"
          hint="Entre 0 et 20, deux décimales au plus (par exemple 14,5)."
          inputMode="decimal"
          autoComplete="off"
          defaultValue={values?.grade}
          error={fieldErrors.grade}
        />
      </div>

      <TextArea
        id={fieldId("description")}
        name="description"
        label="Description"
        required
        rows={5}
        maxLength={EDUCATION_LIMITS.description}
        defaultValue={values?.description}
        error={fieldErrors.description}
      />

      <MultiSelect
        name="skillIds"
        label="Compétences"
        hint="Une même compétence peut être rattachée à plusieurs formations."
        options={options}
        value={selected}
        onChange={setSelected}
        emptyMessage="Aucune compétence pour l’instant : créez-en une avec le champ « Nouvelle compétence » ci-dessous."
        error={fieldErrors.skillIds}
      />

      <NewSkillField
        defaultValue={values?.newSkill}
        error={fieldErrors.newSkill}
        onCreated={(skill) => {
          setCreatedSkills((current) => [...current, skill]);
          setSelected((current) => (current.includes(skill.id) ? current : [...current, skill.id]));
        }}
      />

      <div className="flex flex-wrap gap-3">
        <SubmitButton icon={educationId ? Check : Plus}>
          {educationId ? "Enregistrer les modifications" : "Ajouter la formation"}
        </SubmitButton>
        <ButtonLink href={EDUCATIONS_PATH} variant="secondary">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}

function fieldId(name: (typeof FIELDS)[number][0]): string {
  return FIELDS.find(([field]) => field === name)![1];
}
