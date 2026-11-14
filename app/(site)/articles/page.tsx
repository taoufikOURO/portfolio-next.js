import type { Metadata } from "next";

import { ArticleCard, EmptyList } from "@/components/site/Cards";
import { PageHero } from "@/components/site/PageHero";
import { getPublicArticles } from "@/lib/public/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Articles",
  description: "Articles publiés : notes, apprentissages et retours d'expérience.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getPublicArticles();
  return (
    <main id="contenu">
      <PageHero
        eyebrow={`Articles · ${articles.length} publié${articles.length > 1 ? "s" : ""}`}
        title="Articles"
        intro="Notes, apprentissages et retours d'expérience."
      />
      <section aria-label="Liste des articles" className="site-shell mt-12 sm:mt-16">
        {articles.length === 0 ? (
          <EmptyList>Aucun article publié pour le moment.</EmptyList>
        ) : (
          <ul className="grid gap-12 sm:gap-14">
            {articles.map((article, index) => (
              <ArticleCard key={article.slug} article={article} index={index} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
