import { getAllArticles } from "@/app/lib/data";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function ArticlesPage() {
    const articles = getAllArticles();

    return (
        <main className="shell py-10 md:py-16">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Retour
            </Link>

            <div className="mt-8 max-w-2xl">
                <h1 className="heading text-3xl sm:text-4xl">Notes</h1>
                <p className="mt-3 text-base leading-relaxed text-(--muted)">
                    Réflexions et apprentissages autour de la data, du machine
                    learning et du développement.
                </p>
            </div>

            <div className="mt-8 divide-y divide-(--line) border-y border-(--line)">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        href={`/articles/${article.slug}`}
                        className="group flex items-start justify-between gap-6 py-6"
                    >
                        <div>
                            <p className="text-xs text-(--muted)">
                                {article.categorie} ·{" "}
                                {new Date(article.date).toLocaleDateString(
                                    "fr-FR",
                                )}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold transition-colors group-hover:text-(--accent)">
                                {article.titre}
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-(--muted)">
                                {article.description}
                            </p>
                        </div>
                        <ArrowUpRight
                            className="mt-1 h-4 w-4 shrink-0 text-(--muted) transition-colors group-hover:text-(--accent)"
                            aria-hidden
                        />
                    </Link>
                ))}
            </div>
        </main>
    );
}
