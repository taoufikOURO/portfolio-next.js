# Portfolio Personnel - Taoufik OURO-BANG'NA

Portfolio personnel développé avec Next.js 16, React 19 et Tailwind CSS 4. Le site présente mes compétences, mes projets et mon parcours à travers une interface soignée et une architecture performante.

## Aperçu

- Interface éditoriale avec micro-interactions et animations discrètes
- Rendu optimisé grâce à Next.js 16 (App Router)
- Design responsive, adapté à tous les formats d'écran
- Architecture basée sur des fichiers JSON, sans base de données
- Structure SEO optimisée
- Code entièrement typé avec TypeScript
- Composants modulaires et réutilisables

## Stack technique

### Frontend

- Next.js 16 - Framework React pour le rendu côté serveur
- React 19 - Bibliothèque UI
- TypeScript - Typage statique
- Tailwind CSS 4 - Framework CSS utility-first

### Outils

- ESLint - Linting et qualité de code
- pnpm - Gestionnaire de paquets
- Lucide React - Icônes

## Installation

### Prérequis

- Node.js 18 ou supérieur
- pnpm (recommandé) ou npm

### Étapes

```bash
git clone https://github.com/taoufikOURO/portfolio.git
cd portfolio
```

```bash
pnpm install
# ou
npm install
```

```bash
pnpm dev
# ou
npm run dev
```

Le site est ensuite accessible sur `http://localhost:3000`.

## Structure du projet

```
portfolio/
├── app/                      # Application Next.js (App Router)
│   ├── components/          # Composants React réutilisables
│   │   ├── About.tsx        # Section à propos
│   │   ├── Contact.tsx      # Formulaire de contact
│   │   ├── Header.tsx       # Navigation principale
│   │   ├── Hero.tsx         # Section d'introduction
│   │   ├── Projects.tsx     # Liste des projets
│   │   └── Stack.tsx        # Technologies maîtrisées
│   ├── lib/                 # Utilitaires et fonctions
│   │   └── data.ts          # Récupération des données
│   ├── projets/             # Pages des projets
│   │   ├── page.tsx         # Liste complète des projets
│   │   └── [slug]/          # Page détail d'un projet
│   ├── types/               # Définitions TypeScript
│   ├── globals.css          # Styles globaux
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Page d'accueil
├── data/                     # Données JSON
│   ├── profile.json         # Informations personnelles
│   ├── projets.json         # Liste des projets
│   └── stack.json           # Technologies
├── public/                   # Assets statiques
│   └── images/               # Images et icônes
└── README.md
```

## Personnalisation

### Profil (`data/profile.json`)

```json
{
    "nom": "VOTRE_NOM",
    "prenom": "VOTRE_PRENOM",
    "email": "votre@email.com",
    "titreProfessionnel": "Votre titre",
    "bio": "Votre bio courte",
    "aPropos": "Votre description longue",
    "liens": {
        "github": "https://github.com/votre-username",
        "linkedin": "https://linkedin.com/in/votre-profile"
    },
    "photo": "/images/profile/profile.png"
}
```

### Projets (`data/projets.json`)

```json
{
    "id": 1,
    "slug": "nom-du-projet",
    "titre": "Titre du Projet",
    "description": "Description détaillée...",
    "estPublie": true,
    "lien": "https://projet.com",
    "image": "/images/projets/projet.png",
    "github": [
        {
            "nom": "GitHub",
            "url": "https://github.com/user/projet"
        }
    ],
    "stack": [...]
}
```

### Technologies (`data/stack.json`)

```json
{
    "name": "Nom de la techno",
    "icon": "/images/stack/icone.png"
}
```

### Couleurs

Les variables de thème sont définies dans `app/globals.css` :

```css
:root {
    --bg: ...;
    --surface: ...;
    --text: ...;
    --accent: ...;
}
```

## Déploiement

### Vercel

1. Pousser le code sur GitHub
2. Connecter le dépôt à Vercel
3. Vercel détecte automatiquement Next.js et déploie le projet

### Build manuel

```bash
pnpm build
pnpm start
```

## Scripts disponibles

```bash
pnpm dev        # Serveur de développement
pnpm build      # Build de production
pnpm start      # Lancement en production
pnpm lint       # Vérification ESLint
```

## Fonctionnalités

### Pages

- Page d'accueil avec l'ensemble des sections
- Liste complète des projets
- Page détail pour chaque projet
- Navigation fluide entre sections
- Footer avec liens et informations de contact

### Sections

- Hero - Présentation avec photo et appel à l'action
- About - À propos et points forts
- Stack - Technologies maîtrisées
- Projects - Projets récents
- Contact - Formulaire et liens sociaux

## Contribution

1. Fork du projet
2. Création d'une branche (`git checkout -b feature/amelioration`)
3. Commit des changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouverture d'une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## Contact

**Taoufik OURO-BANG'NA**

- Email : ourotaoufik1@gmail.com
- LinkedIn : [linkedin.com/in/taoufik-ouro-bang-na](https://www.linkedin.com/in/taoufik-ouro-bang-na)
- GitHub : [@taoufikOURO](https://github.com/taoufikOURO)
