"use client";

import { getProfile } from "@/app/lib/data";

export default function Contact() {
    const profile = getProfile();

    return (
        <section id="contact" className="py-24 bg-[#14213d]">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 gap-12 items-center">
                    <div className="space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-3 px-4 py-2 border border-white/20 rounded-full mb-6">
                                <div className="w-2 h-2 bg-[#fca311] rounded-full"></div>
                                <span className="text-sm font-medium text-white uppercase tracking-wide">
                                    CONTACTEZ-MOI
                                </span>
                            </div>

                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                                Collaborons{" "}
                                <span className="text-[#fca311]">ensemble</span>
                            </h2>

                            <div className="w-16 h-1 bg-[#fca311] mb-6"></div>

                            <p className="text-white/80 text-lg leading-relaxed">
                                Une idée, un projet, une opportunité ? Écrivons
                                ensemble la prochaine histoire de votre réussite
                                digitale.
                            </p>
                        </div>

                        {/* Liens de contact */}
                        <div className="space-y-4">
                            <a
                                href={`mailto:${profile.email}`}
                                className="group flex items-center gap-4 p-4 border border-white/20 hover:border-[#fca311] hover:bg-white/5 transition-all duration-200"
                            >
                                <div className="w-12 h-12 flex items-center justify-center bg-[#fca311] group-hover:bg-[#e09200] transition-colors">
                                    <i className="fas fa-envelope text-white"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white/60 mb-1">
                                        Email
                                    </p>
                                    <p className="text-white font-semibold">
                                        {profile.email}
                                    </p>
                                </div>
                                <svg
                                    className="w-5 h-5 text-[#fca311] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
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
                            </a>

                            <a
                                href={profile.liens.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 p-4 border border-white/20 hover:border-[#fca311] hover:bg-white/5 transition-all duration-200"
                            >
                                <div className="w-12 h-12 flex items-center justify-center bg-[#fca311] group-hover:bg-[#e09200] transition-colors">
                                    <i className="fab fa-github text-white"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white/60 mb-1">
                                        GitHub
                                    </p>
                                    <p className="text-white font-semibold">
                                        Voir mes projets
                                    </p>
                                </div>
                                <svg
                                    className="w-5 h-5 text-[#fca311] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
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
                            </a>

                            <a
                                href={
                                    profile.liens.linkedin.startsWith("http")
                                        ? profile.liens.linkedin
                                        : `https://${profile.liens.linkedin}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 p-4 border border-white/20 hover:border-[#fca311] hover:bg-white/5 transition-all duration-200"
                            >
                                <div className="w-12 h-12 flex items-center justify-center bg-[#fca311] group-hover:bg-[#e09200] transition-colors">
                                    <i className="fab fa-linkedin text-white"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white/60 mb-1">
                                        LinkedIn
                                    </p>
                                    <p className="text-white font-semibold">
                                        Connectons-nous
                                    </p>
                                </div>
                                <svg
                                    className="w-5 h-5 text-[#fca311] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
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
                            </a>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30">
                            <span className="text-green-400 font-medium">
                                Disponible pour de nouveaux projets
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
