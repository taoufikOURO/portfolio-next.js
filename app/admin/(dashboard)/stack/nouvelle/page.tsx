import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { STACK_PATH } from "../routes";
import { TechnologyForm } from "../technology-form";

export const metadata: Metadata = {
  title: "Nouvelle technologie",
};

export default async function NewTechnologyPage() {
  await requireSession();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={STACK_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour à la stack
        </Link>
        <h1 className="admin-page-title mt-4">Nouvelle technologie</h1>
        <p className="mt-3 text-muted">Elle sera ajoutée en dernière position ; l’ordre se modifie depuis la liste.</p>
      </div>
      <TechnologyForm />
    </div>
  );
}
