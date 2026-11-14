import type { ComponentProps } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "destructive";

/**
 * Boutons pilule (étape 18, E60) :
 * - principal : texte blanc sur noir (19,14) ;
 * - secondaire : bordure noire fine, texte noir sur blanc (19,14) ;
 * - destructif : texte noir sur corail (6,70).
 * Hauteur minimale 44 px. Survol : fond légèrement modifié et soulèvement de
 * 1 px ; clic : échelle 0,98 (150 ms, E61). Le soulèvement et l'échelle
 * n'existent que sans « réduire les animations » (`motion-safe`), et jamais sur
 * un bouton désactivé. Focus : anneau noir de 2 px décalé (admin.css).
 * Désactivé : fond gris, texte secondaire (jamais une simple baisse d'opacité).
 */
const VARIANTS: Record<ButtonVariant, string> = {
    primary: "border-ink bg-ink text-panel hover:border-ink-hover hover:bg-ink-hover",
    secondary: "border-ink bg-panel text-ink hover:bg-card",
    destructive: "border-coral bg-coral text-ink hover:border-coral-hover hover:bg-coral-hover",
};

export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
    return cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2 text-base leading-tight font-medium no-underline",
        "transition-[color,background-color,border-color,translate,scale] duration-150 ease-out",
        "motion-safe:not-disabled:not-aria-disabled:hover:-translate-y-px motion-safe:not-disabled:not-aria-disabled:active:scale-[0.98]",
        VARIANTS[variant],
        "disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-muted",
        "aria-disabled:cursor-not-allowed",
        className,
    );
}

export type ButtonProps = ComponentProps<"button"> & {
    variant?: ButtonVariant;
    /** Icône Lucide affichée avant le libellé (décorative). */
    icon?: LucideIcon;
};

export function Button({
    variant = "primary",
    icon: Icon,
    type = "button",
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button type={type} className={buttonStyles(variant, className)} {...props}>
            {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
            {children}
        </button>
    );
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
    variant?: ButtonVariant;
    icon?: LucideIcon;
};

/** Lien de navigation qui a l'apparence d'un bouton (ex. « Nouvel article »). */
export function ButtonLink({
    variant = "primary",
    icon: Icon,
    className,
    children,
    ...props
}: ButtonLinkProps) {
    return (
        <Link className={buttonStyles(variant, className)} {...props}>
            {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
            {children}
        </Link>
    );
}
