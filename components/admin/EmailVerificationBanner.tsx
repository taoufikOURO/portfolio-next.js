"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Send, TriangleAlert } from "lucide-react";

import type { ActionState } from "@/lib/validation/auth";

import { SubmitButton } from "./SubmitButton";

type ResendState = ActionState<never>;

/**
 * Bannière persistante tant que l'adresse du compte n'est pas validée
 * (cahier §3.1), en haut de chaque page de l'administration. Fond sable,
 * texte bleu-gris (6,63) : rôle « avertissement » du plan §3.3. Le bouton
 * « Renvoyer le lien » appelle l'action passée par le layout serveur.
 * Le résultat est annoncé (`role="status"`), avec icône et libellé explicite.
 */
export function EmailVerificationBanner({
    email,
    resendAction,
}: {
    email: string;
    /** Action serveur (passée telle quelle : le formulaire marche aussi sans JavaScript). */
    resendAction: (previous: ResendState, formData: FormData) => Promise<ResendState>;
}) {
    const [state, formAction] = useActionState<ResendState, FormData>(resendAction, null);
    const ResultIcon = state?.ok ? CircleCheck : CircleAlert;

    return (
        <section
            aria-labelledby="banniere-validation-titre"
            className="mb-8 flex flex-col gap-3 rounded-md border border-l-8 border-slate-blue/25 border-l-slate-blue bg-sand p-4 text-slate-blue"
        >
            <div className="flex items-start gap-3">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0">
                    <h2 id="banniere-validation-titre" className="font-bold">
                        Attention : adresse e-mail non validée
                    </h2>
                    <p className="mt-1">
                        Ouvrez le lien envoyé à <strong className="break-all">{email}</strong> pour
                        valider l’adresse du compte. Lien introuvable ou expiré ? Demandez-en un
                        nouveau.
                    </p>
                </div>
            </div>
            <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SubmitButton
                    variant="secondary"
                    icon={Send}
                    pendingLabel="Envoi en cours…"
                    className="self-start"
                >
                    Renvoyer le lien
                </SubmitButton>
                <p role="status" className="flex items-start gap-2">
                    {state ? (
                        <>
                            <ResultIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                            <span>
                                <strong>{state.ok ? "Succès" : "Erreur"} :</strong> {state.message}
                            </span>
                        </>
                    ) : null}
                </p>
            </form>
        </section>
    );
}
