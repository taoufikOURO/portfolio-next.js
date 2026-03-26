"use client";

import profile from "@/data/profile.json";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);

            // If we're on a dedicated page, set active section based on pathname
            if (pathname === "/formations") {
                setActiveSection("formations");
                return;
            }

            // Only run section detection on home page (/)
            if (pathname !== "/") {
                setActiveSection("");
                return;
            }

            // Detect active section - improved logic for home page
            const sections = [
                "about",
                "stack",
                "formations",
                "projets",
                "contact",
            ];
            let activeSection = "";
            let maxVisibility = 0;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Calculate how much of the section is visible
                    const visibleTop = Math.max(0, -rect.top);
                    const visibleBottom = Math.min(
                        rect.height,
                        viewportHeight - rect.top,
                    );
                    const visibleHeight = Math.max(
                        0,
                        visibleBottom - visibleTop,
                    );
                    const visibility = visibleHeight / viewportHeight;

                    // Check if section is prominently visible (more than 30% of viewport)
                    if (visibility > 0.3 && visibility > maxVisibility) {
                        maxVisibility = visibility;
                        activeSection = section;
                    }

                    // Also check if we're at the very top of a section
                    if (
                        rect.top <= 100 &&
                        rect.top >= -100 &&
                        rect.height > 200
                    ) {
                        activeSection = section;
                    }
                }
            }

            setActiveSection(activeSection);
        };

        // Call once on mount to set initial state
        handleScroll();

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [pathname]);

    const navLinks = [
        { href: "/#about", label: "À propos", id: "about" },
        { href: "/#stack", label: "Stack", id: "stack" },
        { href: "/#formations", label: "Formation", id: "formations" },
        { href: "/#projets", label: "Projets", id: "projets" },
        { href: "/#contact", label: "Contact", id: "contact" },
    ];

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? "py-2 glass backdrop-blur-xl border-b border-[#14213d]/20 bg-white/80"
                        : "py-6 bg-transparent"
                }`}
            >
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="group flex items-center gap-3 relative z-10"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-linear-to-r from-[#14213d] to-[#fca311] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                                <span className="relative font-black text-lg bg-linear-to-r from-[#14213d] to-[#fca311] bg-clip-text text-transparent group-hover:from-[#fca311] group-hover:to-[#fdb84d] transition-all duration-300">
                                    {profile.prenom.charAt(0)}
                                    {profile.nom.charAt(0)}
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation - Futuristic with glassmorphism */}
                        <nav className="hidden lg:block">
                            <ul className="flex items-center gap-0">
                                {navLinks.map((link) => (
                                    <li key={link.id}>
                                        <Link
                                            href={link.href}
                                            className={`relative px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all duration-300 group ${
                                                activeSection === link.id
                                                    ? "text-[#14213d]"
                                                    : "text-[#64748b] hover:text-[#fca311]"
                                            }`}
                                        >
                                            <span className="relative z-10">
                                                {link.label}
                                            </span>
                                            {/* Active indicator - animated underline */}
                                            <div
                                                className={`absolute bottom-1 left-1/2 h-0.5 bg-linear-to-r from-[#14213d] to-[#fca311] transition-all duration-300 ${
                                                    activeSection === link.id
                                                        ? "w-1/2 -translate-x-1/2"
                                                        : "w-0 -translate-x-1/2 group-hover:w-1/3"
                                                }`}
                                            ></div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setOpen(!open)}
                            className={`lg:hidden relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                                open
                                    ? "text-[#fca311]"
                                    : "text-[#64748b] hover:text-[#14213d]"
                            }`}
                            aria-label="Menu"
                        >
                            <div className="relative w-5 h-4 flex flex-col justify-between">
                                <span
                                    className={`w-full h-0.5 bg-current transition-all duration-300 origin-center ${
                                        open ? "rotate-45 translate-y-1.5" : ""
                                    }`}
                                ></span>
                                <span
                                    className={`w-full h-0.5 bg-current transition-all duration-300 ${
                                        open ? "opacity-0 scale-0" : ""
                                    }`}
                                ></span>
                                <span
                                    className={`w-full h-0.5 bg-current transition-all duration-300 origin-center ${
                                        open
                                            ? "-rotate-45 -translate-y-1.5"
                                            : ""
                                    }`}
                                ></span>
                            </div>
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile Menu - Futuristic glassmorphism */}
            <div
                className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
                    open
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                }`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-linear-to-br from-white/95 to-[#f1f5f9]/95 backdrop-blur-md"
                    onClick={() => setOpen(false)}
                ></div>

                {/* Menu Content */}
                <div className="relative h-full flex flex-col items-center justify-center px-6">
                    <nav className="w-full max-w-sm space-y-3">
                        {navLinks.map((link, index) => (
                            <Link
                                key={link.id}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="group block"
                                style={{
                                    animation: `fadeInUp 0.6s ease-out forwards`,
                                    animationDelay: `${100 + index * 50}ms`,
                                }}
                            >
                                <div className="glass rounded-xl p-4 border border-[#fca311]/20 hover:border-[#fca311]/60 hover:shadow-[0_0_20px_rgba(252,163,17,0.2)] hover-lift transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 flex items-center justify-center bg-linear-to-br from-[#fca311]/20 to-[#fdb84d]/10 rounded-lg border border-[#fca311]/40 group-hover:border-[#fca311]/80 transition-all">
                                            <span className="font-black text-sm text-[#14213d]">
                                                0{index + 1}
                                            </span>
                                        </div>
                                        <span className="flex-1 text-lg font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors">
                                            {link.label}
                                        </span>
                                        <svg
                                            className="w-5 h-5 text-[#fca311] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2.5}
                                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile CTA */}
                    <div
                        className="mt-12 w-full max-w-sm"
                        style={{
                            animation: `fadeInUp 0.6s ease-out forwards`,
                            animationDelay: `${100 + navLinks.length * 50 + 100}ms`,
                        }}
                    >
                        <Link
                            href="/#contact"
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-center gap-3 w-full p-5 bg-linear-to-r from-[#fca311] to-[#fdb84d] hover:from-[#fdb84d] hover:to-[#fca311] text-[#14213d] font-bold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-[#fca311]/40 hover-lift"
                        >
                            <span>Démarrer un projet</span>
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                            </svg>
                        </Link>
                    </div>

                    {/* Social Links */}
                    <div
                        className="mt-12 flex items-center justify-center gap-4"
                        style={{
                            animation: `fadeInUp 0.6s ease-out forwards`,
                            animationDelay: `${100 + navLinks.length * 50 + 200}ms`,
                        }}
                    >
                        <a
                            href={profile.liens.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative w-12 h-12 flex items-center justify-center glass rounded-xl border border-[#fca311]/20 hover:border-[#fca311]/60 text-white hover:text-[#fca311] transition-all duration-300 hover-lift"
                        >
                            <i className="fab fa-github text-xl"></i>
                            <div className="absolute inset-0 rounded-xl bg-[#fca311]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                        </a>
                        <a
                            href={
                                profile.liens.linkedin.startsWith("http")
                                    ? profile.liens.linkedin
                                    : `https://${profile.liens.linkedin}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative w-12 h-12 flex items-center justify-center glass rounded-xl border border-[#fca311]/20 hover:border-[#fca311]/60 text-white hover:text-[#fca311] transition-all duration-300 hover-lift"
                        >
                            <i className="fab fa-linkedin text-xl"></i>
                            <div className="absolute inset-0 rounded-xl bg-[#fca311]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                        </a>
                        <a
                            href={`mailto:${profile.email}`}
                            className="group relative w-12 h-12 flex items-center justify-center glass rounded-xl border border-[#fca311]/20 hover:border-[#fca311]/60 text-white hover:text-[#fca311] transition-all duration-300 hover-lift"
                        >
                            <i className="fas fa-envelope text-xl"></i>
                            <div className="absolute inset-0 rounded-xl bg-[#fca311]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
