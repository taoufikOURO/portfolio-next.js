# Portfolio Personnel - Taoufik OURO-BANG'NA

Portfolio personnel développé avec Next.js 16, React 19 et Tailwind CSS 4. Le site présente mes compétences, mes projets et mon parcours à travers une interface soignée et une architecture performante.

## Aperçu

- Interface éditoriale avec micro-interactions et animations discrètes
- Rendu optimisé grâce à Next.js 16 (App Router)
- Design responsive, adapté à tous les formats d'écran
- Site public : contenus lus dans `data/` (fichiers JSON et Markdown), en attendant la refonte de la phase 2
- Administration (`/admin`) : interface protégée, responsive et accessible au clavier, connectée à PostgreSQL et à Supabase Storage (phase 1)
- Structure SEO optimisée
- Code entièrement typé avec TypeScript
- Composants modulaires et réutilisables

## Stack technique

### Frontend

- Next.js 16 - Framework React pour le rendu côté serveur
- React 19 - Bibliothèque UI
- TypeScript - Typage statique
- Tailwind CSS 4 - Framework CSS utility-first

### Administration (phase 1)

- Prisma 7 (migrations versionnées, adaptateur `@prisma/adapter-pg`) et PostgreSQL
- Supabase Storage - Images et icônes
- Zod - Validation des entrées côté serveur
- Nodemailer - E-mails par SMTP (Gmail)
- Vitest - Tests

### Outils

- ESLint - Linting et qualité de code
- pnpm - Gestionnaire de paquets
- Lucide React - Icônes

## Installation

### Prérequis

