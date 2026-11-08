/**
 * Contrôle de confort côté navigateur d'un fichier choisi dans FileField.
 * Il n'a aucune valeur de sécurité : le serveur revérifie le type réel, la
 * taille et le contenu (`lib/storage/rules.ts`, étape 10). Les préréglages
 * `FILE_KIND_RULES` reprennent les valeurs du serveur ; un test vérifie
 * qu'elles restent identiques.
 */

export type FileRules = {
    /** Même syntaxe que l'attribut `accept` : types MIME ou extensions, séparés par des virgules. */
    accept?: string;
    /** Taille maximale en Mo (1 Mo = 1 048 576 octets). */
    maxSizeMB?: number;
    /**
     * Taille maximale propre à certains types, en Mo, qui remplace `maxSizeMB`.
     * Clé : type MIME ou extension, comme dans `accept` (ex. `image/svg+xml`, `.svg`).
     */
    maxSizeMBByType?: Readonly<Record<string, number>>;
};

/** Usages prévus, mêmes noms que `FileKind` côté serveur. */
export type FileKind = "image" | "icon" | "resume";

export type FileKindRules = Required<Pick<FileRules, "accept" | "maxSizeMB">> &
    Pick<FileRules, "maxSizeMBByType"> & {
        /** Aide affichée sous le libellé. */
        hint: string;
    };

export const FILE_KIND_RULES: Readonly<Record<FileKind, FileKindRules>> = {
    image: {
        accept: "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp",
        maxSizeMB: 5,
        hint: "PNG, JPG ou WebP, 5 Mo au maximum.",
    },
    icon: {
        accept: "image/png,image/webp,image/svg+xml,.png,.webp,.svg",
        maxSizeMB: 5,
        maxSizeMBByType: { "image/svg+xml": 1, ".svg": 1 },
        hint: "PNG ou WebP (5 Mo au maximum), ou SVG (1 Mo au maximum).",
    },
    resume: {
        accept: "application/pdf,.pdf",
        maxSizeMB: 5,
        hint: "PDF, 5 Mo au maximum.",
    },
};

function matchesPattern(file: { name: string; type: string }, pattern: string) {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
}

function matchesAccept(file: { name: string; type: string }, accept: string) {
    const patterns = accept
        .split(",")
        .map((pattern) => pattern.trim().toLowerCase())
        .filter(Boolean);
    if (patterns.length === 0) return true;
    return patterns.some((pattern) => matchesPattern(file, pattern));
}

/** Taille maximale applicable au fichier, en Mo (la plus stricte des règles par type qui s'appliquent). */
function maxSizeFor(file: { name: string; type: string }, rules: FileRules): number | undefined {
    const specific = Object.entries(rules.maxSizeMBByType ?? {})
        .filter(([pattern]) => matchesPattern(file, pattern.trim().toLowerCase()))
        .map(([, size]) => size);
    return specific.length > 0 ? Math.min(...specific) : rules.maxSizeMB;
}

/** Renvoie un message d'erreur en français, ou `null` si le fichier convient. */
export function validateFile(
    file: { name: string; type: string; size: number },
    rules: FileRules,
): string | null {
    if (rules.accept && !matchesAccept(file, rules.accept)) {
        return "Ce type de fichier n’est pas accepté.";
    }
    const maxSizeMB = maxSizeFor(file, rules);
    if (maxSizeMB !== undefined && file.size > maxSizeMB * 1024 * 1024) {
        return `Le fichier dépasse la taille maximale de ${maxSizeMB} Mo.`;
    }
    return null;
}
