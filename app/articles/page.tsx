import { getAllArticles } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function ArticlesPage() {
    const articles = getAllArticles();
    return (
        <main className="poster-section data-grid min-h-screen px-6 pb-24 pt-32 md:px-12 lg:px-20">
            <div className="mx-auto max-w-7xl">
                <Link href="/" className="section-label">
                    Retour accueil
                </Link>
                <div className="mt-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
                    <h1 className="display poster-heading">
                        Notes de
                        <br />
                        <span className="text-[#668b26]">terrain.</span>
                    </h1>
                    <p className="max-w-sm text-lg leading-relaxed text-(--muted)">
                        Réflexions, apprentissages et fragments de recherche
                        entre data et produit.
                    </p>
                </div>
                <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {articles.map((article, index) => (
                        <Link
                            key={article.id}
                            href={`/articles/${article.slug}`}
                            className="editorial-card group overflow-hidden"
                        >
                            <div className="relative aspect-4/3 overflow-hidden bg-(--blue)">
                                {article.image && (
                                    <Image
                                        src={article.image}
                                        alt={article.titre}
                                        fill
                                        className="object-cover grayscale transition duration-700 group-hover:grayscale-0"
                                    />
                                )}
                                <span className="absolute left-4 top-4 bg-(--lime) px-2 py-1 font-mono text-[10px]">
                                    NOTE_{String(index + 1).padStart(2, "0")}
                                </span>
                            </div>
                            <div className="p-6">
                                <p className="font-mono text-xs text-(--coral)">
                                    {article.categorie} ·{" "}
                                    {new Date(article.date).toLocaleDateString(
                                        "fr-FR",
                                    )}
                                </p>
                                <h2 className="mt-4 text-2xl font-bold leading-tight group-hover:text-[#668b26]">
                                    {article.titre}
                                </h2>
                                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-(--muted)">
                                    {article.description}
                                </p>
                                <span className="mt-6 block font-mono text-xs">
                                    Lire la note ↗
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
