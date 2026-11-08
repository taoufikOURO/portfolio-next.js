import { StatusBadge } from "@/components/admin/StatusBadge";

/** Statut écrit en toutes lettres (la couleur ne porte jamais seule le sens, §3.3). */
export function ProjectStatus({ isPublished }: { isPublished: boolean }) {
  return isPublished ? <StatusBadge status="published" /> : <StatusBadge status="draft" label="Non publié" />;
}
