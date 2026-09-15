import Link from "next/link";
export default function NotFound() {
    return (
        <main className="poster-section data-grid flex min-h-screen items-center justify-center px-6 text-center">
            <div>
                <p className="eyebrow">404 / Missing data</p>
                <h1 className="display mt-5 text-6xl">Projet introuvable.</h1>
                <p className="mx-auto mt-5 max-w-md text-(--muted)">
                    Cette observation n’existe pas dans le dataset actuel.
                </p>
                <Link href="/projets" className="lime-button mt-8">
                    Retour aux projets
                </Link>
            </div>
        </main>
    );
}
