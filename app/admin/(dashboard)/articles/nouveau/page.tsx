import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { CreateArticleForm } from "../create-article-form";
import { ARTICLES_PATH } from "../routes";

export const metadata: Metadata = {
  title: "Nouvel article",
};

export default async function NewArticlePage() {
  await requireSession();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={ARTICLES_PATH} className="inline-flex min-h-11 items-center gap-2 underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour aux articles
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Nouvel article</h1>
        <p className="mt-2">
          L’article est créé en brouillon, puis l’éditeur s’ouvre : la suite est enregistrée automatiquement pendant la
          frappe. Rien n’est publié sans « Publier » et une confirmation.
        </p>
      </div>
      <CreateArticleForm />
    </div>
  );
}
