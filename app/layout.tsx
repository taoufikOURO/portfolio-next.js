import profile from "@/data/profile.json";
import type { Metadata } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import Footer from "./components/Footer";
import "./globals.css";

const instrumentSans = Instrument_Sans({
    variable: "--font-instrument-sans",
    weight: ["400", "500", "600", "700"],
    subsets: ["latin"],
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    weight: ["500", "600", "700"],
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
                url: profile.photo,
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
        images: [profile.photo],
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="fr">
            <body
                className={`${instrumentSans.variable} ${spaceGrotesk.variable}`}
            >
                {children}
                <Footer />
            </body>
        </html>
    );
}
