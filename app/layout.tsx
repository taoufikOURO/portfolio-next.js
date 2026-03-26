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
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            </head>
            <body
                className={`${instrumentSans.variable} min-h-screen bg-white text-[#14213d] antialiased`}
            >
                <Header />
                <main className="pt-20 md:pt-24 lg:pt-28">{children}</main>
                <footer className="relative pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-8 md:pb-12 bg-linear-to-br from-[#14213d] via-[#0d1526] to-[#14213d] text-white overflow-hidden border-t border-[#fca311]/20">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-40 -right-40 w-96 h-96 blob rounded-full opacity-10 bg-[#fca311] animate-float-slow" />
                        <div
                            className="absolute -bottom-40 -left-40 w-96 h-96 blob rounded-full opacity-5 bg-[#fca311] animate-float"
                            style={{ animationDelay: "2s" }}
                        />
                    </div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 mb-8 md:mb-12">
                            {/* Colonne 1 - À propos */}
                            <div className="group">
                                <div className="relative mb-4">
                                    <h3 className="text-lg md:text-xl font-black mb-2 bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text text-transparent group-hover:from-[#fdb84d] group-hover:to-[#fca311] transition-all duration-300">
                                        {fullName}
                                    </h3>
                                    <div className="h-1 w-12 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full group-hover:w-20 transition-all duration-300"></div>
                                </div>
                                <p className="text-[#fca311] text-sm font-bold uppercase tracking-widest mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                    {profile.titreProfessionnel}
                                </p>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Créateur d&apos;expériences web innovantes
                                    et élégantes.
                                </p>
                            </div>

                            {/* Colonne 2 - Navigation rapide */}
                            <div>
                                <h3 className="text-lg md:text-xl font-black mb-6 bg-linear-to-r from-white to-gray-200 bg-clip-text text-transparent">
                                    Navigation
                                </h3>
                                <ul className="space-y-3">
                                    <li>
                                        <Link
                                            href="/#about"
                                            className="group/link text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all"></i>
                                            À propos
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#stack"
                                            className="group/link text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all"></i>
                                            Stack
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#projets"
                                            className="group/link text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all"></i>
                                            Projets
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/articles"
                                            className="group/link bg-linear-to-r from-[#fca311]/20 to-[#fdb84d]/10 border border-[#fca311]/40 hover:border-[#fca311] hover:bg-linear-to-r hover:from-[#fca311]/30 hover:to-[#fdb84d]/20 px-3 py-2 rounded-lg text-[#fca311] hover:text-[#fdb84d] transition-all text-sm font-bold flex items-center gap-2"
                                        >
                                            <i className="fas fa-pen-fancy text-xs"></i>
                                            Mes Articles
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/#contact"
                                            className="group/link text-gray-300 hover:text-[#fca311] transition-colors text-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-chevron-right text-xs opacity-50 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all"></i>
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Colonne 3 - Réseaux sociaux */}
                            <div>
                                <h3 className="text-lg md:text-xl font-black mb-6 bg-linear-to-r from-white to-gray-200 bg-clip-text text-transparent">
                                    Suivez-moi
                                </h3>
                                <div className="flex gap-3 md:gap-4">
                                    <a
                                        href={`mailto:${profile.email}`}
                                        className="group w-12 h-12 flex items-center justify-center bg-linear-to-br from-[#fca311]/20 to-[#fdb84d]/10 backdrop-blur-sm rounded-xl border-2 border-[#fca311]/40 hover:border-[#fca311] hover:bg-[#fca311] hover:shadow-[0_0_20px_rgba(252,163,17,0.4)] transition-all duration-300"
                                        aria-label="Email"
                                    >
                                        <i className="fa fa-at text-lg group-hover:scale-110 group-hover:text-[#14213d] transition-all"></i>
                                    </a>
                                    <Link
                                        href={profile.liens.github}
                                        target="_blank"
                                        className="group w-12 h-12 flex items-center justify-center bg-linear-to-br from-[#fca311]/20 to-[#fdb84d]/10 backdrop-blur-sm rounded-xl border-2 border-[#fca311]/40 hover:border-[#fca311] hover:bg-[#fca311] hover:shadow-[0_0_20px_rgba(252,163,17,0.4)] transition-all duration-300"
                                        aria-label="GitHub"
                                    >
                                        <i className="fab fa-github text-lg group-hover:scale-110 group-hover:text-[#14213d] transition-all"></i>
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
                                        className="group w-12 h-12 flex items-center justify-center bg-linear-to-br from-[#fca311]/20 to-[#fdb84d]/10 backdrop-blur-sm rounded-xl border-2 border-[#fca311]/40 hover:border-[#fca311] hover:bg-[#fca311] hover:shadow-[0_0_20px_rgba(252,163,17,0.4)] transition-all duration-300"
                                        aria-label="LinkedIn"
                                    >
                                        <i className="fab fa-linkedin text-lg group-hover:scale-110 group-hover:text-[#14213d] transition-all"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Séparateur animé */}
                        <div className="h-px bg-linear-to-r from-transparent via-[#fca311]/40 to-transparent mb-8 md:mb-12"></div>

                        {/* Copyright avec style amélioré */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 text-sm">
                            <p className="text-center sm:text-left text-gray-400">
                                © {year}{" "}
                                <span className="text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text font-bold">
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
