import type { Metadata } from "next";

import { ResultAlert } from "@/components/admin/ResultAlert";
import { requireSession } from "@/lib/auth/require-session";
import { getProfile, profileFileUrl } from "@/lib/profile";

import { PhotoForm } from "./photo-form";
import { ProfileDetailsForm } from "./profile-details-form";
import { ResumeForm } from "./resume-form";
import { profileResultView } from "./routes";

export const metadata: Metadata = {
  title: "Profil",
};

const SECTION = "rounded-md border border-slate-blue/25 p-4 sm:p-6";

/**
 * Profil unique du site : identité et liens, photo, photo détourée, CV. Chaque
 * bloc a son formulaire et son action (un envoi de fichier ne peut pas dépasser
 * 1 Mo en tout, E52).
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession();
  const [profile, params] = await Promise.all([getProfile(), searchParams]);
  const result = profileResultView(params.resultat);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="mt-2">
          Un seul profil, présenté sur le site. Chaque bloc ci-dessous s’enregistre séparément.
        </p>
      </div>

      {result ? <ResultAlert tone={result.tone}>{result.message}</ResultAlert> : null}

      <section aria-labelledby="profil-identite" className={SECTION}>
        <h2 id="profil-identite" className="mb-6 text-xl font-bold">
          Identité et liens
        </h2>
        <ProfileDetailsForm profile={profile} />
      </section>

      <section aria-labelledby="profil-photo" className={SECTION}>
        <h2 id="profil-photo" className="mb-6 text-xl font-bold">
          Photo
        </h2>
        <PhotoForm slot="photo" label="Photo" currentUrl={profile.photoPath ? profileFileUrl(profile.photoPath) : undefined} />
      </section>

      <section aria-labelledby="profil-detouree" className={SECTION}>
        <h2 id="profil-detouree" className="mb-6 text-xl font-bold">
          Photo détourée
        </h2>
        <PhotoForm
          slot="cutout"
          label="Photo détourée"
          currentUrl={profile.cutoutPhotoPath ? profileFileUrl(profile.cutoutPhotoPath) : undefined}
        />
      </section>

      <section aria-labelledby="profil-cv" className={SECTION}>
        <h2 id="profil-cv" className="mb-6 text-xl font-bold">
          CV
        </h2>
        <ResumeForm
          resumeUrl={profile.resumeUrl}
          pdfUrl={profile.resumePath ? profileFileUrl(profile.resumePath) : null}
        />
      </section>
    </div>
  );
}
