import articlesData from "@/data/articles.json";
import fs from "fs";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";

// Pour générer les routes statiques
export async function generateStaticParams() {
    return articlesData.map((article) => ({
        slug: article.slug,
    }));
}

// Pour les métadonnées
export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}) {
    const params = await props.params;
    const article = articlesData.find((a) => a.slug === params.slug);

    if (!article) return {};

    return {
        title: `${article.titre} - Taoufik OURO‑BANG'NA`,
        description: article.description,
    };
}

export default async function ArticlePage(props: {
    params: Promise<{ slug: string }>;
}) {
    const params = await props.params;
    const article = articlesData.find((a) => a.slug === params.slug);

    if (!article) {
        notFound();
    }

    // Lire le fichier markdown
    const mdPath = path.join(
        process.cwd(),
        "data/articles",
        `${article.slug}.md`,
    );

    let content = "";
    try {
        content = fs.readFileSync(mdPath, "utf-8");
    } catch (error) {
        console.error("Error reading markdown file:", error);
        notFound();
    }

    // Formater la date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Convertir markdown simple en HTML (basic conversion)
    const parseMarkdown = (md: string) => {
        let html = md;

        // Échapper les caractères HTML spéciaux
        html = html.replace(/&/g, "&amp;");
        html = html.replace(/</g, "&lt;");
        html = html.replace(/>/g, "&gt;");

        // Code blocks - faire d'abord pour éviter les interférences
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const escapedCode = code
                .trim()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return `<pre><code>${escapedCode}</code></pre>`;
        });

        // Inline code
        html = html.replace(
            /`([^`]+)`/g,
            "<code class='inline-code'>$1</code>",
        );

        // En-têtes (faire avant les paragraphes)
        html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
        html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
        html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

        // Gras et italique (avant les listes)
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
        html = html.replace(/_(.*?)_/g, "<em>$1</em>");

        // Images - FAIRE AVANT les liens normaux!
        html = html.replace(
            /!\[(.*?)\]\((.*?)\)/g,
            '<img src="$2" alt="$1" class="max-w-3xl mx-auto rounded-lg my-6 shadow-lg" />',
        );

        // Liens
        html = html.replace(
            /\[(.*?)\]\((.*?)\)/g,
            '<a href="$2" class="link-styled">$1</a>',
        );

        // Listes numérotées - wrapper dans <ol>
        html = html.replace(
            /^(\d+\. .*?)(?=^(?:\d+\.|[^0-9])|$)/gm,
            (match) => {
                const items = match.trim().split("\n");
                const listItems = items
                    .map((item) => {
                        const text = item.replace(/^\d+\.\s*/, "");
                        return `<li>${text}</li>`;
                    })
                    .join("");
                return `<ol>${listItems}</ol>`;
            },
        );

        // Listes à puces - wrapper dans <ul>
        html = html.replace(
            /^([\*\-] .*?)(?=^(?:[\*\-]|[^\*\-])|$)/gm,
            (match) => {
                const items = match.trim().split("\n");
                const listItems = items
                    .map((item) => {
                        const text = item.replace(/^[\*\-]\s*/, "");
                        return `<li>${text}</li>`;
                    })
                    .join("");
                return `<ul>${listItems}</ul>`;
            },
        );

        // Ligne horizontale
        html = html.replace(/^---+$/gm, "<hr />");

        // Paragraphes - ajouter des balises <p> aux lignes qui ne sont pas déjà des tags
        const lines = html.split("\n");
        const processedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (
                !trimmed ||
                trimmed.startsWith("<") ||
                trimmed.startsWith("</")
            ) {
                return line;
            }
            return `<p>${line}</p>`;
        });

        html = processedLines.join("\n");

        // Nettoyer les espaces multiples
        html = html.replace(/\n\n+/g, "\n");

        // Ajouter des styles CSS aux balises
        html = html.replace(
            /<h1>/g,
            '<h1 class="text-3xl md:text-4xl font-bold mt-8 mb-4 text-[#14213d]">',
        );
        html = html.replace(
            /<h2>/g,
            '<h2 class="text-2xl md:text-3xl font-bold mt-6 mb-3 text-[#14213d]">',
        );
        html = html.replace(
            /<h3>/g,
            '<h3 class="text-xl font-bold mt-4 mb-2 text-[#14213d]">',
        );
        html = html.replace(
            /<p>/g,
            '<p class="text-base leading-relaxed text-[#14213d]/80 mb-4">',
        );
        html = html.replace(
            /<li>/g,
            '<li class="ml-6 mb-2 text-[#14213d]/80">',
        );
        html = html.replace(/<ul>/g, '<ul class="list-disc space-y-2 mb-4">');
        html = html.replace(
            /<ol>/g,
            '<ol class="list-decimal space-y-2 mb-4">',
        );
        html = html.replace(
            /<code/g,
            '<code class="bg-[#14213d]/10 px-2 py-1 rounded text-sm font-mono"',
        );
        html = html.replace(
            /<pre>/g,
            '<pre class="bg-[#14213d]/5 p-4 rounded-lg overflow-x-auto mb-4 border border-[#14213d]/10">',
        );
        html = html.replace(
            /<a /g,
            '<a class="text-[#fca311] hover:text-[#fdb84d] underline transition-colors" ',
        );
        html = html.replace(
            /<hr \/>/g,
            '<hr class="my-6 border-t-2 border-[#fca311]/20" />',
        );

        return html;
    };

    return (
        <article className="min-h-screen bg-linear-to-b from-white via-[#f8fafc] to-white pt-8 md:pt-0">
            {/* Back button */}
            <div className="max-w-3xl mx-auto px-6 mb-12">
                <Link
                    href="/articles"
                    className="inline-flex items-center gap-2 text-[#fca311] hover:text-[#14213d] font-medium transition-colors group"
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
                    Retour aux articles
                </Link>
            </div>

            <div className="max-w-3xl mx-auto px-6">
                {/* Article Header */}
                <header className="mb-12">
                    {/* Category and Date */}
                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                        <span className="inline-block text-xs font-bold text-[#fca311] uppercase tracking-widest bg-[#fca311]/10 px-3 py-1 rounded-full">
                            {article.categorie}
                        </span>
                        <span className="text-sm text-[#14213d]/60">
                            {formatDate(article.date)}
                        </span>
                        <span className="text-sm text-[#14213d]/60">•</span>
                        <span className="text-sm text-[#14213d]/70 font-medium">
                            {article.auteur}
                        </span>
                    </div>

                    {/* Divider */}
                    <div className="flex gap-3">
                        <div className="w-12 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-8 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full"></div>
                    </div>
                </header>

                {/* Article Content */}
                <div className="glass rounded-3xl mt-10 md:p-12 -mt-25 mb-16 prose-custom">
                    <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: parseMarkdown(content),
                        }}
                    />
                </div>
            </div>

            {/* Global Styles for Markdown */}
            <style>{`
                .prose h1 {
                    @apply text-3xl md:text-4xl font-black text-[#14213d] mt-10 mb-6 leading-tight;
                }
                .prose h2 {
                    @apply text-2xl md:text-3xl font-black text-[#14213d] mt-9 mb-5 leading-tight;
                }
                .prose h3 {
                    @apply text-xl md:text-2xl font-bold text-[#14213d] mt-8 mb-4;
                }
                .prose p {
                    @apply text-lg text-[#14213d]/80 leading-relaxed mb-6 font-light;
                }
                .prose strong {
                    @apply font-bold text-[#14213d];
                }
                .prose em {
                    @apply italic text-[#14213d]/70;
                }
                .prose a {
                    @apply text-[#fca311] hover:text-[#fdb84d] font-semibold transition-colors;
                }
                .prose li {
                    @apply text-lg text-[#14213d]/80 leading-relaxed mb-2 ml-6 list-disc;
                }
                .prose pre {
                    @apply bg-[#14213d] text-white p-4 rounded-lg mb-6 overflow-x-auto;
                }
                .prose code {
                    @apply font-mono text-sm;
                }
            `}</style>
        </article>
    );
}
