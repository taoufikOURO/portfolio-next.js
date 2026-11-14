import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireSession } from "@/lib/auth/require-session";

import { DeleteTechnologyForm } from "../../delete-technology";
import { loadTechnologyOrNotFound } from "../../load-technology";
import { STACK_PATH } from "../../routes";

export const metadata: Metadata = {
  title: "Supprimer une technologie",
};

/**
 * Confirmation de suppression sans JavaScript (avec JavaScript, la liste
 * ouvre un dialogue à la place). Liste les projets concernés.
 */
export default async function DeleteTechnologyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const technology = await loadTechnologyOrNotFound(params);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={STACK_PATH} className="admin-link">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Annuler et revenir à la stack
        </Link>
        <h1 className="admin-page-title mt-4">Supprimer la technologie « {technology.name} » ?</h1>
      </div>
      <DeleteTechnologyForm technology={technology} />
    </div>
  );
}
