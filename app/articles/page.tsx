import articlesData from "@/data/articles.json";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Articles - Taoufik OURO‑BANG'NA",
    description:
        "Découvrez mes articles sur la data science, le développement web et les dernières technologies",
};

export default function ArticlesPage() {
    // Trier les articles par date (plus récent en premier)
    const sortedArticles = [...articlesData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Fonction pour vérifier si l'article est nouveau (< 7 jours)
    const isNew = (dateString: string) => {
        const articleDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - articleDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 7;
    };

    // Formater la date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-white via-[#f8fafc] to-white -mt-25">
            {/* Header */}
            <section className="pt-24 pb-12 md:pt-32 md:pb-12 relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-20 right-0 w-80 h-80 blob blob-accent rounded-full opacity-10" />
                <div className="absolute -bottom-40 left-0 w-96 h-96 blob blob-primary rounded-full opacity-5" />

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    {/* Back button */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[#fca311] hover:text-[#14213d] font-medium transition-colors group mb-12"
                    >
                        <svg
                            className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Retour à l&apos;accueil
                    </Link>

                    {/* Header content */}
                    <div className="text-center animate-fade-in-up">
                        <h1 className="text-6xl md:text-7xl font-black leading-tight">
                            <span className="text-[#14213d] bg-clip-text">
                                Articles
                            </span>
                        </h1>
                    </div>
                </div>
            </section>

            {/* Articles Grid */}
            <section className="py-12 md:py-16 relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    {sortedArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
                            {sortedArticles.map((article, index) => (
                                <article
                                    key={article.id}
                                    className="group h-full"
                                    style={{
                                        animation: `fadeInUp 0.8s ease-out forwards`,
                                        animationDelay: `${100 + index * 100}ms`,
                                    }}
                                >
                                    <Link
                                        href={`/articles/${article.slug}`}
                                        className="block h-full"
                                    >
                                        <div className="glass rounded-2xl overflow-hidden h-full flex flex-col hover-lift hover:shadow-[0_20px_50px_rgba(252,163,17,0.25)] hover:border-[#fca311]/60 border-[#fca311]/20 transition-all group">
                                            {/* Image container */}
                                            <div className="relative h-56 bg-linear-to-br from-[#14213d]/20 to-[#fca311]/10 overflow-hidden">
                                                <Image
                                                    src={
                                                        article.image ||
                                                        "/images/projets/default-project.svg"
                                                    }
                                                    alt={article.titre}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />

                                                {/* Nouveau badge */}
                                                {isNew(article.date) && (
                                                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-linear-to-r from-[#fca311] to-[#fdb84d] text-[#14213d] text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
                                                        Nouveau
                                                    </div>
                                                )}

                                                {/* Overlay gradient */}
                                                <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6 flex flex-col grow">
                                                {/* Category */}
                                                <div className="mb-3">
                                                    <span className="inline-block text-xs font-bold text-[#fca311] uppercase tracking-widest bg-[#fca311]/10 px-3 py-1 rounded-full">
                                                        {article.categorie}
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-xl font-bold text-[#14213d] mb-3 group-hover:text-[#fca311] transition-colors line-clamp-2">
                                                    {article.titre}
                                                </h3>

                                                {/* Description */}
                                                <p className="text-sm text-[#14213d]/70 mb-4 line-clamp-2 grow">
                                                    {article.description}
                                                </p>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-4 border-t border-[#14213d]/10 group-hover:border-[#fca311]/20 transition-colors">
                                                    <span className="text-xs text-[#14213d]/60">
                                                        {formatDate(
                                                            article.date,
                                                        )}
                                                    </span>
                                                    <svg
                                                        className="w-5 h-5 text-[#fca311] opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all"
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

                                            {/* Bottom accent line */}
                                            <div className="h-1 w-0 bg-linear-to-r from-[#fca311] to-[#fdb84d] group-hover:w-full transition-all duration-300"></div>
                                        </div>
                                    </Link>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 animate-fade-in-up">
                            <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl border-4 border-[#fca311]/20 bg-linear-to-br from-[#fca311]/10 to-transparent mb-8">
                                <i className="fas fa-pen-fancy text-[#fca311]/40 text-5xl animate-float"></i>
                            </div>
                            <p className="text-[#14213d]/60 text-xl font-light">
                                Articles en cours de rédaction...
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
