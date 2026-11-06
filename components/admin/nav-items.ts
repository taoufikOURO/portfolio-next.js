import {
    Briefcase,
    FileText,
    GraduationCap,
    LayoutDashboard,
    Layers,
    UserCog,
    User,
    Wrench,
    type LucideIcon,
} from "lucide-react";

export type NavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

/** Sections de l'administration (cahier des charges §5), dans l'ordre d'affichage. */
export const ADMIN_NAV: NavItem[] = [
    { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
    { label: "Articles", href: "/admin/articles", icon: FileText },
    { label: "Formations", href: "/admin/formations", icon: GraduationCap },
    { label: "Compétences", href: "/admin/competences", icon: Wrench },
    { label: "Profil", href: "/admin/profil", icon: User },
    { label: "Projets", href: "/admin/projets", icon: Briefcase },
    { label: "Stack", href: "/admin/stack", icon: Layers },
    { label: "Compte", href: "/admin/compte", icon: UserCog },
];
