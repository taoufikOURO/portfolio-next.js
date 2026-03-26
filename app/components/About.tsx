import { getProfile } from "@/app/lib/data";

export default function About() {
    const profile = getProfile();
    const fullName = `${profile.prenom} ${profile.nom}`;
    const aboutText =
        profile.aPropos ||
        `Je suis ${fullName}, explorateur du web et artisan du code. Guidé par la passion de l'innovation digitale, j'unis logique et créativité pour donner vie à des applications élégantes, performantes et durables. Chaque projet est pour moi une œuvre en mouvement — une rencontre entre la précision du code et l'émotion du design.`;

    const highlights = [
        {
            icon: "fa-brain",
            title: "Data Science",
            description:
                "Analyse avancée, machine learning et insights actionables à partir des données",
        },
        {
            icon: "fa-code",
            title: "Développement",
            description:
                "Code propre, performant et maintenable avec les dernières technologies",
        },
        {
            icon: "fa-palette",
            title: "Design UX/UI",
            description:
                "Une attention particulière portée à l'esthétique et l'expérience utilisateur",
        },
        {
            icon: "fa-rocket",
            title: "Innovation",
            description:
                "Toujours à la recherche des dernières technologies pour des solutions innovantes",
        },
    ];

    return (
        <section
            id="about"
            className="py-24 md:py-32 pb-20 bg-linear-to-b from-white via-[#f8fafc] to-white relative overflow-hidden"
        >
            {/* Decorative elements */}
            <div className="absolute top-20 right-0 w-72 h-72 blob blob-accent rounded-full opacity-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 blob blob-primary rounded-full opacity-5" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header épuré avec animations */}
                <div className="text-center mb-20 animate-fade-in-up">
                    <span className="inline-block text-sm font-bold text-[#fca311] uppercase tracking-widest mb-4 animate-fade-in-down">
                        À Propos de Moi
                    </span>

                    <h2 className="text-5xl md:text-6xl font-black leading-tight">
                        <span className="block text-[#14213d]">Créateur</span>
                        <span className="block text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                            d&apos;Univers Data
                        </span>
                    </h2>

                    <div className="flex justify-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-16 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full animate-gradient-shift"></div>
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                    </div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        Découvrez qui je suis et les valeurs qui guident mon
                        approche en Data Science et développement web
                    </p>
                </div>

                {/* Contenu principal */}
                <div className="max-w-4xl mx-auto mb-24">
                    <div className="glass rounded-3xl p-12 md:p-16 relative overflow-hidden ">
                        {/* Animated border */}
                        <div className="absolute inset-0 rounded-3xl"></div>

                        <div className="relative">
                            <p className="text-xl text-[#14213d] leading-relaxed font-light">
                                {aboutText}
                            </p>

                            {/* Éléments décoratifs */}
                            <div className="absolute -bottom-6 -right-6 w-16 h-16"></div>
                        </div>
                    </div>
                </div>

                {/* Points forts en grid avec animations futuristes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in-up animation-delay-300 mb-5">
                    {highlights.map((item, index) => (
                        <div
                            key={index}
                            className="group"
                            style={{
                                animation: `fadeInUp 0.8s ease-out forwards`,
                                animationDelay: `${400 + index * 100}ms`,
                            }}
                        >
                            <div className=" rounded-2xl p-8 h-full hover-lift transition-all hover:border-[#fca311]">
                                {/* Icon container with glow */}
                                <div className="relative mb-6 inline-block">
                                    <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-linear-to-br from-[#fca311]/20 to-[#fca311]/5 border border-[#fca311]/20 group-hover:border-[#fca311]/60 group-hover:shadow-[0_0_20px_rgba(252,163,17,0.3)] transition-all">
                                        <i
                                            className={`fas ${item.icon} text-3xl text-[#fca311] group-hover:scale-110 transition-transform`}
                                        ></i>
                                    </div>
                                    <div className="absolute inset-0 rounded-2xl bg-[#fca311]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                                </div>

                                <h3 className="text-xl font-bold text-[#14213d] mb-4 group-hover:text-[#fca311] transition-colors">
                                    {item.title}
                                </h3>

                                <p className="text-[#14213d]/70 leading-relaxed text-sm">
                                    {item.description}
                                </p>

                                {/* Bottom accent line */}
                                <div className="mt-6 h-1 w-0 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full group-hover:w-12 transition-all duration-300"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
