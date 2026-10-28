import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <main className="shell flex min-h-[70vh] flex-col items-start justify-center py-16">
            <p className="eyebrow">404</p>
            <h1 className="heading mt-3 text-3xl sm:text-4xl">
                Projet introuvable
            </h1>
            <p className="mt-3 max-w-md text-(--muted)">
                Ce projet n’existe pas ou n’est plus disponible.
            </p>
            <Link href="/projets" className="btn btn-primary mt-6">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Retour aux projets
            </Link>
        </main>
    );
}
