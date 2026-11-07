"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifyEmail } from "@/lib/auth/account";
import { logUnexpectedError } from "@/lib/auth/log";
import { ADMIN_HOME_PATH, EMAIL_VERIFICATION_PATH } from "@/lib/auth/routes";
import { ACCOUNT_MESSAGES, verifyEmailSchema, type ActionState } from "@/lib/validation/auth";

import { LINK_FAILURE_MESSAGES, linkResultPath, type LinkResult } from "../link-messages";

export type VerifyEmailState = ActionState<"token">;

/**
 * Validation d'adresse par lien. Accessible sans session : le jeton du lien
 * est la preuve (le lien peut être ouvert sur un autre appareil). Appelée par
 * le bouton de la page, jamais à l'ouverture du lien : un logiciel qui
 * pré-ouvre les liens d'un e-mail ne consomme donc pas le jeton (E47).
 *
 * En cas de succès, redirection vers la page sans jeton (`?resultat=…`) :
 * rendue de nouveau avec le jeton, désormais utilisé, la page afficherait
 * « lien déjà utilisé » au lieu du succès (E47).
 */
export async function verifyEmailAction(
  _previous: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const parsed = verifyEmailSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return { ok: false, message: ACCOUNT_MESSAGES.tokenInvalid, fieldErrors: {} };
  }

  let outcome: LinkResult;
  try {
    const result = await verifyEmail(parsed.data.token);
    switch (result.status) {
      case "verified":
        outcome = "adresse-validee";
        break;
      case "changed":
        outcome = "adresse-modifiee";
        break;
      case "unavailable":
        return { ok: false, message: ACCOUNT_MESSAGES.newEmailUnavailable, fieldErrors: {} };
      default:
        return { ok: false, message: LINK_FAILURE_MESSAGES[result.status], fieldErrors: {} };
    }
  } catch (error) {
    logUnexpectedError("Validation d'adresse", error);
    return { ok: false, message: ACCOUNT_MESSAGES.unexpected, fieldErrors: {} };
  }

  // Bannière, adresse affichée dans la barre latérale, page « Compte ».
  revalidatePath(ADMIN_HOME_PATH, "layout");
  // Hors du try : `redirect` fonctionne en levant une exception.
  redirect(linkResultPath(EMAIL_VERIFICATION_PATH, outcome));
}
