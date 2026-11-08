import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { getStorageContext, publicUrlFor } from "@/lib/storage/client";
import type { PhotoSlot, ProfileDetailsInput } from "@/lib/validation/profile";

// Profil (cahier §3.5) : un seul enregistrement, d'identifiant 1, créé par le
// seed. Il n'est jamais dupliqué : chaque écriture est un `upsert` sur cet
// identifiant (créé s'il manque, mis à jour sinon). Les fichiers (photos, PDF)
// sont pilotés par les actions avec `lib/storage/` : ce module ne touche que
// la base.

/** Identifiant de l'unique ligne du profil (même valeur que le seed). */
export const PROFILE_ID = 1;

export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  bio: string;
  about: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  /** Chemins dans le bucket `profile` ; les URL sont calculées à l'affichage (E11). */
  photoPath: string | null;
  cutoutPhotoPath: string | null;
  /** Lien externe du CV, ou chemin du PDF : jamais les deux. */
  resumeUrl: string | null;
  resumePath: string | null;
};

const PROFILE_SELECT = {
  firstName: true,
  lastName: true,
  email: true,
  jobTitle: true,
  bio: true,
  about: true,
  githubUrl: true,
  linkedinUrl: true,
  photoPath: true,
  cutoutPhotoPath: true,
  resumeUrl: true,
  resumePath: true,
} satisfies Prisma.ProfileSelect;

/** Profil vide, affiché tant qu'aucun enregistrement n'existe (la lecture ne crée rien). */
export const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  bio: "",
  about: "",
  githubUrl: null,
  linkedinUrl: null,
  photoPath: null,
  cutoutPhotoPath: null,
  resumeUrl: null,
  resumePath: null,
};

export async function getProfile(): Promise<Profile> {
  const row = await db.profile.findUnique({ where: { id: PROFILE_ID }, select: PROFILE_SELECT });
  return row ?? EMPTY_PROFILE;
}

/**
 * Crée le profil s'il n'existe pas, le met à jour sinon. Si deux créations
 * simultanées se croisent, la seconde échoue sur la clé primaire (`P2002`) :
 * elle est rejouée une fois, et devient alors une mise à jour.
 */
async function upsertProfile(data: Prisma.ProfileUncheckedUpdateInput): Promise<void> {
  const write = () =>
    db.profile.upsert({
      where: { id: PROFILE_ID },
      create: { ...(data as Prisma.ProfileUncheckedCreateInput), id: PROFILE_ID },
      update: data,
      select: { id: true },
    });
  try {
    await write();
  } catch (caught) {
    if (!isUniqueViolation(caught)) throw caught;
    await write();
  }
}

/** Identité, textes et liens (les champs vides des liens deviennent `null`). */
export async function saveProfileDetails(details: ProfileDetailsInput): Promise<void> {
  await upsertProfile({ ...details });
}

/** Enregistre le chemin d'une photo (`photo` ou `cutout`). */
export async function saveProfilePhotoPath(slot: PhotoSlot, path: string): Promise<void> {
  await upsertProfile(slot === "photo" ? { photoPath: path } : { cutoutPhotoPath: path });
}

/** Chemin actuel d'une photo. */
export function photoPathOf(profile: Pick<Profile, "photoPath" | "cutoutPhotoPath">, slot: PhotoSlot): string | null {
  return slot === "photo" ? profile.photoPath : profile.cutoutPhotoPath;
}

/**
 * Enregistre le CV : lien externe OU PDF, l'autre est toujours remis à `null`
 * (jamais les deux en base). `null` : plus de CV.
 */
export async function saveProfileResume(resume: { url: string } | { path: string } | null): Promise<void> {
  await upsertProfile({
    resumeUrl: resume && "url" in resume ? resume.url : null,
    resumePath: resume && "path" in resume ? resume.path : null,
  });
}

/** URL publique d'un fichier du bucket `profile`, calculée à l'affichage à partir du chemin enregistré (E11). */
export function profileFileUrl(path: string): string {
  return publicUrlFor(getStorageContext().config, "profile", path);
}
