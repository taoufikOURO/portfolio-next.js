import { AdminShell } from "@/components/admin/AdminShell";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { requireSession } from "@/lib/auth/require-session";

import { logout } from "./actions";

/**
 * Espace protégé de l'administration. La session est vérifiée ici côté
 * serveur (en plus de `proxy.ts`), puis dans chaque page et chaque action.
 */
export default async function DashboardLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await requireSession();

    return (
        <AdminShell
            footer={
                <form action={logout} className="flex flex-col gap-2 px-4 pt-2">
                    <p className="text-sm break-all">
                        <span className="sr-only">Connecté en tant que </span>
                        {session.email}
                    </p>
                    <LogoutButton />
                </form>
            }
        >
            {children}
        </AdminShell>
    );
}
