import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./admin.css";

/** Police de l'admin (étape 18, E60) : géométrique et arrondie, servie par next/font (aucune dépendance ajoutée). */
const outfit = Outfit({
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Administration",
    robots: {
        index: false,
        follow: false,
    },
};

export default function AdminLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className={`${outfit.className} min-h-dvh bg-canvas text-ink antialiased`}>{children}</div>
    );
}
