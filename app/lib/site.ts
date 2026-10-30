export const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const siteName = "Taoufik OURO-BANG'NA";

export const siteDescription =
    "Portfolio de Taoufik OURO-BANG'NA, Data Scientist. Machine learning, data et interfaces utiles.";

export function absoluteUrl(path: string) {
    return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
