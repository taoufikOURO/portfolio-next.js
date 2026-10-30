import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PageHeader({
    title,
    description,
    backHref = "/",
    backLabel = "Retour",
}: {
    title: string;
    description: string;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <header className="relative overflow-hidden border-b border-(--line-strong) pb-10">
            <span className="ghost-text absolute -top-3 left-0">{title}</span>
            <div className="relative pt-8">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-(--muted) transition-colors hover:text-(--accent)"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {backLabel}
                </Link>
                <h1 className="heading mt-8 text-[clamp(2.4rem,7vw,5rem)]">
                    {title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--muted) md:text-base text-justify">
                    {description}
                </p>
            </div>
        </header>
    );
}
