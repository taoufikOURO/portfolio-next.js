# Portfolio — Taoufik OURO-BANG'NA

Portfolio personnel en **Next.js 16**, avec un **site public** lu entièrement depuis la base de données et une **interface d'administration** protégée qui permet de tout gérer sans toucher au code : profil, projets, articles, formations, compétences et stack technique.

---

## Sommaire

1. [Aperçu](#aperçu)
2. [Fonctionnalités](#fonctionnalités)
3. [Stack technique](#stack-technique)
4. [Architecture](#architecture)
5. [Structure du projet](#structure-du-projet)
6. [Modèle de données](#modèle-de-données)
7. [Installation](#installation)
8. [Variables d'environnement](#variables-denvironnement)
9. [Stockage des fichiers](#stockage-des-fichiers-supabase-storage)
10. [Peupler la base](#peupler-la-base)
11. [Scripts disponibles](#scripts-disponibles)
12. [Tests et qualité](#tests-et-qualité)
13. [Sécurité](#sécurité)
14. [Charte visuelle](#charte-visuelle)
15. [Mise en production](#mise-en-production)
16. [Dépannage](#dépannage)
17. [Licence et contact](#licence)

---

## Aperçu

| Partie | Adresse | Rôle |
| ------ | ------- | ---- |
| Site public | `/` | Présentation : accueil en une page, projets, parcours, compétences, articles, contact |
| Administration | `/admin` | Gestion de tout le contenu affiché, derrière une connexion |

- **Un seul endroit pour le contenu** : la base PostgreSQL. Le site public ne contient aucune donnée écrite en dur et ne lit aucun fichier local à l'exécution.
- **Mise à jour immédiate** : chaque modification faite dans l'admin invalide les pages publiques concernées ; les pages restent en cache le reste du temps (une heure au plus).
- **Images** sur Supabase Storage ; quand une image manque, le site affiche une image neutre par défaut.
- **Responsive** (mobile, tablette, desktop), **accessible au clavier**, mouvements désactivés pour qui le demande (`prefers-reduced-motion`).

---

## Fonctionnalités

### Site public

**Accueil en une page**, dans l'ordre :

| Section | Ancre | Aperçu | Page complète (« Voir plus ») |
| ------- | ----- | ------ | ----------------------------- |
| Grand titre | — | Titre professionnel du profil (repli : « Portfolio »), éventail de cartes (photo au centre, projets autour), anneau de texte | — |
| À propos | `/#a-propos` | Photo, bio, liens | `/profil` |
| Projets | `/#projets` | 3 projets publiés | `/projets`, puis `/projets/[slug]` |
| Parcours | `/#parcours` | 2 formations | `/formations` |
| Compétences | `/#competences` | 6 technologies de la stack (la liste des compétences n'est que sur la page complète) | `/competences` |
| Articles | `/#articles` | 3 derniers articles publiés | `/articles`, puis `/articles/[slug]` |
| Contact | `/#contact` | E-mail et liens du profil | — |

- **Navigation par ancres** : la barre du haut et le pied de page ne contiennent que les ancres des sections. Depuis n'importe quelle page, ils ramènent à l'accueil, sur la section. Les pages complètes ne s'atteignent que par « Voir plus » (avec « n sur N »).
- Une section sans contenu affiche un état vide au lieu de disparaître.
- **Articles** : Markdown rendu côté serveur (`react-markdown`, `remark-gfm`), désinfecté (`rehype-sanitize`), code coloré (`rehype-highlight`), dates « Publié le » et « Mis à jour le ».
- **Projets** : liens ordonnés (site, dépôts), technologies avec icônes, collaborateurs GitHub (nom et avatar).
- **SEO** : métadonnées et Open Graph par page, `sitemap.xml` (projets et articles publiés), `robots.txt` (l'admin est exclue), page 404 dédiée.
- **Mouvement** : lettres du titre, révélations au défilement, bloc rouge, ouverture de l'éventail, inclinaison des cartes au survol, anneau qui tourne lentement. Tout est fait en CSS, sans bibliothèque. Le contenu reste visible sans JavaScript.

**Visibilité** : un article n'apparaît que s'il est **publié**, et dans sa **version publiée** (un brouillon répond 404). Un projet n'apparaît que s'il est publié.

### Administration (`/admin`)

| Page | Ce qu'on y fait |
| ---- | --------------- |
| Tableau de bord | Comptes par type, articles publiés par mois, complétude du profil, derniers projets modifiés |
| Profil | Identité, titre, bio, « À propos », liens GitHub et LinkedIn, photo, photo détourée, CV (lien ou PDF) |
| Projets | Création, modification, ordre (monter / descendre), liens ordonnés, technologies, collaborateurs GitHub, image, publication avec confirmation |
| Articles | Éditeur Markdown avec aperçu (même hauteur fixe que la zone d'écriture, 60 vh entre 288 et 640 px, défilement synchronisé dans les deux sens ; en onglets sous 1024 px) et enregistrement automatique, couverture, publication avec confirmation, abandon des modifications, suppression |
| Formations | Intitulé, établissement, lieu, dates au mois près, mention, moyenne, compétences liées, ordre |
| Compétences | Liste, renommage, suppression (avec détachement des formations, après confirmation) |
| Stack | Technologies avec icône (PNG, WebP ou SVG), ordre, suppression (avec détachement des projets, après confirmation) |
| Compte | Changement d'e-mail (validé par lien) et de mot de passe, déconnexion des autres sessions |

**Cycle de vie d'un article** : un article a au plus deux versions, la version **publiée** et un **brouillon**. Toute modification, même celle d'un article déjà en ligne, est enregistrée dans le brouillon. La version en ligne ne change que par « Publier », suivi d'une confirmation. Statuts affichés : « Brouillon », « Publié », « Modifications en attente ».

**Authentification** :

- Compte administrateur unique, mot de passe haché en **argon2id** (12 caractères au minimum).
- Session par cookie signé (`admin_session`, limité à `/admin`, `HttpOnly`), seul le hash du jeton est stocké en base. Expiration après **7 jours** d'inactivité, **30 jours** au plus.
- Limitation des tentatives : **5 échecs en 15 minutes** (par adresse ou par IP), puis blocage de **15 minutes**.
- Validation de l'e-mail (lien valable **24 heures**), mot de passe oublié (lien valable **1 heure**), renvoi limité à un par minute.
- En développement (`APP_ENV=development`), aucun e-mail n'est envoyé : le lien s'affiche dans la console du serveur.

---

## Stack technique

| Domaine | Outil |
| ------- | ----- |
| Framework | Next.js 16 (App Router), React 19 |
| Langage | TypeScript strict |
| Styles | Tailwind CSS 4 (thèmes déclarés en CSS avec `@theme`, sans `tailwind.config`) |
| Polices | Archivo (site public, axe de largeur), Outfit (admin), via `next/font` |
| Base de données | PostgreSQL ; Prisma 7 (migrations versionnées, adaptateur `@prisma/adapter-pg`) |
| Fichiers | Supabase Storage |
| Validation | Zod 4 |
| E-mails | Nodemailer (SMTP Gmail, mot de passe d'application) |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-sanitize`, `rehype-highlight` |
| Icônes | `lucide-react` (trait fin) |
| Tests | Vitest |
| Qualité | ESLint (`eslint-config-next`) |
| Paquets | **pnpm** uniquement (un seul lockfile : `pnpm-lock.yaml`) |

---

## Architecture

```
                 ┌──────────────── Navigateur ────────────────┐
                 │                                            │
          Site public (/)                              Admin (/admin)
                 │                                            │
                 │                              proxy.ts (cookie signé : contrôle rapide)
                 │                                            │
   app/(site)/ : pages en cache                 app/admin/ : layouts, pages, actions serveur
   (revalidate = 3600 en repli)                 requireSession() à chaque layout, page et action
                 │                                            │
   lib/public/queries.ts (lecture seule)        lib/* : règles métier + validation Zod
                 │                                            │
                 └──────────────► Prisma ◄────────────────────┘
                                    │                    lib/storage/ ──► Supabase Storage
                               PostgreSQL                          (images, icônes, CV)
                                    ▲
       Après chaque modification visible : revalidatePublic() (lib/public/revalidate.ts)
       invalide les pages publiques concernées.
```

- **Défense en profondeur** : `proxy.ts` redirige vers la connexion si le cookie est absent ou mal signé, sans consulter la base. La vraie vérification (session en base, expiration) est faite par `requireSession()` dans chaque layout, page et action serveur.
- **Modules serveur** : tout `lib/` qui touche la base ou les secrets est marqué `import "server-only"`. Les règles pures (validation, formats, calculs) sont séparées et testées sans base.
- **Fichiers** : la base stocke le **chemin** dans le bucket ; l'URL publique est calculée à l'affichage. Chaque fichier envoyé est contrôlé côté serveur (type réel lu dans le contenu, 1 Mo au plus, SVG nettoyé et restreint).
- **Concurrence** : verrous PostgreSQL (`pg_advisory_xact_lock`) pour l'ordre des listes et l'unicité des slugs ; jeton de version pour l'éditeur d'articles (une modification faite dans un autre onglet n'est jamais écrasée).

---

## Structure du projet

```
├── app/
│   ├── layout.tsx                 # Racine (langue, favicon)
│   ├── robots.ts, sitemap.ts      # SEO
│   ├── (site)/                    # Site public
│   │   ├── layout.tsx, site.css   # Police Archivo, thème et mouvement du site
│   │   ├── page.tsx               # Accueil en une page
│   │   ├── projets/, articles/    # Listes et pages de détail ([slug])
│   │   ├── formations/, competences/, profil/
│   │   └── [...slug]/, not-found.tsx
│   └── admin/
│       ├── layout.tsx, admin.css  # Police Outfit, thème et mouvement de l'admin
│       ├── (auth)/                # connexion, mot-de-passe-oublie, reinitialiser, verifier-email
│       └── (dashboard)/           # tableau de bord, profil, projets, articles, formations,
│                                  # competences, stack, compte (+ actions.ts par section)
├── components/
│   ├── admin/                     # Composants de l'admin (Button, Field, DataTable, TopNav…)
│   └── site/                      # Composants du site (HomeHero, BigTitle, Cards, home/Sections…)
├── lib/
│   ├── auth/                      # Sessions, connexion, jetons, mots de passe, limitation
│   ├── articles/                  # Brouillon, publication, abandon, suppression
│   ├── mail/                      # Modèles et envoi des e-mails
│   ├── public/                    # Lectures et règles du site public, invalidation du cache
│   ├── storage/                   # Supabase Storage : règles, envoi, suppression, buckets
│   ├── validation/                # Schémas Zod partagés (navigateur et serveur)
│   ├── db.ts, env.ts, env-schema.ts, target-guard.ts
│   └── profile.ts, projects.ts, educations.ts, skills.ts, technologies.ts, dashboard.ts, github.ts
├── prisma/
│   ├── schema.prisma              # Schéma (anglais, tables et colonnes en snake_case)
│   ├── migrations/                # Migrations versionnées (jamais modifiées après création)
│   └── seed.ts                    # Compte administrateur et profil vide
├── scripts/
│   ├── import-public-content.ts   # Import des anciens contenus de data/
│   ├── import-public-content/     # plan.ts (pur), run.ts (exécution), store.ts (Prisma), tests
│   ├── setup-storage.ts           # Création des buckets
│   ├── send-test-mail.ts          # E-mails de test en SMTP réel
│   └── ts-resolve-hook.mjs        # Exécution des scripts TypeScript par Node 24 (alias @/ compris)
├── data/                          # Anciens contenus (JSON, Markdown), lus seulement par l'import
├── public/
│   ├── defaults/image.svg         # Image par défaut unique
│   └── favicon.svg
├── test/                          # Doublures (base, stockage), blocage du réseau
├── proxy.ts                       # Contrôle rapide des routes /admin
├── prisma.config.ts               # CLI Prisma (chargement de .env, garde-fou base locale)
├── next.config.ts                 # Images Supabase autorisées
└── vitest.config.ts
```

---

## Modèle de données

| Table | Contenu |
| ----- | ------- |
| `admins` | Compte unique : e-mail, hash du mot de passe, date de validation de l'e-mail |
| `sessions` | Hash du jeton, expiration, dernière activité, IP et navigateur |
| `auth_tokens` | Liens de validation d'e-mail et de réinitialisation (hash seulement) |
| `login_attempts` | Tentatives de connexion (limitation), purgées après 30 jours |
| `profiles` | Enregistrement unique (id = 1) : identité, textes, liens, photos, CV |
| `projects`, `project_links` | Projets (slug unique, ordre, statut publié) et leurs liens ordonnés |
| `technologies` | Stack : nom unique (normalisé), icône, ordre ; liée aux projets |
| `collaborators` | Collaborateurs GitHub (nom d'utilisateur, nom, avatar) ; liés aux projets |
| `educations`, `skills` | Formations (dates au mois, moyenne sur 20, ordre) et compétences liées |
| `articles`, `article_versions` | Article (statut, slug publié, dates) et ses deux versions au plus |

Conventions : modèles et champs en anglais, tables et colonnes en `snake_case`, dates en `timestamptz` (UTC), identifiants UUID v7. Toute modification du schéma passe par une nouvelle migration (`pnpm db:migrate`).

---

## Installation

### Prérequis

- Node.js 24
- pnpm (jamais npm ni yarn)
- PostgreSQL 18 en local, base `portfolio` (sous Windows : service `postgresql-x64-18`, démarré automatiquement ; sinon `Start-Service postgresql-x64-18` dans un terminal administrateur)
- Un projet Supabase pour Supabase Storage (en développement, seuls les buckets préfixés `dev-` sont utilisés)

### Démarrage

```bash
git clone https://github.com/taoufikOURO/portfolio.git
cd portfolio
pnpm install
```

1. Copier `.env.example` en `.env` et remplacer chaque valeur factice (voir [Variables d'environnement](#variables-denvironnement)). `.env` n'est jamais commité.
2. Créer la base locale `portfolio`. En développement, l'application refuse de démarrer si `DATABASE_URL` ou `DIRECT_URL` ne désigne pas une base locale (`localhost`, `127.0.0.1` ou `::1`).
3. Appliquer les migrations et créer les buckets de développement :

   ```bash
   pnpm db:migrate
   pnpm storage:setup
   ```

4. Créer le compte administrateur. `ADMIN_EMAIL` est lu dans `.env` ; le mot de passe est donné **dans la session du terminal seulement**, jamais écrit dans un fichier :

   ```powershell
   $env:ADMIN_PASSWORD = '<mot de passe de 12 caractères minimum>'
   pnpm db:seed
   ```

   Le seed n'écrase jamais un compte existant. Pour remplir la base avec les anciens contenus, voir [Peupler la base](#peupler-la-base).

5. Lancer le projet :

   ```bash
   pnpm dev
   ```

   Site : `http://localhost:3000` ; administration : `http://localhost:3000/admin/connexion`.

---

## Variables d'environnement

Seuls les noms figurent ici. `.env.example` ne contient que des valeurs factices.

| Variable | Rôle |
| -------- | ---- |
| `APP_ENV` | `development` ou `production` |
| `APP_URL` | URL publique de l'application (liens des e-mails) |
| `NEXT_PUBLIC_SITE_URL` | URL du site (URL absolues des métadonnées, plan du site) |
| `DATABASE_URL` | Connexion de l'application (en production : pooler Supabase) |
| `DIRECT_URL` | Connexion directe, pour les migrations |
| `SESSION_SECRET` | Signature du cookie de session (32 caractères au moins) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur Supabase (jamais envoyée au navigateur) |
| `SUPABASE_STORAGE_BUCKET_ARTICLES` | Bucket des couvertures d'articles |
| `SUPABASE_STORAGE_BUCKET_PROJECTS` | Bucket des images de projets |
| `SUPABASE_STORAGE_BUCKET_PROFILE` | Bucket du profil (photos, CV) |
| `SUPABASE_STORAGE_BUCKET_STACK` | Bucket des icônes de technologies |
| `SMTP_HOST`, `SMTP_PORT` | Serveur SMTP |
| `SMTP_USER`, `SMTP_PASS` | Adresse Gmail et mot de passe d'application |
| `MAIL_FROM` | Expéditeur des e-mails |
| `ADMIN_EMAIL` | E-mail du compte administrateur (seed) |
| `ADMIN_PASSWORD` | Mot de passe initial (seed seulement, à donner dans la session du terminal) |
| `GITHUB_TOKEN` | Facultatif : relève la limite de l'API GitHub (profils des collaborateurs) |

Les variables sont validées au démarrage (`lib/env-schema.ts`). Une erreur nomme la variable fautive sans jamais afficher sa valeur.

---

## Stockage des fichiers (Supabase Storage)

| Usage | Variable | Développement | Formats |
| ----- | -------- | ------------- | ------- |
| Couvertures d'articles | `SUPABASE_STORAGE_BUCKET_ARTICLES` | `dev-articles` | PNG, JPG, WebP |
| Images de projets | `SUPABASE_STORAGE_BUCKET_PROJECTS` | `dev-projets` | PNG, JPG, WebP |
| Profil (photos, CV) | `SUPABASE_STORAGE_BUCKET_PROFILE` | `dev-profil` | PNG, JPG, WebP ; PDF |
| Icônes de technologies | `SUPABASE_STORAGE_BUCKET_STACK` | `dev-stack` | PNG, WebP, SVG |

- En développement, un nom de bucket doit commencer par `dev-` : tout autre nom est refusé. Le projet Supabase est le même qu'en production, mais les buckets de production ne sont jamais utilisés en développement.
- `pnpm storage:setup` crée les buckets manquants (lecture publique) et ne modifie jamais un bucket existant.
- Taille maximale : **1 Mo** par fichier. Le type est vérifié sur le contenu réel, pas sur l'extension. Les SVG contenant un script, une référence externe ou un élément embarqué sont refusés.
- Un fichier remplacé ou supprimé dans l'admin est retiré du bucket.

---

## Peupler la base

Deux scripts remplissent la base : le **seed** (compte administrateur et profil vide) et l'**import** des anciens contenus de `data/` (profil, technologies, compétences, formations, projets, articles). Les deux sont relançables sans créer de doublon et ne modifient jamais un élément existant.

### En local (base `portfolio`)

Dans cet ordre, base locale démarrée :

```bash
pnpm db:migrate                 # 1. schéma à jour
pnpm db:seed                    # 2. compte administrateur (ADMIN_PASSWORD dans la session du terminal)
pnpm content:import --dry-run   # 3. simulation : comptes seulement, rien n'est écrit
pnpm content:import --apply     # 4. import réel, après lecture des comptes
```

Ce que fait l'import :

- **Clés stables** : technologie et compétence par nom normalisé ; formation par intitulé et établissement ; projet et article par slug ; identité du profil seulement si le nom est vide ; CV seulement s'il manque.
- **Articles** : publiés seulement s'ils l'étaient déjà sur l'ancien site (listés dans `articles.json`, datés au plus tard aujourd'hui, sans marque de brouillon), à leur date d'origine ; sinon en brouillon.
- **Projets** : liens dans l'ordre (site, puis dépôts), technologies, collaborateurs (nom GitHub seul, aucun appel à GitHub) et statut de publication.
- **Images** : aucune n'est importée ni envoyée dans un bucket. Les champs image restent vides et le site affiche l'image par défaut ; les images s'ajoutent ensuite depuis l'administration.
- **Données personnelles** (e-mail personnel, téléphone, adresse, date de naissance) : jamais importées. Le script liste les noms des champs écartés, sans leurs valeurs. L'e-mail de contact se saisit dans la page « Profil » de l'admin.
- `faq.json` et `services.json` n'ont pas de modèle en base : ils sont signalés, pas importés.
- La console n'affiche que des comptes (à créer, déjà présents, ignorés) et des noms de champs : aucun contenu, aucune valeur, aucune URL de connexion.

### En production

**Le seed et l'import ne tournent jamais sur la production sans confirmation explicite.** Ils refusent de démarrer si `APP_ENV=production` ou si `DATABASE_URL` ne désigne pas une base locale, sauf avec l'option `--confirm-production` (simulation comprise). Les variables de production sont définies dans la session du terminal : elles l'emportent sur celles de `.env`.

```bash
pnpm db:deploy                                         # 1. migrations
pnpm db:seed:production                                # 2. compte administrateur (prisma db seed -- --confirm-production)
pnpm content:import --dry-run --confirm-production     # 3. simulation sur la base de production
pnpm content:import --apply --confirm-production       # 4. import réel
```

Les pages publiques sont gardées en cache une heure au plus : après un import en production, elles se mettent à jour d'elles-mêmes, ou au déploiement suivant.

---

## Scripts disponibles

| Commande | Rôle |
| -------- | ---- |
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production (lit la base : elle doit être joignable) |
| `pnpm start` | Lance le build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification des types (`tsc --noEmit`) |
| `pnpm test` | Tests Vitest |
| `pnpm db:migrate` | Crée ou applique les migrations en développement (`prisma migrate dev`) |
| `pnpm db:deploy` | Applique les migrations existantes (`prisma migrate deploy`) |
| `pnpm db:reset` | **Détruit** et recrée la base locale (`prisma migrate reset`) |
| `pnpm db:seed` | Compte administrateur et profil vide (base locale) |
| `pnpm db:seed:production` | Même seed, production confirmée (`--confirm-production`) |
| `pnpm content:import --dry-run` | Simulation de l'import de `data/` (comptes seulement) |
| `pnpm content:import --apply` | Import réel de `data/` |
| `pnpm db:generate` | Régénère le client Prisma (aussi lancé après `pnpm install`) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm storage:setup` | Crée les buckets manquants |
| `pnpm mail:test` | Envoie les trois modèles d'e-mail en SMTP réel à `ADMIN_EMAIL` |

- `pnpm db:reset` supprime toutes les données de la base locale : à ne lancer qu'après une sauvegarde. Il refuse toute base qui n'est pas locale.
- `pnpm mail:test` envoie de vrais e-mails (objet préfixé « [Test] ») ; leurs liens utilisent un jeton factice.
- Les scripts de `scripts/` sont exécutés directement par Node 24 (suppression des types), sans transpileur : `scripts/ts-resolve-hook.mjs` résout les imports sans extension et l'alias `@/`.

---

## Tests et qualité

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- **Plus de 1 200 tests Vitest**, sans base réelle ni réseau : doublures de Prisma et du stockage (`test/fakes.ts`), `fetch` bloqué (`test/no-network.ts`), `.env` jamais lu par les tests.
- Ils couvrent : règles d'authentification (sessions, limitation, jetons), actions serveur de chaque section (session exigée, validation, cas de concurrence), règles des fichiers (SVG malveillants, tailles, types), cycle de vie des articles, lectures du site public (brouillon jamais visible), invalidation du cache, import (double passage identique au premier, données personnelles exclues).
- **Contrastes vérifiés par des tests** (`components/admin/palette.test.ts`, `components/site/palette.test.ts`) et **règles du mouvement vérifiées** (`components/*/motion.test.ts` : propriétés animées, durées, `prefers-reduced-motion`).

---

## Sécurité

- **Aucun secret dans le dépôt** : `.env` est ignoré par Git, `.env.example` ne contient que des valeurs factices. L'historique Git a été entièrement vérifié (aucune valeur réelle de secret, aucun mot de passe réel).
- **Chaque route d'administration est protégée côté serveur** : `requireSession()` dans chaque layout, page et action. Le contrôle côté client et `proxy.ts` ne suffisent jamais.
- **Entrées validées côté serveur** (Zod) avant tout accès à la base ou au stockage.
- **Mots de passe** hachés en argon2id ; **jetons** (sessions, liens) stockés sous forme de hash SHA-256 ; réponses identiques que l'adresse existe ou non (mot de passe oublié).
- **Markdown désinfecté** avant affichage ; fichiers envoyés contrôlés sur leur contenu réel.
- **Garde-fous de développement** : base locale obligatoire, buckets `dev-*` obligatoires, aucun e-mail envoyé ; seed et import refusés sur la production sans `--confirm-production` (`lib/target-guard.ts`).
- Les journaux et les erreurs ne citent jamais de valeur : seulement des noms de variables ou des codes d'erreur.

---

## Charte visuelle

### Site public (`app/(site)/site.css`)

| Rôle | Jeton | Couleur |
| ---- | ----- | ------- |
| Fond | `paper` | `#ececec` |
| Texte, contours, focus | `ink` | `#0f0f10` |
| Texte secondaire | `muted` | `#5f636a` |
| Accent (bloc vertical, cartes) | `signal` | `#e0463a` |
| Cartes et images | `tile` | `#dcdcdc` |
| Filets décoratifs | `rule` | `#c4c4c8` |
| Surfaces de lecture | `white` | `#ffffff` |

Titres en Archivo élargi (125 %, graisse 800, capitales). Le rouge n'est jamais utilisé pour du texte.

### Administration (`app/admin/admin.css`)

Fond `canvas` `#e7ebee`, panneau blanc, cartes `#f6f6f6`, texte et boutons principaux `ink` `#0f0f12`, texte secondaire `#5f636a`, bordures des champs `#8a8d93`, accents `lime` `#b8f25c` et `coral` `#f2725f`, erreurs `danger` `#b42318`. Statuts : « Publié » vert, « Brouillon » bleu, « Modifications en attente » rouge, toujours avec leur libellé écrit. Barre de navigation en pilule, sans logo.

Dans les deux thèmes, les couleurs Tailwind par défaut sont désactivées (`--color-*: initial`) : seuls les jetons ci-dessus existent. Les animations n'utilisent que `transform` et `opacity`, sont déclarées sous `@media (prefers-reduced-motion: no-preference)` et ne masquent jamais un contenu sans JavaScript.

---

## Mise en production

Cible : **Vercel** pour l'application, **Supabase Database** pour PostgreSQL, **Supabase Storage** pour les fichiers (même projet Supabase).

1. **Base** : créer la base Supabase ; `DATABASE_URL` passe par le pooler, `DIRECT_URL` est la connexion directe (migrations).
2. **Buckets de production** : nommés sans préfixe `dev-`, créés avec `pnpm storage:setup` et les variables de production (`APP_ENV=production`).
3. **Variables sur Vercel** : toutes celles du tableau ci-dessus, avec `APP_ENV=production`, sauf `ADMIN_PASSWORD`, qui ne sert qu'au seed.
4. **Migrations et contenus** : voir [Peupler la base — en production](#en-production) (`db:deploy`, `db:seed:production`, import confirmé).
5. **Déploiement** : connecter le dépôt GitHub à Vercel. Les pages publiques sont pré-rendues au build, qui lit la base : la base de production doit être joignable pendant le build.
6. **Vérifications** : connexion à l'admin, réception des e-mails (validation de l'adresse), envoi d'une image, publication d'un article puis affichage sur le site.

---

## Dépannage

| Symptôme | Cause probable |
| -------- | -------------- |
| « DATABASE_URL doit pointer vers une base locale » | `APP_ENV=development` avec une base distante : utiliser la base locale |
| `P1001` (base injoignable) | Service PostgreSQL arrêté : `Start-Service postgresql-x64-18` |
| `P2021` (table absente) | Migrations non appliquées : `pnpm db:migrate` |
| Bucket refusé en développement | Le nom ne commence pas par `dev-` |
| Aucun e-mail reçu en développement | Normal : le lien est affiché dans la console du serveur |
| Une modification de l'admin n'apparaît pas sur le site | Recharger la page ; sinon, le cache se renouvelle au plus tard en une heure |
| Seed ou import « Refusé : APP_ENV=production… » | Ajouter `--confirm-production`, seulement si la production est bien visée |
| `pnpm typecheck` échoue sur `.next/` | Types périmés d'un ancien `next dev` : supprimer le dossier `.next/` |

---

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE).

## Contact

**Taoufik OURO-BANG'NA**

- Email : ourotaoufik1@gmail.com
- LinkedIn : [linkedin.com/in/taoufik-ouro-bang-na](https://www.linkedin.com/in/taoufik-ouro-bang-na)
- GitHub : [@taoufikOURO](https://github.com/taoufikOURO)
