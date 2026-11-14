import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Carte de chiffre du tableau de bord (étape 18, E60) : titre, grande valeur,
 * badge éventuel, pastille icône blanche en haut à droite, détail, puis lien
 * d'action séparé par un filet et suivi d'une flèche.
 * Composant sans état : utilisable depuis un composant serveur.
 */
export function StatCard({
    title,
    titleId,
    value,
    badge,
    icon: Icon,
    children,
    link,
    className,
}: {
    title: string;
    /** Identifiant du titre (la carte est une section nommée par lui). */
    titleId: string;
    value: ReactNode;
    /** Pilule à côté de la valeur (ex. « Complet »). Jamais de variation inventée. */
    badge?: ReactNode;
    icon: LucideIcon;
    /** Détail sous la valeur. */
    children?: ReactNode;
    link?: { href: string; label: ReactNode };
    className?: string;
}) {
    return (
        <section aria-labelledby={titleId} className={cn("admin-card flex flex-col", className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 id={titleId} className="text-lg leading-snug">
                        {title}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{value}</p>
                        {badge}
                    </div>
                </div>
                <span
                    aria-hidden="true"
                    className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-panel"
                >
                    <Icon className="size-6" />
                </span>
            </div>
            {children ? <div className="mt-4 text-muted">{children}</div> : null}
            {link ? (
                <div className="mt-auto pt-5">
                    <Link
                        href={link.href}
                        className="group flex min-h-11 items-center justify-between gap-3 border-t border-line pt-4 font-medium"
                    >
                        <span className="underline underline-offset-4 group-hover:decoration-2">{link.label}</span>
                        <ArrowRight
                            aria-hidden="true"
                            className="size-5 shrink-0 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
                        />
                    </Link>
                </div>
            ) : null}
        </section>
    );
}

/** Badge pilule à côté d'une valeur : vert anis (positif) ou corail (à compléter), texte noir. */
export function ValueBadge({ tone, children }: { tone: "positive" | "negative"; children: ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm leading-tight font-medium text-ink",
                tone === "positive" ? "bg-lime" : "bg-coral",
            )}
        >
            {children}
        </span>
    );
}
