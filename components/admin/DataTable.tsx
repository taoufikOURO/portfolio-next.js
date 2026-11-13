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

const HIDE_BELOW = {
    sm: "hidden sm:table-cell",
    md: "hidden md:table-cell",
    lg: "hidden lg:table-cell",
} as const;

/**
 * Tableau de données accessible : légende obligatoire, en-têtes `scope`,
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
                "relative overflow-x-auto rounded-md border border-slate-blue/25",
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
                    <tr className="border-b-2 border-slate-blue">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={cn(
                                    "px-3 py-2 font-semibold",
                                    column.align === "right" && "text-right",
                                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={getRowKey(row)}
                            className="border-b border-slate-blue/25 last:border-b-0"
                        >
                            {columns.map((column) => {
                                const className = cn(
                                    "px-3 py-3 align-top",
                                    column.align === "right" && "text-right",
                                    column.hideBelow && HIDE_BELOW[column.hideBelow],
                                );
                                return column.isRowHeader ? (
                                    <th
                                        key={column.key}
                                        scope="row"
                                        className={cn(className, "font-semibold")}
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
