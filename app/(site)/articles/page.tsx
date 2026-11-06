import PageHeader from "@/app/components/PageHeader";
import Reveal from "@/app/components/Reveal";
import { getAllArticles } from "@/app/lib/data";
import { formatDate } from "@/app/lib/format";
import { siteName } from "@/app/lib/site";
import { ArrowUpRight, NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: `Notes | ${siteName}`,
    description:
        "Réflexions et apprentissages autour de la data, du machine learning et du développement.",
    alternates: {
        canonical: "/articles",
    },
};

export default function ArticlesPage() {
    const articles = getAllArticles();

    return (
        <main id="contenu" className="shell pb-16 pt-24 md:pt-28">
            <PageHeader
                title="Notes"
                description="Réflexions et apprentissages autour de la data, du machine learning et du développement."
            />

            {articles.length === 0 ? (
                <div className="mt-10 flex flex-col items-center gap-3 rounded-[1.5rem] bg-(--surface) px-6 py-16 text-center">
                    <NotebookPen
                        className="h-8 w-8 text-(--muted)"
                        aria-hidden
                    />
                    <p className="text-sm text-(--muted)">
                        Aucune note publiée pour le moment.
                    </p>
                </div>
            ) : (
                <div className="mt-4 space-y-3">
                    {articles.map((article, index) => (
                        <Reveal key={article.id} delay={index * 0.06}>
                            <Link
                                href={`/articles/${article.slug}`}
                                className="group flex items-center justify-between gap-6 rounded-[1.5rem] bg-(--surface) p-6 transition-colors hover:bg-white md:p-8"
                            >
                                <div className="min-w-0">
                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-(--accent)">
                                        {article.categorie} ·{" "}
                                        {formatDate(article.date)}
                                    </p>
                                    <h2 className="heading mt-2 text-[clamp(1.4rem,3vw,2.3rem)] transition-colors group-hover:text-(--accent)">
                                        {article.titre}
                                    </h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-(--muted)">
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
            )}
        </main>
    );
}
