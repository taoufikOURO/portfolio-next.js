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
        { href: "/formations", label: "Formation", id: "formations" },
        { href: "/#projets", label: "Projets", id: "projets" },
        { href: "/#contact", label: "Contact", id: "contact" },
    ];

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? "py-4 bg-white border-b border-[#14213d]/10"
                        : "py-6 bg-white"
                }`}
            >
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="group flex items-center gap-3 relative z-10"
                        >
                            <div>
                                <span className="font-bold text-[#14213d] group-hover:text-[#fca311] transition-colors duration-200">
                                    {profile.prenom} {profile.nom}
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation - Simple et élégant */}
                        <nav className="hidden lg:block">
                            <ul className="flex items-center gap-1">
                                {navLinks.map((link) => (
                                    <li key={link.id}>
                                        <Link
                                            href={link.href}
                                            className={`relative px-4 py-2 font-medium transition-all duration-200 ${
                                                activeSection === link.id
                                                    ? "text-[#fca311]"
                                                    : "text-[#14213d] hover:text-[#fca311]"
                                            }`}
                                        >
                                            <span className="relative z-10">
                                                {link.label}
                                            </span>
                                            {/* Active indicator */}
                                            {activeSection === link.id && (
                                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#fca311] rounded-full"></span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        {/* CTA Button + Mobile Menu */}
                        <div className="flex items-center gap-3">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setOpen(!open)}
                                className={`lg:hidden relative w-10 h-10 flex items-center justify-center border-2 transition-all duration-200 ${
                                    open
                                        ? "bg-[#fca311] border-[#fca311] text-white"
                                        : "bg-white border-[#14213d]/20 text-[#14213d] hover:border-[#fca311]"
                                }`}
                                aria-label="Menu"
                            >
                                <div className="relative w-5 h-4 flex flex-col justify-between">
                                    <span
                                        className={`w-full h-0.5 bg-current transition-all duration-200 ${
                                            open
                                                ? "rotate-45 translate-y-1.5"
                                                : ""
                                        }`}
                                    ></span>
                                    <span
                                        className={`w-full h-0.5 bg-current transition-all duration-200 ${
                                            open ? "opacity-0" : ""
                                        }`}
                                    ></span>
                                    <span
                                        className={`w-full h-0.5 bg-current transition-all duration-200 ${
                                            open
                                                ? "-rotate-45 -translate-y-1.5"
                                                : ""
                                        }`}
                                    ></span>
                                </div>
                            </button>
                        </div>
                    </div>
                </nav>
            </header>

            {/* Mobile Menu - Épuré et professionnel */}
            <div
                className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
                    open
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                }`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-[#14213d]/95"
                    onClick={() => setOpen(false)}
                ></div>

                {/* Menu Content */}
                <div className="relative h-full flex flex-col items-center justify-center">
                    <nav className="w-full max-w-md px-8">
                        <ul className="space-y-4">
                            {navLinks.map((link, index) => (
                                <li key={link.id}>
                                    <Link
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className="group block relative"
                                    >
                                        <div className="flex items-center gap-4 p-4 border border-white/20 hover:border-[#fca311] hover:bg-white/5 transition-all duration-200">
                                            <span className="text-2xl font-bold text-white/30 group-hover:text-[#fca311] transition-colors w-12">
                                                0{index + 1}
                                            </span>
                                            <span className="text-xl font-semibold text-white group-hover:text-[#fca311] transition-colors">
                                                {link.label}
                                            </span>
                                            <svg
                                                className="w-5 h-5 ml-auto text-white/40 group-hover:text-[#fca311] group-hover:translate-x-1 transition-all"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                                />
                                            </svg>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Mobile CTA */}
                        <div className="mt-8">
                            <Link
                                href="/#contact"
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center gap-2 w-full p-4 bg-[#fca311] hover:bg-[#e09200] text-white font-bold transition-colors duration-200"
                            >
                                <span>Démarrer un projet</span>
                            </Link>
                        </div>

                        {/* Social Links */}
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <a
                                href={profile.liens.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 flex items-center justify-center border border-white/20 hover:border-[#fca311] hover:bg-white/5 text-white hover:text-[#fca311] transition-all duration-200"
                            >
                                <i className="fab fa-github text-xl"></i>
                            </a>
                            <a
                                href={
                                    profile.liens.linkedin.startsWith("http")
                                        ? profile.liens.linkedin
                                        : `https://${profile.liens.linkedin}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 flex items-center justify-center border border-white/20 hover:border-[#fca311] hover:bg-white/5 text-white hover:text-[#fca311] transition-all duration-200"
                            >
                                <i className="fab fa-linkedin text-xl"></i>
                            </a>
                            <a
                                href={`mailto:${profile.email}`}
                                className="w-12 h-12 flex items-center justify-center border border-white/20 hover:border-[#fca311] hover:bg-white/5 text-white hover:text-[#fca311] transition-all duration-200"
                            >
                                <i className="fas fa-envelope text-xl"></i>
                            </a>
                        </div>
                    </nav>
                </div>
            </div>
        </>
    );
}
