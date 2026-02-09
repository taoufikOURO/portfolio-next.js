import { getProfile } from "@/app/lib/data";
import Image from "next/image";

export default function Hero() {
    const profile = getProfile();
    const bioText =
        profile.bio ||
        "J'insuffle à la technologie une part d'humanité, pour transformer vos idées en expériences web vivantes et harmonieuses.";

    return (
        <section className="min-h-[calc(100vh-80px)] bg-white md:-mt-25 -mt-16 ">
            <div className="max-w-6xl mx-auto px-6 py-16 md:py-12">
                {/* Layout mobile - ordre: badge, photo, nom, bio */}
                <div className="flex flex-col items-center text-center space-y-8 lg:hidden">
                    {/* Badge professionnel */}
                    <div className="inline-flex items-center gap-3 px-4 py-2 border border-[#14213d]/20 rounded-full">
                        <div className="w-2 h-2 bg-[#fca311] rounded-full"></div>
                        <span className="text-sm font-medium text-[#14213d] uppercase tracking-wide">
                            {profile.titreProfessionnel ||
                                "Développeur Web Full Stack"}
                        </span>
                    </div>

                    {/* Photo de profil */}
                    <div className="relative">
                        <div className="w-64 h-64 rounded-full overflow-hidden">
                            <Image
                                src={profile.photo}
                                alt={`${profile.prenom} ${profile.nom}`}
                                width={400}
                                height={400}
                                className="w-full h-full object-cover object-top"
                                priority
                            />
                        </div>
                        {/* Élément décoratif */}
                        <div className="absolute -bottom-4 -right-4 w-16 h-16 border-4 border-[#fca311] -z-10"></div>
                    </div>

                    {/* Titre principal */}
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold text-[#14213d] leading-tight">
                            {profile.prenom}{" "}
                            <span className="text-[#14213d]">
                                {profile.nom}
                            </span>
                        </h1>
                        <div className="w-16 h-1 bg-[#fca311] mx-auto"></div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-[#14213d]/70 leading-relaxed max-w-lg font-light">
                        {bioText}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-4 pt-4 w-full max-w-sm">
                        <a
                            href="#contact"
                            className="inline-flex items-center justify-center gap-2 bg-[#fca311] hover:bg-[#e09200] text-white px-8 py-4 font-semibold transition-colors duration-200"
                        >
                            <span>Collaborons ensemble</span>
                            <svg
                                className="w-4 h-4"
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
                            href={profile.cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 border-2 border-[#14213d] text-[#14213d] hover:bg-[#14213d] hover:text-white px-8 py-4 font-semibold transition-all duration-200"
                        >
                            <svg
                                className="w-4 h-4"
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
                            <span>Télécharger CV</span>
                        </a>
                    </div>

                    {/* Liens sociaux */}
                    <div className="flex flex-col items-center gap-4 pt-6">
                        <span className="text-sm font-medium text-[#14213d]/60 uppercase tracking-wide">
                            Suivez-moi
                        </span>
                        <div className="flex gap-3">
                            <a
                                href={profile.liens.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center border border-[#14213d]/20 hover:border-[#fca311] hover:text-[#fca311] text-[#14213d] transition-all duration-200"
                                aria-label="GitHub"
                            >
                                <i className="fab fa-github text-lg"></i>
                            </a>
                            <a
                                href={
                                    profile.liens.linkedin.startsWith("http")
                                        ? profile.liens.linkedin
                                        : `https://${profile.liens.linkedin}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center border border-[#14213d]/20 hover:border-[#fca311] hover:text-[#fca311] text-[#14213d] transition-all duration-200"
                                aria-label="LinkedIn"
                            >
                                <i className="fab fa-linkedin text-lg"></i>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Layout desktop - 2 colonnes */}
                <div className="hidden lg:grid grid-cols-2 gap-12 items-center">
                    {/* Contenu principal */}
                    <div className="space-y-8">
                        {/* Badge professionnel */}
                        <div className="inline-flex items-center gap-3 px-4 py-2 border border-[#14213d]/20 rounded-full">
                            <div className="w-2 h-2 bg-[#fca311] rounded-full"></div>
                            <span className="text-sm font-medium text-[#14213d] uppercase tracking-wide">
                                {profile.titreProfessionnel ||
                                    "Développeur Web Full Stack"}
                            </span>
                        </div>

                        {/* Titre principal */}
                        <div className="space-y-4">
                            <h1 className="text-5xl lg:text-6xl font-bold text-[#14213d] leading-tight">
                                {profile.prenom}{" "}
                                <span className="text-[#14213d]">
                                    {profile.nom}
                                </span>
                            </h1>

                            <div className="w-16 h-1 bg-[#fca311]"></div>
                        </div>

                        {/* Description */}
                        <p className="text-xl text-[#14213d]/70 leading-relaxed max-w-xl font-light">
                            {bioText}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <a
                                href="#contact"
                                className="inline-flex items-center justify-center gap-2 bg-[#fca311] hover:bg-[#e09200] text-white px-8 py-4 font-semibold transition-colors duration-200"
                            >
                                <span>Collaborons ensemble</span>
                                <svg
                                    className="w-4 h-4"
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
                                href={profile.cv}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 border-2 border-[#14213d] text-[#14213d] hover:bg-[#14213d] hover:text-white px-8 py-4 font-semibold transition-all duration-200"
                            >
                                <svg
                                    className="w-4 h-4"
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
                                <span>Télécharger CV</span>
                            </a>
                        </div>

                        {/* Liens sociaux */}
                        <div className="flex items-center gap-4 pt-6">
                            <span className="text-sm font-medium text-[#14213d]/60 uppercase tracking-wide">
                                Suivez-moi
                            </span>
                            <div className="flex gap-3">
                                <a
                                    href={profile.liens.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center border border-[#14213d]/20 hover:border-[#fca311] hover:text-[#fca311] text-[#14213d] transition-all duration-200"
                                    aria-label="GitHub"
                                >
                                    <i className="fab fa-github text-lg"></i>
                                </a>
                                <a
                                    href={
                                        profile.liens.linkedin.startsWith(
                                            "http",
                                        )
                                            ? profile.liens.linkedin
                                            : `https://${profile.liens.linkedin}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 flex items-center justify-center border border-[#14213d]/20 hover:border-[#fca311] hover:text-[#fca311] text-[#14213d] transition-all duration-200"
                                    aria-label="LinkedIn"
                                >
                                    <i className="fab fa-linkedin text-lg"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Photo de profil */}
                    <div className="flex justify-end">
                        <div className="relative">
                            <div className="w-96 h-96 overflow-hidden">
                                <Image
                                    src={profile.photo}
                                    alt={`${profile.prenom} ${profile.nom}`}
                                    width={400}
                                    height={400}
                                    className="w-full h-full object-cover object-top"
                                    priority
                                />
                            </div>

                            {/* Élément décoratif */}
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-4 border-[#fca311] -z-10"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
