import { getProfile } from "@/app/lib/data";
import Image from "next/image";

export default function Hero() {
    const profile = getProfile();
    const bioText =
        profile.bio ||
        "Je transforme les données complexes en insights powerfulgrâce aux données et à la créativité, j'architècte des solutions web que les utilisateurs adorent.";

    return (
        <section className="min-h-[calc(100vh-80px)] bg-linear-to-br from-white via-[#f8fafc] to-[#f1f5f9] md:-mt-25 -mt-16 relative overflow-hidden">
            {/* Gradient blobs décoratifs - Palette originale */}
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-linear-to-br from-[#14213d]/15 to-[#fca311]/15 animate-float opacity-60" />
            <div
                className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl bg-linear-to-br from-[#fca311]/15 to-[#fdb84d]/15 animate-float-slow opacity-60"
                style={{ animationDelay: "2s" }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl bg-linear-to-br from-[#14213d]/10 to-[#fca311]/10 animate-pulse opacity-40" />

            <div className="max-w-6xl mx-auto px-6 py-12 md:py-12 relative z-10">
                {/* Layout mobile */}
                <div className="flex flex-col items-center text-center space-y-5 lg:hidden animate-fade-in-up">
                    {/* Badge profesional avec gradient */}
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#fca311]/10 border border-[#fca311]/40 hover:border-[#fca311]/80 hover:bg-[#fca311]/20 transition-all animate-fade-in-down animation-delay-100 group">
                        <span className="w-2 h-2 bg-[#fca311] rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-[#14213d] tracking-wider uppercase">
                            {profile.titreProfessionnel || "Developer"}
                        </span>
                    </div>

                    {/* Photo de profil - Circulaire */}
                    <div className="relative animation-delay-200">
                        <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-2 border-[#14213d]/20 bg-white">
                            <Image
                                src={profile.photo}
                                alt={`${profile.prenom} ${profile.nom}`}
                                width={300}
                                height={300}
                                className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                                priority
                            />
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#14213d]/10 to-[#fca311]/10 pointer-events-none"></div>
                        <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full animate-rotate-slow opacity-60 bg-linear-to-br from-[#fca311]/40 to-[#fdb84d]/40 border-2 border-[#fca311]/30"></div>
                    </div>

                    {/* Titre principal - Compact */}
                    <div className="space-y-2 animate-fade-in-down animation-delay-300">
                        <h1 className="text-4xl font-black leading-tight">
                            <span className="block text-[#14213d] drop-shadow-lg">
                                {profile.prenom}
                            </span>
                            <span className="block text-5xl text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text drop-shadow-lg">
                                {profile.nom}
                            </span>
                        </h1>
                        <div className="h-0.5 w-16 bg-[#fca311] rounded-full mx-auto"></div>
                    </div>

                    {/* Description - Réduite */}
                    <p className="text-lg text-[#334155] leading-relaxed max-w-sm font-light animate-fade-in-up animation-delay-400">
                        {bioText}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-row gap-2 pt-2 justify-center flex-wrap animate-spring-in animation-delay-500">
                        <a
                            href="#contact"
                            className="inline-flex items-center justify-center gap-2 bg-[#14213d] hover:bg-[#fca311] text-white hover:text-[#14213d] px-9 py-3.5 font-bold text-base rounded-lg smooth-button-hover hover:shadow-[0_0_40px_rgba(252,163,17,0.4)] hover-lift group"
                        >
                            <span>Collaborons</span>
                            <svg
                                className="w-4 h-4 group-hover:translate-x-2 transition-all duration-500"
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
                        </a>

                        <a
                            href={profile.cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 border-2 border-[#fca311] text-[#14213d] hover:bg-[#fca311] hover:text-white px-9 py-3.5 font-bold text-base rounded-lg smooth-button-hover hover:shadow-[0_0_40px_rgba(252,163,17,0.4)] hover-lift group"
                        >
                            <svg
                                className="w-4 h-4 group-hover:scale-110 transition-all duration-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <span>CV</span>
                        </a>
                    </div>

                    {/* Réseaux sociaux */}
                    <div className="flex items-center gap-4 pt-2 animate-fade-in-up animation-delay-600">
                        {profile.liens?.github && (
                            <a
                                href={profile.liens.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#14213d]/10 border border-[#14213d]/30 text-[#14213d] hover:bg-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all duration-300 group hover-lift"
                                title="GitHub"
                            >
                                <i className="fab fa-github text-xl"></i>
                            </a>
                        )}
                        {profile.liens?.linkedin && (
                            <a
                                href={profile.liens.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#14213d]/10 border border-[#14213d]/30 text-[#14213d] hover:bg-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all duration-300 group hover-lift"
                                title="LinkedIn"
                            >
                                <i className="fab fa-linkedin text-xl"></i>
                            </a>
                        )}
                        {profile.email && (
                            <a
                                href={`mailto:${profile.email}`}
                                className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#14213d]/10 border border-[#14213d]/30 text-[#14213d] hover:bg-[#14213d] hover:text-[#fca311] hover:border-[#fca311] transition-all duration-300 group hover-lift"
                                title="Email"
                            >
                                <i className="fas fa-envelope text-xl"></i>
                            </a>
                        )}
                    </div>
                </div>

                {/* Layout desktop */}
                <div className="hidden lg:grid grid-cols-2 gap-16 items-center animate-fade-in-up">
                    {/* Côté gauche - Texte */}
                    <div className="space-y-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#fca311]/10 border border-[#fca311]/40 hover:border-[#fca311]/80 hover:bg-[#fca311]/20 transition-all animate-fade-in-down mb-8 group">
                                <span className="w-2 h-2 bg-[#fca311] rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-[#14213d] tracking-wider uppercase">
                                    {profile.titreProfessionnel}
                                </span>
                            </div>

                            <h1 className="text-7xl font-black leading-tight mb-6">
                                <span className="block text-[#14213d]">
                                    {profile.prenom}
                                </span>
                                <span className="block text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text animate-shimmer">
                                    {profile.nom}
                                </span>
                            </h1>

                            <div className="h-1 w-32 bg-[#fca311] rounded-full mb-8"></div>
                        </div>

                        <p className="text-xl text-[#334155] leading-relaxed font-light">
                            {bioText}
                        </p>

                        <div className="flex gap-4 pt-4 animate-spring-in animation-delay-200">
                            <a
                                href="#contact"
                                className="inline-flex items-center justify-center gap-2 bg-[#14213d] hover:bg-[#fca311] text-white hover:text-[#14213d] px-10 py-4 font-bold rounded-xl smooth-button-hover hover:shadow-[0_0_40px_rgba(252,163,17,0.4)] hover-lift group"
                            >
                                Collaborons
                                <svg
                                    className="w-5 h-5 group-hover:translate-x-2 transition-all duration-500"
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
                            </a>

                            <a
                                href={profile.cv}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 border-2 border-[#fca311] text-[#14213d] hover:bg-[#fca311] hover:text-white px-10 py-4 font-bold rounded-xl smooth-button-hover hover:shadow-[0_0_40px_rgba(252,163,17,0.4)] hover-lift group"
                            >
                                <svg
                                    className="w-5 h-5 group-hover:scale-110 transition-all duration-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                CV
                            </a>
                        </div>
                    </div>

                    {/* Côté droit - Photo */}
                    <div className="relative animate-float-slow animation-delay-300 flex justify-center">
                        <div className="relative">
                            <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-lg border-2 border-[#14213d]/20 bg-white">
                                <Image
                                    src={profile.photo}
                                    alt={`${profile.prenom} ${profile.nom}`}
                                    width={500}
                                    height={500}
                                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                                    priority
                                />
                            </div>
                            {/* Glow effects */}
                            <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-[#14213d]/10 to-[#fca311]/10 pointer-events-none"></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-3xl animate-rotate-slow opacity-60 bg-linear-to-br from-[#fca311]/40 to-[#fdb84d]/40 border-2 border-[#fca311]/30"></div>
                            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl animate-float bg-linear-to-br from-[#14213d]/20 to-[#fca311]/20"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
