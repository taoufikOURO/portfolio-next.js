import type { Metadata } from "next";

import { NotFoundView } from "@/components/site/NotFoundView";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return <NotFoundView message="La page que vous cherchez n'existe pas ou n'est plus en ligne." />;
}
