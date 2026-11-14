"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logUnexpectedError } from "@/lib/auth/log";
import { requireSession } from "@/lib/auth/require-session";
import { revalidatePublic } from "@/lib/public/revalidate";
import {
  getProfile,
  photoPathOf,
  saveProfileDetails,
  saveProfilePhotoPath,
  saveProfileResume,
} from "@/lib/profile";
import { removeFile } from "@/lib/storage/remove";
import { replaceFile } from "@/lib/storage/upload";
import { firstFieldErrors } from "@/lib/validation/auth";
import {
  decideResumeChange,
  photoInputFromFormData,
  photoSchema,
  PROFILE_MESSAGES,
  profileDetailsFromFormData,
  profileDetailsSchema,
  profileDetailsValues,
  resumeInputFromFormData,
  resumeSchema,
  type PhotoField,
  type PhotoFormState,
  type ProfileDetailsField,
  type ProfileDetailsFormState,
  type ResumeField,
  type ResumeFormState,
} from "@/lib/validation/profile";

import { PROFILE_PATH, type ProfileResult } from "./routes";

function revalidateSection() {
  revalidatePath(PROFILE_PATH, "layout");
  // Phase 2 : pages publiques concernées (E64).
  revalidatePublic("profile");
}

/** Supprime un ancien fichier du bucket `profile` ; `false` si le bucket l'a refusé (journalisé). */
async function removeProfileFile(path: string): Promise<boolean> {
  try {
    return await removeFile("profile", path);
  } catch (caught) {
    logUnexpectedError("Suppression d'un fichier du profil", caught);
    return false;
  }
}

/** Identité, textes et liens. Le profil est créé s'il n'existe pas, mis à jour sinon. */
export async function saveProfileDetailsAction(
  _previous: ProfileDetailsFormState,
  formData: FormData,
): Promise<ProfileDetailsFormState> {
  await requireSession();

  const values = profileDetailsValues(formData);
  const parsed = profileDetailsSchema.safeParse(profileDetailsFromFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: PROFILE_MESSAGES.formInvalid,
      fieldErrors: firstFieldErrors<ProfileDetailsField>(parsed.error),
      values,
    };
  }

  try {
    await saveProfileDetails(parsed.data);
  } catch (caught) {
    logUnexpectedError("Enregistrement du profil", caught);
    return { ok: false, message: PROFILE_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSection();
  redirect(`${PROFILE_PATH}?resultat=${"enregistre" satisfies ProfileResult}`);
}

/**
 * Photo ou photo détourée : le fichier est envoyé tel quel dans le bucket
 * `profile` (aucune compression ni conversion : la transparence d'un PNG est
 * conservée), son chemin est enregistré, puis l'ancien fichier est supprimé.
 */
export async function savePhotoAction(_previous: PhotoFormState, formData: FormData): Promise<PhotoFormState> {
  await requireSession();

  const parsed = photoSchema.safeParse(photoInputFromFormData(formData));
  if (!parsed.success) {
    const errors = firstFieldErrors<PhotoField | "slot">(parsed.error);
    if (errors.slot) return { ok: false, message: errors.slot, fieldErrors: {} };
    return { ok: false, message: PROFILE_MESSAGES.formInvalid, fieldErrors: { file: errors.file } };
  }
  const { slot, file } = parsed.data;

  let result: ProfileResult = slot === "photo" ? "photo" : "detouree";
  try {
    const current = await getProfile();
    const replaced = await replaceFile({
      bucket: "profile",
      kind: "image",
      file,
      previousPath: photoPathOf(current, slot),
      save: (path) => saveProfilePhotoPath(slot, path),
    });
    if (!replaced.ok) return { ok: false, message: PROFILE_MESSAGES.formInvalid, fieldErrors: { file: replaced.error } };
    if (!replaced.previousRemoved) result = slot === "photo" ? "photo-ancienne" : "detouree-ancienne";
  } catch (caught) {
    logUnexpectedError("Enregistrement d'une photo du profil", caught);
    return { ok: false, message: PROFILE_MESSAGES.unexpected, fieldErrors: {} };
  }

  revalidateSection();
  redirect(`${PROFILE_PATH}?resultat=${result}`);
}

/**
 * CV : un lien externe OU un PDF. Le schéma refuse les deux à la fois ; la base
 * ne reçoit jamais les deux (`saveProfileResume`). Le PDF remplacé, ou rendu
 * inutile par un lien, est supprimé du bucket après la mise à jour en base.
 */
export async function saveResumeAction(_previous: ResumeFormState, formData: FormData): Promise<ResumeFormState> {
  await requireSession();

  const rawUrl = formData.get("resumeUrl");
  const values = { resumeUrl: typeof rawUrl === "string" ? rawUrl.slice(0, 1000) : "" };
  const parsed = resumeSchema.safeParse(resumeInputFromFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: PROFILE_MESSAGES.formInvalid,
      fieldErrors: firstFieldErrors<ResumeField>(parsed.error),
      values,
    };
  }

  let result: ProfileResult;
  try {
    const current = await getProfile();
    const change = decideResumeChange(parsed.data, current);

    switch (change.kind) {
      case "keep":
        result = "cv-inchange";
        break;
      case "link": {
        await saveProfileResume({ url: change.url });
        const removed = current.resumePath ? await removeProfileFile(current.resumePath) : true;
        result = removed ? "cv-lien" : "cv-lien-ancien";
        break;
      }
      case "clear": {
        await saveProfileResume(null);
        const removed = current.resumePath ? await removeProfileFile(current.resumePath) : true;
        result = removed ? "cv-supprime" : "cv-supprime-ancien";
        break;
      }
      case "pdf": {
        const replaced = await replaceFile({
          bucket: "profile",
          kind: "resume",
          file: change.file,
          previousPath: current.resumePath,
          save: (path) => saveProfileResume({ path }),
        });
        if (!replaced.ok) {
          return { ok: false, message: PROFILE_MESSAGES.formInvalid, fieldErrors: { resumeFile: replaced.error }, values };
        }
        result = replaced.previousRemoved ? "cv-pdf" : "cv-pdf-ancien";
        break;
      }
    }
  } catch (caught) {
    logUnexpectedError("Enregistrement du CV", caught);
    return { ok: false, message: PROFILE_MESSAGES.unexpected, fieldErrors: {}, values };
  }

  revalidateSection();
  redirect(`${PROFILE_PATH}?resultat=${result}`);
}
