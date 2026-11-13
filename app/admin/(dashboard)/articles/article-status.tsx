import { StatusBadge } from "@/components/admin/StatusBadge";
import type { ArticleDisplayStatus } from "@/lib/articles/rules";

/**
 * Statut écrit en toutes lettres (la couleur ne porte jamais seule le sens,
 * §3.3). Publié avec un brouillon : « Publié » et « Modifications en attente ».
 */
export function ArticleStatus({ status }: { status: ArticleDisplayStatus }) {
  if (status === "draft") return <StatusBadge status="draft" />;
  if (status === "published") return <StatusBadge status="published" />;
  return (
    <span className="inline-flex flex-wrap gap-2">
      <StatusBadge status="published" />
      <StatusBadge status="pending" />
    </span>
  );
}
