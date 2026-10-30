import { getRecentArticles } from "@/app/lib/data";
import { formatDate } from "@/app/lib/format";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Reveal from "./Reveal";

export default function Articles() {
    const articles = getRecentArticles(3);

    if (articles.length === 0) return null;

    return (
        <section id="notes" className="section">
            <div className="shell">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--line-strong) pb-4">
                    <span className="label">Notes</span>
                    <Link href="/articles" className="pill pill-dark">
                        Toutes les notes
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                </div>

                <div className="mt-5 space-y-3">
                    {articles.map((article, index) => (
                        <Reveal key={article.id} delay={index * 0.08}>
                            <Link
                                href={`/articles/${article.slug}`}
                                className="group flex items-center justify-between gap-6 rounded-3xl bg-(--surface) p-6 transition-colors hover:bg-white md:p-8"
                            >
                                <div className="min-w-0">
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-(--accent)">
                                        {article.categorie} ·{" "}
                                        {formatDate(article.date)}
                                    </p>
                                    <h3 className="heading mt-2 text-[clamp(1.4rem,3vw,2.3rem)] transition-colors group-hover:text-(--accent)">
                                        {article.titre}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-(--muted)">
                                        {article.description}
                                    </p>
                                </div>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--ink) text-white transition-transform group-hover:rotate-45">
                                    <ArrowUpRight
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                </span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
