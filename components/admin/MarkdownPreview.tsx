import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/cn";

/**
 * Rendu sûr d'un contenu Markdown (aperçu de l'éditeur ; réutilisable pour les
 * pages publiques en phase 2). Sans hook : utilisable par un composant serveur
 * comme par un composant client.
 *
 * Sécurité : aucun HTML brut ni script du Markdown ne s'exécute.
 * - `skipHtml` : le HTML écrit dans le Markdown est ignoré (jamais interprété) ;
 * - `rehype-sanitize` (schéma par défaut, celui de GitHub) : attributs `on*`,
 *   `style`, éléments dangereux et adresses `javascript:` retirés ;
 * - l'adresse des liens passe aussi par le filtre par défaut de react-markdown ;
 * - `rehype-highlight` vient APRÈS la désinfection : il n'ajoute que des
 *   `<span class="hljs-…">` autour du code.
 *
 * Images : hors périmètre de la phase 1 (couverture uniquement) ; elles ne
 * sont pas affichées (aucune requête vers une adresse externe depuis l'admin).
 */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("markdown-preview", className)}>
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        disallowedElements={["img"]}
      >
        {content}
      </Markdown>
    </div>
  );
}
