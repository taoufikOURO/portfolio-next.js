import { useId, type CSSProperties } from "react";

export type BarDatum = {
    key: string;
    /** Libellé court sous la barre (ex. « juin »). */
    label: string;
    /** Libellé complet pour les lecteurs d'écran (ex. « juin 2026 »). */
    fullLabel: string;
    value: number;
};

/** Graduation lisible : 4 intervalles entiers, au moins 0 à 4. */
function scale(max: number): number[] {
    const step = Math.max(1, Math.ceil(max / 4));
    return [4, 3, 2, 1, 0].map((index) => index * step);
}

/**
 * Graphique à barres (étape 18, E60) : barres noires à coins arrondis sur un
 * fond hachuré décoratif (identique pour toutes les colonnes : il ne porte
 * aucune donnée), valeur au-dessus de chaque barre, période dans une petite
 * pilule noire, axe gauche gris discret, légende en pastille.
 * Le dessin est masqué aux lecteurs d'écran, qui lisent un tableau équivalent.
 * Les barres montent depuis la base (`admin-bar` : échelle verticale de 0 à 1,
 * 600 ms, 50 ms d'écart, E61) ; sous « réduire les animations », elles
 * s'affichent directement à leur hauteur.
 */
export function BarChart({
    data,
    caption,
    seriesLabel,
}: {
    data: BarDatum[];
    /** Légende du tableau équivalent (lecteurs d'écran). */
    caption: string;
    /** Nom de la série (légende visible). */
    seriesLabel: string;
}) {
    const captionId = useId();
    const ticks = scale(Math.max(0, ...data.map((datum) => datum.value)));
    const top = ticks[0];

    return (
        <figure aria-labelledby={captionId} className="relative flex flex-col gap-4">
            <div aria-hidden="true" className="flex justify-end">
                <span className="inline-flex items-center gap-2 text-sm text-muted">
                    <span className="size-3 rounded-full bg-ink" />
                    {seriesLabel}
                </span>
            </div>

            <div aria-hidden="true" className="flex gap-3">
                <div className="flex h-56 flex-col justify-between pb-0 text-right text-sm leading-none text-muted tabular-nums">
                    {ticks.map((tick) => (
                        <span key={tick}>{tick}</span>
                    ))}
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:gap-3">
                    {data.map((datum, index) => (
                        <div key={datum.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <div className="admin-hatch relative h-56 w-full max-w-16 overflow-hidden rounded-2xl">
                                {datum.value > 0 ? (
                                    <div
                                        className="admin-bar absolute inset-x-0 bottom-0 rounded-2xl bg-ink"
                                        style={
                                            {
                                                height: `${(datum.value / top) * 100}%`,
                                                "--admin-order": index,
                                            } as CSSProperties
                                        }
                                    />
                                ) : null}
                            </div>
                            <span className="text-sm font-medium tabular-nums">{datum.value}</span>
                            <span className="rounded-full bg-ink px-2.5 py-0.5 text-sm leading-tight text-panel">
                                {datum.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <figcaption id={captionId} className="sr-only">
                {caption}
            </figcaption>
            {/* Le tableau reste dans un bloc `sr-only` : un tableau ignore la largeur de 1 px et élargirait la page. */}
            <div className="sr-only">
                <table>
                    <caption>{caption}</caption>
                    <thead>
                        <tr>
                            <th scope="col">Mois</th>
                            <th scope="col">{seriesLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((datum) => (
                            <tr key={datum.key}>
                                <th scope="row">{datum.fullLabel}</th>
                                <td>{datum.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
}
