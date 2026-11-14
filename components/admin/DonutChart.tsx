import { useId } from "react";
import { cn } from "@/lib/cn";

export type DonutSegment = {
    key: string;
    label: string;
    value: number;
    /** Couleur du segment et de sa pastille (classes de la palette). */
    tone: "ink" | "muted" | "chart-1" | "chart-2";
};

const STROKE: Record<DonutSegment["tone"], string> = {
    ink: "stroke-ink",
    muted: "stroke-muted",
    "chart-1": "stroke-chart-1",
    "chart-2": "stroke-chart-2",
};

const DOT: Record<DonutSegment["tone"], string> = {
    ink: "bg-ink",
    muted: "bg-muted",
    "chart-1": "bg-chart-1",
    "chart-2": "bg-chart-2",
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Espace blanc entre deux segments, en unités du dessin. */
const GAP = 2.5;

/**
 * Anneau de répartition (étape 18, E60) : segments noirs et gris séparés par de
 * fins espaces blancs, total au centre. Le dessin est décoratif : la légende
 * (pastille, libellé, valeur en gras) porte toute l'information en texte.
 * Tracé progressif en 800 ms (masque `admin-ring-draw`, `stroke-dashoffset`,
 * E61) ; sous « réduire les animations », l'anneau est affiché d'emblée.
 */
export function DonutChart({
    segments,
    totalLabel,
}: {
    segments: DonutSegment[];
    /** Libellé sous le total (ex. « contenus »). */
    totalLabel: string;
}) {
    // Identifiant réduit aux caractères sûrs dans `url(#…)`.
    const maskId = `donut-mask-${useId().replace(/[^\w-]/g, "")}`;
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const visible = segments.filter((segment) => segment.value > 0);
    const gap = visible.length > 1 ? GAP : 0;
    let offset = 0;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-56">
                <svg aria-hidden="true" viewBox="0 0 100 100" className="block w-full -rotate-90">
                    {/* Masque blanc tracé en 800 ms : il dévoile l'anneau depuis le haut (E61). */}
                    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                        <circle
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="none"
                            strokeWidth="16"
                            pathLength="100"
                            strokeDasharray="100"
                            strokeDashoffset="0"
                            className="admin-ring-draw stroke-panel"
                        />
                    </mask>
                    <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="14" className="stroke-panel" />
                    <g mask={`url(#${maskId})`}>
                    {total === 0 ? (
                        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" className="stroke-line" />
                    ) : (
                        visible.map((segment) => {
                            const length = (segment.value / total) * CIRCUMFERENCE;
                            const dash = Math.max(length - gap, 0.5);
                            const circle = (
                                <circle
                                    key={segment.key}
                                    cx="50"
                                    cy="50"
                                    r={RADIUS}
                                    fill="none"
                                    strokeWidth="12"
                                    strokeLinecap="butt"
                                    strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                                    strokeDashoffset={-offset}
                                    className={STROKE[segment.tone]}
                                />
                            );
                            offset += length;
                            return circle;
                        })
                    )}
                    </g>
                </svg>
                <p className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">{total}</span>
                    <span className="mt-1 text-sm text-muted">{totalLabel}</span>
                </p>
            </div>

            <ul className="grid w-full grid-cols-2 gap-x-6 gap-y-4">
                {segments.map((segment) => (
                    <li key={segment.key} className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm text-muted">
                            <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-full", DOT[segment.tone])} />
                            {segment.label}
                        </span>
                        <span className="text-2xl leading-none font-semibold tabular-nums">{segment.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
