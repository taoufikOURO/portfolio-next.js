// Données fictives au format des anciens fichiers de `data/`, pour les tests
// de l'import (aucune donnée réelle). Elles contiennent volontairement des
// champs personnels et des images, qui ne doivent jamais être importés.

import type { LegacySources } from "./plan";

export const TODAY = new Date("2026-11-14T12:00:00Z");

export const FAKE_EMAIL = "personne@exemple.invalid";
export const FAKE_PHONE = "+00 0 00 00 00 00";
export const FAKE_ADDRESS = "1 rue Fictive";
export const FAKE_BIRTHDATE = "1990-01-01";

export function fakeSources(): LegacySources {
  return {
    files: {
      "stack.json": [
        { name: "Outil Un", icon: "/images/stack/un.svg" },
        { name: "Outil Deux", icon: "/images/stack/deux.svg" },
        { name: "outil un", icon: "/images/stack/doublon.svg" },
      ],
      "projets.json": [
        {
          id: 1,
          slug: "projet-alpha",
          titre: "Projet Alpha",
          description: "Description fictive du projet Alpha.",
          estPublie: true,
          lien: "https://alpha.exemple.invalid",
          github: [
            { nom: "Front", url: "https://github.com/exemple/alpha-front" },
            { nom: "API", url: "https://github.com/exemple/alpha-api" },
          ],
          stack: [{ name: "Outil Un", icon: "/images/stack/un.svg" }, { name: "Outil Trois" }],
          collaborateurs: ["exemple-collab"],
          image: "/images/projets/alpha.png",
        },
        {
          id: 2,
          titre: "Projet Bêta",
          description: "Description fictive du projet Bêta.",
          estPublie: false,
          github: [],
          stack: [],
        },
      ],
      "formations.json": [
        {
          intitule: "Formation fictive",
          description: "Description fictive de la formation.",
          debut: "Septembre 2023",
          fin: "Juin 2025",
          etablissement: "École fictive",
          lieu: "Ville fictive",
          mention: "Bien",
          moyenne: "14.5",
          competences: ["Compétence A", "Compétence B", "compétence a"],
        },
      ],
      "profile.json": {
        nom: "Exemple",
        prenom: "Ada",
        email: FAKE_EMAIL,
        telephone: FAKE_PHONE,
        adresse: FAKE_ADDRESS,
        dateNaissance: FAKE_BIRTHDATE,
        titreProfessionnel: "Titre fictif",
        bio: "Bio fictive.",
        aPropos: "Texte fictif.",
        liens: { github: "github.com/exemple", linkedin: "linkedin.com/in/exemple" },
        photo: "/images/profil/photo.jpg",
        transparentPhoto: "/images/profil/detouree.png",
        cv: "https://cv.exemple.invalid/cv.pdf",
      },
      "articles.json": [
        {
          id: "1",
          titre: "Article public",
          description: "Description fictive.",
          auteur: "Ada Exemple",
          date: "2025-03-14",
          slug: "article-public",
          mdFile: "data/articles/public.md",
          categorie: "Catégorie",
          image: "/images/articles/public.png",
        },
        {
          id: "2",
          titre: "Article à venir",
          description: "Description fictive.",
          auteur: "Ada Exemple",
          date: "2027-01-01",
          slug: "article-a-venir",
          mdFile: "data/articles/a-venir.md",
          categorie: "Catégorie",
        },
        {
          id: "3",
          titre: "Article absent",
          description: "",
          auteur: "Ada Exemple",
          date: "2025-01-01",
          slug: "article-absent",
          mdFile: "data/articles/absent.md",
          categorie: "",
        },
      ],
      "faq.json": [{ question: "Question fictive ?", reponse: "Réponse fictive." }],
    },
    markdown: new Map([
      ["data/articles/public.md", "# Article public\n\nContenu fictif publié."],
      ["data/articles/a-venir.md", "Contenu fictif à venir."],
    ]),
  };
}
