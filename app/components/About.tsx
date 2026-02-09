import { getProfile } from "@/app/lib/data";

export default function About() {
    const profile = getProfile();
    const fullName = `${profile.prenom} ${profile.nom}`;
    const aboutText =
        profile.aPropos ||
        `Je suis ${fullName}, explorateur du web et artisan du code. Guidé par la passion de l'innovation digitale, j'unis logique et créativité pour donner vie à des applications élégantes, performantes et durables. Chaque projet est pour moi une œuvre en mouvement — une rencontre entre la précision du code et l'émotion du design.`;

    const highlights = [
        {
            icon: "fa-rocket",
            title: "Innovation",
            description:
                "Toujours à la recherche des dernières technologies pour créer des solutions innovantes",
        },
        {
            icon: "fa-palette",
            title: "Design",
            description:
                "Une attention particulière portée à l'esthétique et à l'expérience utilisateur",
        },
        {
            icon: "fa-code",
            title: "Qualité",
            description:
                "Code propre, performant et maintenable pour des applications durables",
        },
        {
            icon: "fa-users",
            title: "Collaboration",
            description:
                "Travail d'équipe et communication pour des projets réussis",
        },
    ];

    return (
        <section id="about" className="py-24 bg-white">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header épuré */}
                <div className="text-center mb-16">

                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] mb-6 leading-tight">
                        Créateur d&apos;
                        <span className="text-[#14213d]">
                            univers numériques
                        </span>
                    </h2>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto"></div>
                </div>

                {/* Contenu principal épuré */}
                <div className="max-w-4xl mx-auto mb-20">
                    <div className="bg-white border border-[#14213d]/10 p-12 relative">
                        <p className="text-xl text-[#14213d]/80 leading-relaxed text-center font-light">
                            {aboutText}
                        </p>

                        {/* Élément décoratif */}
                        <div className="absolute -top-4 -left-4 w-8 h-8 bg-[#fca311]"></div>
                        <div className="absolute -bottom-4 -right-4 w-8 h-8 border-4 border-[#fca311]"></div>
                    </div>
                </div>

                {/* Points forts en grid minimaliste */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {highlights.map((item, index) => (
                        <div
                            key={index}
                            className="text-center group hover:-translate-y-2 transition-all duration-200"
                        >
                            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-[#14213d]/20 group-hover:border-[#fca311] group-hover:bg-[#fca311]/5 transition-all duration-200">
                                <i
                                    className={`fas ${item.icon} text-2xl text-[#14213d] group-hover:text-[#fca311] transition-colors`}
                                ></i>
                            </div>

                            <h3 className="text-lg font-bold text-[#14213d] mb-3 group-hover:text-[#fca311] transition-colors">
                                {item.title}
                            </h3>

                            <p className="text-[#14213d]/70 leading-relaxed text-sm">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