- Node.js 24
- pnpm (seul gestionnaire de paquets du projet : ni npm ni yarn)
- PostgreSQL en local (PostgreSQL 18, base `portfolio`)
- Un projet Supabase pour Supabase Storage (images et icônes de l'administration). En développement, seuls les buckets préfixés `dev-` sont utilisés.

### Démarrage

```bash
git clone https://github.com/taoufikOURO/portfolio.git
cd portfolio
pnpm install
```

1. Copier `.env.example` en `.env`, puis remplacer chaque valeur factice (voir « Variables d'environnement »). `.env` n'est jamais commité.
2. Créer la base locale `portfolio` dans PostgreSQL. L'application refuse de démarrer en développement si `DATABASE_URL` ou `DIRECT_URL` ne pointe pas vers une base locale.
3. Appliquer les migrations et créer les buckets de développement :

```bash
pnpm db:migrate
pnpm storage:setup
```

4. Créer le compte administrateur. `ADMIN_EMAIL` est lu dans `.env` ; le mot de passe est fourni **dans la session du terminal seulement**, jamais écrit dans `.env` ni dans un fichier :

```powershell
$env:ADMIN_PASSWORD = '<mot de passe de 12 caractères minimum>'
pnpm db:seed
```

Le seed n'écrase jamais un compte existant.

5. Lancer le projet :

```bash
pnpm dev
```

Le site est accessible sur `http://localhost:3000` et l'administration sur `http://localhost:3000/admin/connexion`.

Avec `APP_ENV=development`, aucun e-mail n'est envoyé : le lien de validation ou de réinitialisation est affiché dans la console du serveur. Avec `APP_ENV=production`, les e-mails sont envoyés par SMTP.

## Variables d'environnement

Les noms des variables (les valeurs ne figurent jamais dans le dépôt : `.env.example` ne contient que des valeurs factices).

| Variable | Rôle |
| -------- | ---- |
| `APP_ENV` | `development` ou `production` |
| `APP_URL` | URL publique de l'application (liens des e-mails) |
| `NEXT_PUBLIC_SITE_URL` | URL utilisée par le site public existant |
| `DATABASE_URL` | Connexion Prisma |
| `DIRECT_URL` | Connexion directe pour les migrations |
| `SESSION_SECRET` | Signature du cookie de session |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (facultative) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur Supabase (jamais côté client) |
| `SUPABASE_STORAGE_BUCKET_ARTICLES` | Bucket des images d'articles |
| `SUPABASE_STORAGE_BUCKET_PROJECTS` | Bucket des images de projets |
| `SUPABASE_STORAGE_BUCKET_PROFILE` | Bucket du profil (photo, CV) |
| `SUPABASE_STORAGE_BUCKET_STACK` | Bucket des icônes de technologies |
| `SMTP_HOST` | Serveur SMTP |
| `SMTP_PORT` | Port SMTP |
| `SMTP_USER` | Adresse Gmail |
| `SMTP_PASS` | Mot de passe d'application Gmail |
| `MAIL_FROM` | Expéditeur des e-mails |
| `ADMIN_EMAIL` | E-mail du compte administrateur (seed) |
| `ADMIN_PASSWORD` | Mot de passe initial du compte (seed ; à fournir dans la session du terminal, pas dans `.env`) |
| `GITHUB_TOKEN` | Facultatif : augmente la limite de l'API GitHub |

## Buckets de stockage (Supabase Storage)

| Usage | Variable | Développement |
| ----- | -------- | ------------- |
| Images d'articles | `SUPABASE_STORAGE_BUCKET_ARTICLES` | `dev-articles` |
| Images de projets | `SUPABASE_STORAGE_BUCKET_PROJECTS` | `dev-projets` |
| Profil (photo, CV) | `SUPABASE_STORAGE_BUCKET_PROFILE` | `dev-profil` |
| Icônes de technologies | `SUPABASE_STORAGE_BUCKET_STACK` | `dev-stack` |

- En développement, les noms de buckets doivent commencer par `dev-` : l'application refuse tout autre nom. Le projet Supabase est le même qu'en production ; les buckets de production ne sont jamais utilisés en développement.
- `pnpm storage:setup` crée les buckets manquants et ne modifie jamais un bucket existant.
- Les fichiers sont référencés par leur chemin dans le bucket ; l'URL publique est calculée à l'affichage. Taille maximale : 1 Mo.

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

> La mise en production de l'administration n'a lieu que sur demande explicite de Taoufik. **Aucun push ni déploiement tant qu'un balayage complet de l'historique Git n'a pas été fait** (voir `docs/recette_phase1.md`, section sur les secrets).

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
pnpm dev          # Serveur de développement
pnpm build        # Build de production
pnpm start        # Lancement du build en production
pnpm lint         # Vérification ESLint
pnpm typecheck    # Vérification des types (tsc --noEmit)
pnpm test         # Tests Vitest
pnpm db:migrate   # Nouvelle migration / migrations en développement (prisma migrate dev)
pnpm db:deploy    # Applique les migrations existantes (prisma migrate deploy)
pnpm db:reset     # Détruit et recrée la base locale (prisma migrate reset)
pnpm db:seed      # Crée le compte administrateur et le profil vide
pnpm db:generate  # Régénère le client Prisma
pnpm db:studio    # Prisma Studio
pnpm storage:setup # Crée les buckets de stockage manquants
pnpm mail:test    # Envoie les trois modèles d'e-mail en SMTP réel à ADMIN_EMAIL
```

- `pnpm db:reset` supprime toutes les données de la base locale : à ne lancer qu'après une sauvegarde. Il refuse toute base qui n'est pas locale.
- `pnpm mail:test` envoie de vrais e-mails (objet préfixé « [Test] ») ; leurs liens utilisent un jeton factice et ne mènent à rien d'utilisable.
- Toute modification du schéma Prisma passe par une nouvelle migration (`pnpm db:migrate`) ; une migration déjà créée n'est jamais modifiée.

## Documentation

- `docs/cahier_des_charges.md` : cahier des charges (fonctionnel)
- `docs/plan_implementation.md` : plan d'implémentation et suivi d'avancement
- `docs/recette_phase1.md` : recette de la phase 1 (administration)

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
