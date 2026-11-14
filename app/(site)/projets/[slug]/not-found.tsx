import { NotFoundView } from "@/components/site/NotFoundView";

export default function ProjectNotFound() {
  return <NotFoundView message="Ce projet n'existe pas ou n'est plus en ligne." backHref="/projets" backLabel="Retour aux projets" />;
}
