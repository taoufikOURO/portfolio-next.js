"use client";

// PAGE DE DÉMONSTRATION TEMPORAIRE (étape 5) : à supprimer avec `app/admin/demo/`.
import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_NAV } from "@/components/admin/nav-items";

/** Composant client : seul un composant client peut passer des icônes à `AdminShell`. */
export function DemoShell({ children }: { children: ReactNode }) {
    return (
        <AdminShell
            navItems={[
                ...ADMIN_NAV,
                { label: "Démonstration", href: "/admin/demo", icon: FlaskConical },
            ]}
        >
            {children}
        </AdminShell>
    );
}
