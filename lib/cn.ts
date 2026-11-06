export type ClassValue = string | false | null | undefined | ClassValue[];

/**
 * Assemble des noms de classes CSS en ignorant les valeurs vides.
 * Ne résout pas les conflits entre classes Tailwind (pas de `tailwind-merge`) :
 * les composants n'ajoutent `className` qu'à la fin et évitent les doublons.
 */
export function cn(...values: ClassValue[]): string {
    const classes: string[] = [];
    for (const value of values) {
        if (Array.isArray(value)) {
            const nested = cn(...value);
            if (nested) classes.push(nested);
        } else if (value) {
            classes.push(value);
        }
    }
    return classes.join(" ");
}
