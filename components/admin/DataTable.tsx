import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DataTableColumn<Row> = {
    key: string;
    header: string;
    cell: (row: Row) => ReactNode;
    /** Cellule d'en-tête de ligne (`<th scope="row">`) : en général le titre de l'élément. */
    isRowHeader?: boolean;
    align?: "left" | "right";
    /** Masque la colonne sous cette largeur d'écran (colonnes secondaires). */
    hideBelow?: "sm" | "md" | "lg";
};

/** Sur une carte, la première et la dernière colonne reprennent la marge intérieure de la carte. */
const CARD_EDGES = "first:pl-5 last:pr-5 sm:first:pl-7 sm:last:pr-7";

const HIDE_BELOW = {
    sm: "hidden sm:table-cell",
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
} as const;

/**
 * Tableau de données (étape 18, E60) : en-tête gris clair pleine largeur,
 * lignes d'environ 64 px séparées par un filet, sans bordure lourde.
 * `surface="card"` quand le tableau est posé sur une carte grise (en-tête blanc).
 * Accessible : légende obligatoire, en-têtes `scope`,
 * conteneur défilable au clavier (`tabIndex=0`, nommé par la légende) quand
 * le tableau dépasse la largeur de l'écran. Composant sans état : utilisable
 * depuis un composant serveur (les fonctions `cell` restent côté serveur).
 */
export function DataTable<Row>({
    caption,
    captionHidden = false,
    columns,
    rows,
    getRowKey,
    empty,
    surface = "panel",
    className,
}: {
    caption: string;
    /** Masque visuellement la légende (elle reste lue par les lecteurs d'écran). */
    captionHidden?: boolean;
    columns: DataTableColumn<Row>[];
    rows: Row[];
    getRowKey: (row: Row) => string;
    /** Affiché à la place du tableau quand `rows` est vide (ex. un `EmptyState`). */
    empty?: ReactNode;
    /** Fond sur lequel le tableau est posé : le panneau blanc (par défaut) ou une carte grise. */
    surface?: "panel" | "card";
    className?: string;
}) {
    const captionId = useId();

    if (rows.length === 0 && empty) {
        return <div className={className}>{empty}</div>;
    }

    return (
        <div
            role="region"
            aria-labelledby={captionId}
            tabIndex={0}
            className={cn(
                // `relative` : les textes `sr-only` (position absolue) des cellules restent dans la zone défilante
                // au lieu d'élargir la page.
                "relative overflow-x-auto",
                className,
            )}
        >
            <table className="w-full min-w-full border-collapse text-left">
                <caption
                    id={captionId}
                    className={cn(
                        "p-3 text-left font-semibold",
                        captionHidden && "sr-only",
                    )}
                >
                    {caption}
                </caption>
                <thead>
                    <tr className={surface === "card" ? "bg-panel" : "bg-card"}>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={cn(
                                    "px-4 py-3 text-sm font-normal text-muted",
                                    surface === "card" ? CARD_EDGES : "first:rounded-l-2xl last:rounded-r-2xl",
                                    column.align === "right" && "text-right",
                                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                {/* Lignes en fondu décalé de 30 ms, 10 au plus (`admin-rows`, E61). */}
                <tbody className="admin-rows">
                    {rows.map((row) => (
                        <tr
                            key={getRowKey(row)}
                            className="border-b border-line last:border-b-0"
                        >
                            {columns.map((column) => {
                                const className = cn(
                                    "h-16 px-4 py-3 align-middle",
                                    surface === "card" && CARD_EDGES,
                                    column.align === "right" && "text-right",
                                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                                );
                                return column.isRowHeader ? (
                                    <th
                                        key={column.key}
                                        scope="row"
                                        className={cn(className, "font-medium")}
                                    >
                                        {column.cell(row)}
                                    </th>
                                ) : (
                                    <td key={column.key} className={className}>
                                        {column.cell(row)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
