import type { ComponentProps } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "destructive";

/**
 * Rôles des couleurs (plan §3.3) :
 * - principal : texte crème sur bleu-gris (8,87) ;
 * - secondaire : bordure et texte bleu-gris sur crème (8,87) ;
 * - destructif : texte bleu-gris sur terracotta (3,42), conforme seulement en
 *   grand texte, d'où `text-xl font-bold` (20 px gras, au-dessus de 18,66 px).
 * Désactivé : fond crème, texte bleu-gris et bordure en pointillés (jamais une
 * simple baisse d'opacité, qui créerait des couleurs hors charte).
 * Au survol : soulignement du libellé, sans nouvelle couleur.
 */
const VARIANTS: Record<ButtonVariant, string> = {
    primary: "border-slate-blue bg-slate-blue text-cream text-base",
    secondary: "border-slate-blue bg-cream text-slate-blue text-base",
    destructive: "border-slate-blue bg-terracotta text-slate-blue text-xl font-bold",
};

export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
    return cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-4 py-2 leading-tight no-underline hover:underline",
        variant !== "destructive" && "font-semibold",
        VARIANTS[variant],
        "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-cream disabled:text-slate-blue disabled:no-underline",
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
