import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * État vide d'une liste (étape 18, E60) : carte grise, icône dans une pastille
 * blanche, titre, phrase en texte secondaire. L'action éventuelle (bouton,
 * lien) est passée en `children`.
 */
export function EmptyState({
    title,
    description,
    icon: Icon = Inbox,
    headingLevel = 2,
    children,
    className,
}: {
    title: string;
    description?: string;
    icon?: LucideIcon;
    headingLevel?: 2 | 3 | 4;
    children?: ReactNode;
    className?: string;
}) {
    const Heading = `h${headingLevel}` as const;

    return (
        <div
            className={cn(
                "flex flex-col items-center gap-3 rounded-[var(--radius-card)] bg-card px-6 py-12 text-center",
                className,
            )}
        >
            <span
                aria-hidden="true"
                className="mb-1 inline-flex size-14 items-center justify-center rounded-full bg-panel"
            >
                <Icon className="size-6" />
            </span>
            <Heading className="admin-section-title">{title}</Heading>
            {description ? <p className="max-w-prose text-muted">{description}</p> : null}
            {children ? <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div> : null}
        </div>
    );
}
