import ShareArticleButton from "@/app/components/ShareArticleButton";
import articlesData from "@/data/articles.json";
import fs from "fs";
import hljs from "highlight.js";
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

    let content = "";

    // Vérifier si c'est une URL en ligne
    if (
        article.mdFile.startsWith("http://") ||
        article.mdFile.startsWith("https://")
    ) {
        try {
            // Convertir l'URL GitHub en URL brute si nécessaire
            let fetchUrl = article.mdFile;
            if (article.mdFile.includes("github.com")) {
                // Convertir : https://github.com/user/repo/blob/branch/path/file.md
                // En : https://raw.githubusercontent.com/user/repo/branch/path/file.md
                fetchUrl = article.mdFile
                    .replace("github.com", "raw.githubusercontent.com")
                    .replace("/blob/", "/");
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            content = await response.text();
        } catch (error) {
            console.error("Error fetching markdown file:", error);
            notFound();
        }
    } else {
        // Lire le fichier local
        try {
            const mdPath = path.join(process.cwd(), article.mdFile);
            content = fs.readFileSync(mdPath, "utf-8");
        } catch (error) {
            console.error("Error reading markdown file:", error);
            notFound();
        }
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
        const codeBlocks: string[] = [];

        // ÉTAPE 1: Extraire et colorer les blocs de code
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const trimmedCode = code.trim();
            const lines = trimmedCode.split("\n");
            let language = "";
            let codeContent = trimmedCode;

            // Vérifier si première ligne = langage
            const firstLine = lines[0].trim();
            if (
                firstLine.match(/^[a-z0-9]+$/) &&
                [
                    "python",
                    "javascript",
                    "js",
                    "typescript",
                    "ts",
                    "jsx",
                    "tsx",
                    "html",
                    "css",
                    "json",
                    "bash",
                    "shell",
                    "java",
                    "cpp",
                    "c",
                    "csharp",
                    "php",
                    "ruby",
                    "go",
                    "rust",
                    "sql",
                    "xml",
                    "yaml",
                    "yml",
                    "plaintext",
                ].includes(firstLine.toLowerCase())
            ) {
                language = firstLine.toLowerCase();
                codeContent = lines.slice(1).join("\n");
            }

            // Colorer avec highlight.js
            let highlightedCode = "";
            try {
                if (language) {
                    highlightedCode = hljs.highlight(codeContent, {
                        language,
                    }).value;
                } else {
                    const result = hljs.highlightAuto(codeContent);
                    highlightedCode = result.value;
                    language = result.language || "text";
                }
            } catch {
                highlightedCode = codeContent
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
            }

            const codeBlock = `<div class="code-block-wrapper" data-language="${language}"><div class="code-block-header"><span class="code-language">${language}</span><button class="copy-button" onclick="copyToClipboard(this)" title="Copier le code"><span class="copy-text">Copier</span></button></div><pre class="hljs"><code>${highlightedCode}</code></pre></div>`;
            codeBlocks.push(codeBlock);
            // Retourner un marqueur simple et unique
            return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
        });

        // ÉTAPE 2: Échapper les caractères HTML spéciaux
        html = html.replace(/&/g, "&amp;");
        html = html.replace(/</g, "&lt;");
        html = html.replace(/>/g, "&gt;");

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
                trimmed.startsWith("</") ||
                trimmed.startsWith("&lt;!--CODE_PLACEHOLDER")
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

        // ÉTAPE 3: Restaurer les blocs de code colorisés
        for (let i = 0; i < codeBlocks.length; i++) {
            html = html.replace(`\x00CODEBLOCK${i}\x00`, codeBlocks[i]);
        }

        return html;
    };

    return (
        <article className="poster-section data-grid min-h-screen px-6 pb-24 pt-32">
            {/* Back button */}
            <div className="mx-auto mb-12 max-w-4xl">
                <Link
                    href="/articles"
                    className="section-label transition-colors hover:text-[#668b26]"
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

            <div className="mx-auto max-w-4xl">
                {/* Article Header */}
                <header className="reveal mb-12">
                    {/* Category and Date */}
                    <div className="flex items-center gap-4 mb-6 flex-wrap">
                        <span className="eyebrow">{article.categorie}</span>
                        <span className="text-sm text-[#14213d]/60">
                            {formatDate(article.date)}
                        </span>
                        <span className="text-sm text-[#14213d]/60">•</span>
                        <span className="text-sm text-[#14213d]/70 font-medium">
                            {article.auteur}
                        </span>
                        <span className="text-sm text-[#14213d]/60">•</span>
                        <ShareArticleButton />
                    </div>

                    {/* Divider */}
                    <div className="flex gap-3">
                        <div className="w-12 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-8 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full"></div>
                    </div>
                </header>

                {/* Article Content */}
                <div className="article-paper mt-10 mb-16 p-6 md:p-12 prose-custom">
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
                    @apply text-3xl md:text-4xl font-black mt-10 mb-6 leading-tight;
                }
                .prose h2 {
                    @apply text-2xl md:text-3xl font-black mt-9 mb-5 leading-tight;
                }
                .prose h3 {
                    @apply text-xl md:text-2xl font-bold mt-8 mb-4;
                }
                .prose p {
                    @apply text-lg leading-relaxed mb-6 font-light text-(--muted);
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

                /* Code Block Styles */
                .code-block-wrapper {
                    margin-bottom: 1.5rem;
                    border-radius: 0.75rem;
                    overflow: hidden;
                    background: #1e293b;
                    border: 1px solid #334155;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
                    transition: box-shadow 0.3s ease, border-color 0.3s ease;
                }
                .code-block-wrapper:hover {
                    border-color: #475569;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3);
                }
                .code-block-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    background: linear-gradient(to bottom, #0f172a, #1e293b);
                    border-bottom: 1px solid #334155;
                }
                .code-language {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    opacity: 0.85;
                }
                .copy-button {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #e2e8f0;
                    background: #334155;
                    border: 1px solid #475569;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.2, 0.8, 0.4, 1);
                }
                .copy-button:hover {
                    background: #475569;
                    border-color: #64748b;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    transform: translateY(-1px);
                }
                .copy-button:active {
                    transform: scale(0.96);
                    background: #64748b;
                }
                .copy-button.copied {
                    background: #22863a;
                    border-color: #238636;
                    color: #c9d1d9;
                }
                .copy-text {
                    white-space: nowrap;
                    transition: opacity 0.3s ease;
                }
                .code-block-wrapper .hljs {
                    display: block;
                    overflow-x: auto;
                    background: #1e293b;
                    color: #e2e8f0;
                    padding: 1.25rem;
                    margin: 0;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 14px;
                    line-height: 1.6;
                }
                .code-block-wrapper code {
                    background: transparent;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 0.875rem;
                    line-height: 1.6;
                    letter-spacing: 0.01em;
                }

                /* Syntax Highlighting - Dark Theme */
                .hljs { background: #1e293b; color: #e2e8f0; }
                .hljs-attr { color: #a78bfa; }
                .hljs-attribute { color: #a78bfa; }
                .hljs-built_in { color: #60a5fa; }
                .hljs-builtin-name { color: #60a5fa; }
                .hljs-literal { color: #f87171; }
                .hljs-meta { color: #86efac; }
                .hljs-number { color: #f87171; }
                .hljs-code { color: #f87171; }
                .hljs-regexp { color: #f87171; }
                .hljs-string { color: #34d399; }
                .hljs-title { color: #c4b5fd; font-weight: 600; }
                .hljs-title\.class_ { color: #c4b5fd; }
                .hljs-title\.function_ { color: #a78bfa; }
                .hljs-name { color: #c4b5fd; }
                .hljs-selector-tag { color: #60a5fa; }
                .hljs-selector-id { color: #60a5fa; }
                .hljs-selector-class { color: #60a5fa; }
                .hljs-selector-attr { color: #60a5fa; }
                .hljs-symbol { color: #f87171; }
                .hljs-bullet { color: #f87171; }
                .hljs-link { color: #60a5fa; }
                .hljs-keyword { color: #f87171; }
                .hljs-comment { color: #64748b; }
                .hljs-variable { color: #cbd5e1; }
                .hljs-template-variable { color: #cbd5e1; }
                .hljs-strong { font-weight: 700; }
                .hljs-emphasis { font-style: italic; }
                .hljs-quote { color: #64748b; }
                .hljs-doctag { color: #fb7185; }
                .hljs-type { color: #60a5fa; }
                .hljs-section { color: #60a5fa; }
                .hljs-tag { color: #86efac; }
                .hljs-params { color: #cbd5e1; }
                .hljs-operator { color: #f87171; }
            `}</style>

            {/* Copy Script */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `window.copyToClipboard = function(btn) { 
                        const wrapper = btn.closest('.code-block-wrapper'); 
                        const code = wrapper.querySelector('code'); 
                        const text = code.innerText; 
                        const textSpan = btn.querySelector('.copy-text');
                        const origText = textSpan.innerText;
                        
                        navigator.clipboard.writeText(text).then(() => { 
                            btn.classList.add('copied');
                            textSpan.innerText = 'Copié!';
                            
                            setTimeout(() => { 
                                btn.classList.remove('copied');
                                textSpan.innerText = origText; 
                            }, 2000); 
                        }).catch(e => {
                            console.error('Erreur:', e);
                            textSpan.innerText = 'Erreur';
                            setTimeout(() => { textSpan.innerText = origText; }, 2000);
                        }); 
                    }`,
                }}
            />
        </article>
    );
}
