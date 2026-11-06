/**
 * Contrôle de confort côté navigateur d'un fichier choisi dans FileField.
 * Il n'a aucune valeur de sécurité : le serveur revérifie le type réel, la
 * taille et le contenu (étape 10).
 */

export type FileRules = {
    /** Même syntaxe que l'attribut `accept` : types MIME ou extensions, séparés par des virgules. */
    accept?: string;
    /** Taille maximale en Mo (1 Mo = 1 048 576 octets). */
    maxSizeMB?: number;
};

function matchesAccept(file: { name: string; type: string }, accept: string) {
    const patterns = accept
        .split(",")
        .map((pattern) => pattern.trim().toLowerCase())
        .filter(Boolean);
    if (patterns.length === 0) return true;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return patterns.some((pattern) => {
        if (pattern.startsWith(".")) return name.endsWith(pattern);
        if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
        return type === pattern;
    });
}

/** Renvoie un message d'erreur en français, ou `null` si le fichier convient. */
export function validateFile(
    file: { name: string; type: string; size: number },
    rules: FileRules,
): string | null {
    if (rules.accept && !matchesAccept(file, rules.accept)) {
        return "Ce type de fichier n’est pas accepté.";
    }
    if (rules.maxSizeMB !== undefined && file.size > rules.maxSizeMB * 1024 * 1024) {
        return `Le fichier dépasse la taille maximale de ${rules.maxSizeMB} Mo.`;
    }
    return null;
}
