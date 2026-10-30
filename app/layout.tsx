import {
    absoluteUrl,
    siteDescription,
    siteName,
    siteUrl,
} from "@/app/lib/site";
import profile from "@/data/profile.json";
import type { Metadata, Viewport } from "next";
import { Anton, Caveat, Instrument_Sans } from "next/font/google";
import Footer from "./components/Footer";
import Header from "./components/Header";
import "./globals.css";

const instrumentSans = Instrument_Sans({
    variable: "--font-instrument-sans",
    weight: ["400", "500", "600", "700"],
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

const anton = Anton({
    variable: "--font-anton",
    weight: "400",
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

const caveat = Caveat({
    variable: "--font-caveat",
    weight: ["500", "600", "700"],
    subsets: ["latin", "latin-ext"],
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: `${siteName} | Data Scientist`,
    description: siteDescription,
    alternates: {
        canonical: "/",
    },
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

export const viewport: Viewport = {
    themeColor: "#cbd2da",
    colorScheme: "light",
};

const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${profile.prenom} ${profile.nom}`,
    jobTitle: profile.titreProfessionnel,
    description: profile.bio,
    email: `mailto:${profile.email}`,
    image: absoluteUrl(profile.photo),
    url: siteUrl,
    sameAs: [
        profile.liens.github,
        profile.liens.linkedin.startsWith("http")
            ? profile.liens.linkedin
            : `https://${profile.liens.linkedin}`,
    ],
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="fr">
            <body
                className={`${instrumentSans.variable} ${anton.variable} ${caveat.variable}`}
            >
                <a href="#contenu" className="skip-link">
                    Aller au contenu
                </a>
                <Header />
                {children}
                <Footer />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(personSchema),
                    }}
                />
            </body>
        </html>
    );
}
