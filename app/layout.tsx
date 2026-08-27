import profile from "@/data/profile.json";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import Link from "next/link";
import Header from "./components/Header";
import "./globals.css";

const instrumentSans = Instrument_Sans({
    variable: "--font-instrument-sans",
    weight: ["400", "500", "600", "700"],
    subsets: ["latin"],
    display: "swap",
});
export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: "Taoufik OURO-BANG'NA | Data Scientist",
    description:
        "Portfolio de Taoufik OURO-BANG'NA, Data Scientist. Machine learning, data et interfaces utiles.",
    icons: {
        icon: "/icon.svg",
        shortcut: "/icon.svg",
        apple: "/icon.svg",
    },
    openGraph: {
        type: "website",
        locale: "fr_FR",
        title: "Taoufik OURO-BANG'NA | Data Scientist",
        description:
            "Je transforme la donnée brute en décisions concrètes, du modèle de machine learning à l'interface qui le rend utile.",
        siteName: "Taoufik OURO-BANG'NA",
        images: [
            {
                url: "/images/profile/taoufik.jpg",
                width: 1200,
                height: 1200,
                alt: "Taoufik OURO-BANG'NA, Data Scientist",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Taoufik OURO-BANG'NA | Data Scientist",
        description: "Portfolio de Taoufik OURO-BANG'NA, Data Scientist.",
        images: ["/images/profile/taoufik.jpg"],
    },
};
export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const fullName = `${profile.prenom} ${profile.nom}`;
    return (
        <html lang="fr">
            <body className={instrumentSans.variable}>
                <Header />
                <main>{children}</main>
                <footer className="bg-(--ink) px-6 py-14 text-(--paper) md:px-12 lg:px-20">
                    <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
                        <div>
                            <p className="eyebrow text-(--lime)">
                                Fin du dataset
                            </p>
                            <p className="display mt-4 text-4xl">{fullName}</p>
                        </div>
                        <div className="text-left text-sm text-white/60 md:text-right">
                            <p>{profile.titreProfessionnel}</p>
                            <p className="mt-2">
                                © {new Date().getFullYear()} · {profile.email}
                            </p>
                            <div className="mt-4 flex gap-4 md:justify-end">
                                <Link
                                    href="/articles"
                                    className="hover:text-(--lime)"
                                >
                                    Notes
                                </Link>
                                <Link
                                    href="/projets"
                                    className="hover:text-(--lime)"
                                >
                                    Projets
                                </Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    );
}
