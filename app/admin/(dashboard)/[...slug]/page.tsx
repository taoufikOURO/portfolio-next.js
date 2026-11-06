import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/require-session";

/**
 * URL inconnue sous `/admin` (E22) : sans ce fourre-tout, c'est la route
 * `app/(site)/[...slug]` qui répondait avec la 404 du site public.
 * Session vérifiée d'abord (sans session : connexion), puis 404 de l'admin.
 */
export default async function UnknownAdminPage() {
    await requireSession();
    notFound();
}
