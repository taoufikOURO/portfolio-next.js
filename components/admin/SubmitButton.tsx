"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./Button";

export type SubmitButtonProps = Omit<ButtonProps, "type"> & {
    /** Libellé pendant l'envoi. */
    pendingLabel?: string;
    /** Force l'état « en cours » (ex. `useTransition`), en plus de celui du formulaire. */
    pending?: boolean;
};

/**
 * Bouton d'envoi d'un formulaire. Pendant l'envoi : spinner, libellé « en
 * cours », envois multiples bloqués et état annoncé aux lecteurs d'écran.
 * Utilise `aria-disabled` plutôt que `disabled` pour que le focus reste sur
 * le bouton.
 */
export function SubmitButton({
    children,
    pendingLabel = "Enregistrement en cours…",
    pending: pendingProp = false,
    icon,
    onClick,
    ...props
}: SubmitButtonProps) {
    const { pending: formPending } = useFormStatus();
    const pending = pendingProp || formPending;

    return (
        <>
            <Button
                {...props}
                type="submit"
                icon={pending ? undefined : icon}
                aria-disabled={pending || undefined}
                onClick={(event) => {
                    if (pending) {
                        event.preventDefault();
                        return;
                    }
                    onClick?.(event);
                }}
            >
                {pending ? (
                    <>
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-5 shrink-0 motion-safe:animate-spin"
                        />
                        {pendingLabel}
                    </>
                ) : (
                    children
                )}
            </Button>
            <span role="status" className="sr-only">
                {pending ? pendingLabel : ""}
            </span>
        </>
    );
}
