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
    title: "Taoufik OURO‑BANG'NA",
    description:
        "Personal website of Taoufik OURO‑BANG'NA, a software engineer specializing in web development.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const fullName = `${profile.prenom} ${profile.nom}`;
    const year = new Date().getFullYear();

    return (
        <html lang="fr">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                    rel="stylesheet"
                />
            </head>
            <body
                className={`${instrumentSans.variable} min-h-screen bg-white text-[#14213d] antialiased`}
            >
                <Header />
                <main className="pt-20 md:pt-24 lg:pt-28">{children}</main>
                <footer className="relative pt-16 sm:pt-20 md:pt-24 lg:pt-28 pb-6 md:pb-8 bg-linear-to-br from-[#14213d] to-[#2a3f5f] text-white overflow-hidden">
                    {/* Blobs décoratifs */}
                    <div
                        className="blob blob-accent"
                        style={{
                            width: "300px",
                            height: "300px",
                            top: "-10%",
                            right: "-5%",
                            opacity: 0.1,
                        }}
                    ></div>

                    <div className="container relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
                            {/* Colonne 1 - À propos */}
                            <div>
                                <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text text-transparent">
                                    {fullName}
                                </h3>
                                <p className="text-gray-300 text-sm leading-relaxed mb-3 md:mb-4">
                                    {profile.titreProfessionnel}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Créateur d&apos;expériences web innovantes
                                    et élégantes.
                                </p>
                            </div>

                            {/* Colonne 2 - Navigation rapide */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
                                    Navigation
                                </h3>
                                <ul className="space-y-2">
                                    <li>
                                        <Link
                                            href="/#about"
                                            className="text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs"></i>
                                            À propos
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#stack"
                                            className="text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs"></i>
                                            Stack
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#projets"
                                            className="text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs"></i>
                                            Projets
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#contact"
                                            className="text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs"></i>
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Colonne 3 - Réseaux sociaux */}
                            <div>
                                <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
                                    Suivez-moi
                                </h3>
                                <div className="flex gap-2 md:gap-3">
                                    <a
                                        href={`mailto:${profile.email}`}
                                        className="group w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-[#fca311] hover:border-[#fca311] transition-all duration-300"
                                        aria-label="Email"
                                    >
                                        <i className="fa fa-envelope text-xl group-hover:scale-110 transition-transform"></i>
                                    </a>
                                    <Link
                                        href={profile.liens.github}
                                        target="_blank"
                                        className="group w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-[#fca311] hover:border-[#fca311] transition-all duration-300"
                                        aria-label="GitHub"
                                    >
                                        <i className="fab fa-github text-xl group-hover:scale-110 transition-transform"></i>
                                    </Link>
                                    <Link
                                        href={
                                            profile.liens.linkedin.startsWith(
                                                "http",
                                            )
                                                ? profile.liens.linkedin
                                                : `https://${profile.liens.linkedin}`
                                        }
                                        target="_blank"
                                        className="group w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-[#fca311] hover:border-[#fca311] transition-all duration-300"
                                        aria-label="LinkedIn"
                                    >
                                        <i className="fab fa-linkedin text-xl group-hover:scale-110 transition-transform"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Séparateur */}
                        <div className="h-px bg-linear-to-r from-transparent via-white/20 to-transparent mb-6 md:mb-8"></div>

                        {/* Copyright */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 text-sm text-gray-400">
                            <p className="text-center sm:text-left">
                                © {year}{" "}
                                <span className="text-[#fca311] font-semibold">
                                    {fullName}
                                </span>
                            </p>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    );
}
