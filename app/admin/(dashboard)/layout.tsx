import { AdminShell } from "@/components/admin/AdminShell";
import { EmailVerificationBanner } from "@/components/admin/EmailVerificationBanner";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { requireSession } from "@/lib/auth/require-session";

import { logout, resendVerification } from "./actions";

/**
 * Espace protégé de l'administration. La session est vérifiée ici côté
 * serveur (en plus de `proxy.ts`), puis dans chaque page et chaque action.
 * Tant que l'adresse du compte n'est pas validée, une bannière l'indique en
 * haut de chaque page, avec « Renvoyer le lien ».
 */
export default async function DashboardLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const session = await requireSession();

    return (
        <AdminShell
            email={session.email}
            accountActions={
                <form action={logout} className="flex flex-col px-1 pt-2">
                    <LogoutButton />
                </form>
            }
        >
            {session.emailVerifiedAt ? null : (
                <EmailVerificationBanner email={session.email} resendAction={resendVerification} />
            )}
            {children}
        </AdminShell>
    );
}
