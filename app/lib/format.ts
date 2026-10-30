const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

const WORDS_PER_MINUTE = 200;

export function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : longDateFormatter.format(date);
}

export function formatDateShort(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : shortDateFormatter.format(date);
}

export function getReadingTimeMinutes(content: string): number {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function cn(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(" ");
}
