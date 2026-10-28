import { getRecentArticles } from "@/app/lib/data";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Articles() {
    const articles = getRecentArticles(3);

    if (articles.length === 0) return null;

    return (
        <section id="notes" className="section">
            <Reveal className="shell">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="heading section-heading text-3xl">
                        Notes
                    </h2>
                    <Link
                        href="/articles"
                        className="inline-flex items-center gap-1 text-sm font-medium text-(--accent) hover:underline"
                    >
                        Toutes les notes
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </Link>
                </div>

                <div className="mt-8 divide-y divide-(--line) border-y border-(--line)">
                    {articles.map((article) => (
                        <Link
                            key={article.id}
                            href={`/articles/${article.slug}`}
                            className="group flex items-start justify-between gap-6 py-5"
                        >
                            <div>
                                <p className="text-xs font-medium text-(--accent)">
                                    {article.categorie} ·{" "}
                                    {new Date(article.date).toLocaleDateString(
                                        "fr-FR",
                                    )}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold transition-colors group-hover:text-(--accent)">
                                    {article.titre}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-sm text-(--muted)">
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
            </Reveal>
        </section>
    );
}
