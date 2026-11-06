import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * État vide d'une liste. Bordure en pointillés bleu-gris, texte bleu-gris sur
 * crème (8,87). L'action éventuelle (bouton, lien) est passée en `children`.
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
                "flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-slate-blue px-6 py-10 text-center",
                className,
            )}
        >
            <Icon aria-hidden="true" className="size-10" />
            <Heading className="text-xl font-bold">{title}</Heading>
            {description ? <p className="max-w-prose">{description}</p> : null}
            {children ? <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div> : null}
        </div>
    );
}
