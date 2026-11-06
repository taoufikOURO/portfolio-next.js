import { notFound } from "next/navigation";

// Les URL qui ne correspondent à aucune route passent par ici pour afficher
// la page 404 du site (not-found.tsx de ce groupe) avec son Header et son Footer.
export default function CatchAll() {
    notFound();
}
