"use client";

import { getProfile } from "@/app/lib/data";

export default function Contact() {
    const profile = getProfile();

    const contactLinks = [
        {
            icon: "fa-at",
            label: "Email",
            value: profile.email,
            description: "Envoyez-moi un message directement",
            href: `mailto:${profile.email}`,
        },
        {
            icon: "fab fa-github",
            label: "GitHub",
            value: "Voir mes projets",
            description: "Explorez mon portfolio de code",
            href: profile.liens.github,
        },
        {
            icon: "fab fa-linkedin",
            label: "LinkedIn",
            value: "Connectons-nous",
            description: "Rejoignez mon réseau professionnel",
            href: profile.liens.linkedin.startsWith("http")
                ? profile.liens.linkedin
                : `https://${profile.liens.linkedin}`,
        },
    ];

    return (
        <section
            id="contact"
            className="py-24 md:py-32 bg-linear-to-br from-[#14213d] via-[#0d1526] to-[#14213d] relative overflow-hidden"
        >
            {/* Decorative animated blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 blob blob-accent rounded-full opacity-5 animate-float-slow" />
            <div
                className="absolute bottom-0 left-0 w-80 h-80 blob blob-primary rounded-full opacity-5 animate-float-slow"
                style={{ animationDelay: "2s" }}
            />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-linear-to-t from-[#fca311] to-transparent"></div>
            </div>

            <div className="max-w-6xl py-10 mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left side - Text */}
                    <div className="space-y-10 animate-fade-in-right">
                        <div>
                            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                                <span className="block text-[#fca311]">
                                    Collaborons
                                </span>
                                <span className="block text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                                    ensemble
                                </span>
                            </h2>

                            <div className="flex gap-3 mb-8">
                                <div className="w-12 h-2 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full"></div>
                                <div className="w-8 h-2 bg-[#fca311] rounded-full animate-gradient-shift"></div>
                            </div>

                            <p className="text-xl text-white/80 leading-relaxed font-light">
                                Une idée, un projet innovant, une opportunité
                                excitante ? Écrivons ensemble la prochaine
                                histoire de votre réussite digitale avec une
                                approche Data-Driven et créative.
                            </p>
                        </div>
                    </div>

                    {/* Right side - Contact Cards */}
                    <div className="space-y-6 animate-fade-in-left animation-delay-200">
                        {contactLinks.map((link, index) => (
                            <a
                                key={index}
                                href={link.href}
                                target={
                                    link.href.startsWith("mailto:")
                                        ? undefined
                                        : "_blank"
                                }
                                rel={
                                    link.href.startsWith("mailto:")
                                        ? undefined
                                        : "noopener noreferrer"
                                }
                                className="group block"
                                style={{
                                    animation: `fadeInUp 0.8s ease-out forwards`,
                                    animationDelay: `${300 + index * 100}ms`,
                                }}
                            >
                                <div className="rounded-2xl p-8 border-2 border-[#fca311]/60 hover:border-[#fdb84d] bg-[#14213d]/20 hover:bg-[#fca311]/10 hover:shadow-[0_0_40px_rgba(252,163,17,0.4)] hover-lift transition-all group overflow-hidden shadow-[inset_0_0_20px_rgba(252,163,17,0.1)]">
                                    <div className="absolute inset-0 bg-linear-to-br from-[#fca311]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-linear-to-br from-[#fca311]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                    <div className="relative">
                                        <div className="flex items-start gap-6">
                                            {/* Icon container */}
                                            <div className="shrink-0">
                                                <div className="relative w-16 h-16 bg-linear-to-br from-[#fca311]/20 to-[#fdb84d]/10 rounded-2xl p-4 flex items-center justify-center border border-[#fca311]/30 group-hover:border-[#fca311]/60 group-hover:shadow-[0_0_20px_rgba(252,163,17,0.3)] transition-all">
                                                    <i
                                                        className={`${link.icon} text-2xl text-[#fca311] group-hover:scale-110 transition-transform`}
                                                    ></i>
                                                    <div className="absolute inset-0 rounded-2xl bg-[#fca311]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-2">
                                                    <p className="text-xs font-bold text-[#fca311] uppercase tracking-widest">
                                                        {link.label}
                                                    </p>
                                                    <h3 className="text-xl font-bold text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                                                        {link.value}
                                                    </h3>
                                                </div>
                                                <p className="text-sm text-white/80">
                                                    {link.description}
                                                </p>
                                            </div>

                                            {/* Arrow */}
                                            <div className="shrink-0">
                                                <svg
                                                    className="w-6 h-6 text-[#fca311] opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all"
                                                    fill="none"
                                                    stroke="currentColor"
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
                                    </div>

                                    {/* Bottom accent line */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl"></div>
                                </div>
                            </a>
                        ))}


                    </div>
                </div>
            </div>
        </section>
    );
}
