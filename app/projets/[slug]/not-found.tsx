import Link from "next/link";
import { Reveal } from "@/app/components/Motion";
export default function NotFound() {
    return (
        <main className="poster-section data-grid flex min-h-screen items-center justify-center px-6 text-center">
            <Reveal className="text-center">
                <p className="eyebrow">404 / Missing data</p>
                <h1 className="display mt-5 text-6xl">Projet introuvable.</h1>
                <p className="mx-auto mt-5 max-w-md text-(--muted)">
                    Cette observation n’existe pas dans le dataset actuel.
                </p>
                <Link href="/projets" className="lime-button mt-8">
                    Retour aux projets
                </Link>
            </Reveal>
        </main>
    );
}
