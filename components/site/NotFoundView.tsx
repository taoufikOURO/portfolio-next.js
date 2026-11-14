import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHero } from "./PageHero";

/** Page 404 du site public, au système des autres pages. */
export function NotFoundView({ message, backHref = "/", backLabel = "Retour à l'accueil" }: { message: string; backHref?: string; backLabel?: string }) {
  return (
    <main id="contenu">
      <PageHero eyebrow="Erreur 404" title="404" label="Page introuvable" intro={message}>
        <Link href={backHref} className="site-button site-button-primary site-reveal relative mt-8">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {backLabel}
        </Link>
      </PageHero>
    </main>
  );
}
