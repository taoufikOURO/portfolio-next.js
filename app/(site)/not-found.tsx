import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <main
            id="contenu"
            className="shell flex min-h-[80svh] flex-col items-start justify-center pb-16 pt-28"
        >
            <p className="eyebrow">404</p>
            <h1 className="heading mt-3 text-3xl sm:text-5xl">
                Page introuvable
            </h1>
            <p className="mt-3 max-w-md text-(--muted)">
                La page que vous cherchez n’existe pas ou a été déplacée.
            </p>
            <Link href="/" className="btn btn-primary mt-6">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Retour à l’accueil
            </Link>
        </main>
    );
}
