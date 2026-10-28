import ShareArticleButton from "@/app/components/ShareArticleButton";
import articlesData from "@/data/articles.json";
import fs from "fs";
import hljs from "highlight.js";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";

export async function generateStaticParams() {
    return articlesData.map((article) => ({
        slug: article.slug,
    }));
}

export async function generateMetadata(props: {
    params: Promise<{ slug: string }>;
}) {
    const params = await props.params;
    const article = articlesData.find((item) => item.slug === params.slug);

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
    const article = articlesData.find((item) => item.slug === params.slug);

    if (!article) {
        notFound();
    }

    let content = "";

    if (
        article.mdFile.startsWith("http://") ||
        article.mdFile.startsWith("https://")
    ) {
        try {
            let fetchUrl = article.mdFile;
            if (article.mdFile.includes("github.com")) {
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
        try {
            const mdPath = path.join(process.cwd(), article.mdFile);
            content = fs.readFileSync(mdPath, "utf-8");
        } catch (error) {
            console.error("Error reading markdown file:", error);
            notFound();
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const parseMarkdown = (input: string) => {
        let html = input.replace(/^#\s+.*(?:\r?\n)+/, "");
        const codeBlocks: string[] = [];

        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            const trimmedCode = code.trim();
            const lines = trimmedCode.split("\n");
            let language = "";
            let codeContent = trimmedCode;

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
            return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
        });

        html = html.replace(/&/g, "&amp;");
        html = html.replace(/</g, "&lt;");
        html = html.replace(/>/g, "&gt;");

        html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

        html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
        html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
        html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
        html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
        html = html.replace(/_(.*?)_/g, "<em>$1</em>");

        html = html.replace(
            /!\[(.*?)\]\((.*?)\)/g,
            '<img src="$2" alt="$1" class="mx-auto my-8 max-w-3xl rounded-lg border border-(--line)" />',
        );

        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

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

        html = html.replace(/^---+$/gm, "<hr />");

        const lines = html.split("\n");
        const processedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (
                !trimmed ||
                trimmed.startsWith("<") ||
                trimmed.startsWith("</") ||
                trimmed.startsWith("\x00CODEBLOCK")
            ) {
                return line;
            }
            return `<p>${line}</p>`;
        });

        html = processedLines.join("\n");
        html = html.replace(/\n\n+/g, "\n");

        html = html.replace(
            /<h1>/g,
            '<h1 class="mt-10 mb-4 text-3xl font-bold text-(--text) md:text-4xl">',
        );
        html = html.replace(
            /<h2>/g,
            '<h2 class="mt-9 mb-3 text-2xl font-bold text-(--text) md:text-3xl">',
        );
        html = html.replace(
            /<h3>/g,
            '<h3 class="mt-7 mb-2 text-xl font-bold text-(--text)">',
        );
        html = html.replace(
            /<p>/g,
            '<p class="mb-5 text-base leading-relaxed text-(--muted)">',
        );
        html = html.replace(
            /<li>/g,
            '<li class="mb-2 ml-6 text-(--muted)">',
        );
        html = html.replace(
            /<strong>/g,
            '<strong class="font-bold text-(--text)">',
        );
        html = html.replace(
            /<em>/g,
            '<em class="italic text-(--muted)">',
        );
        html = html.replace(/<ul>/g, '<ul class="mb-4 list-disc space-y-2">');
        html = html.replace(
            /<ol>/g,
            '<ol class="mb-4 list-decimal space-y-2">',
        );
        html = html.replace(
            /<code/g,
            '<code class="rounded bg-(--surface-2) px-1.5 py-0.5 font-mono text-sm text-(--text)"',
        );
        html = html.replace(
            /<pre>/g,
            '<pre class="mb-4 overflow-x-auto rounded-lg border border-(--line) bg-(--surface-2) p-4">',
        );
        html = html.replace(
            /<a /g,
            '<a class="text-(--accent) underline decoration-(--line-strong) underline-offset-4 transition-colors hover:decoration-(--accent)" ',
        );
        html = html.replace(
            /<hr \/>/g,
            '<hr class="my-8 border-t border-(--line)" />',
        );

        for (let index = 0; index < codeBlocks.length; index++) {
            html = html.replace(`\x00CODEBLOCK${index}\x00`, codeBlocks[index]);
        }

        return html;
    };

    return (
        <main className="shell py-10 md:py-16">
            <Link
                href="/articles"
                className="inline-flex items-center gap-2 text-sm text-(--muted) transition-colors hover:text-(--text)"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Toutes les notes
            </Link>

            <article className="mx-auto mt-8 max-w-3xl">
                <p className="eyebrow">{article.categorie}</p>
                <h1 className="heading mt-3 text-3xl sm:text-4xl">
                    {article.titre}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-(--line) pb-5 text-sm text-(--muted)">
                    <span>{formatDate(article.date)}</span>
                    <span>·</span>
                    <span>{article.auteur}</span>
                    <span>·</span>
                    <ShareArticleButton />
                </div>

                <div className="article-shell mt-8 p-6 md:p-10">
                    <div
                        className="article-body"
                        dangerouslySetInnerHTML={{
                            __html: parseMarkdown(content),
                        }}
                    />
                </div>

                <div className="mt-8">
                    <Link
                        href="/articles"
                        className="text-sm text-(--muted) transition-colors hover:text-(--text)"
                    >
                        Retour aux notes
                    </Link>
                </div>
            </article>

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
        </main>
    );
}
