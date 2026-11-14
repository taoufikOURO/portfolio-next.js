# CLAUDE.md

Instructions permanentes pour Claude Code sur le projet **portfolio** de Taoufik OURO-BANG'NA.

Documentation du projet : `README.md` (fonctionnalités, architecture, installation, commandes, mise en production). Ce fichier fixe les règles de travail. Si une demande les contredit, signale-le au lieu de dévier.

## État du projet (14 novembre 2026)

- **Projet terminé côté code** : administration complète (phase 1), site public lu depuis la base et refait d'après la référence de Taoufik (phase 2), refonte visuelle de l'admin (étape 18). Clôture demandée par Taoufik le 14 novembre 2026.
- **Contenus** : anciens contenus de `data/` importés dans la base locale `portfolio` (14 novembre 2026, sans images). Les images sont ajoutées par Taoufik depuis l'admin.
- **Mise en production (étape 17)** : **en attente d'une demande explicite de Taoufik**, aucune action sans cette demande (procédure : README, « Mise en production »).
- **Dépôt** : jamais poussé, commits locaux. Historique Git entièrement vérifié le 14 novembre 2026 (109 commits, toutes branches) : aucune valeur réelle des secrets de `.env`, aucun mot de passe réel, aucun `.env` commité. Pousser ou déployer reste soumis à la demande explicite de Taoufik.
- **Documentation de suivi supprimée** (cahier des charges, plan, recettes) à la clôture. Les identifiants de décision cités dans les commentaires du code (`E11`, `E55`, `E68`…) renvoient à l'ancien plan, consultable dans l'historique : `git show 1661122:docs/plan_implementation.md` (décisions, §2), `git show 1661122:docs/cahier_des_charges.md`.
- **`data/` est conservé** : seule source du script d'import, nécessaire à l'import de production. Ne pas le supprimer sans la confirmation de Taoufik. `public/images/` et l'ancien code du site (`app/components/`, `app/lib/`, `app/types/`, `app/globals.css`, `framer-motion`, `highlight.js` en dépendance directe) ont été supprimés.

## Stack

- Next.js 16 (App Router), React 19, **TypeScript** strict
- **pnpm** (jamais npm ni yarn : un seul lockfile, `pnpm-lock.yaml`)
- Tailwind CSS 4 : pas de `tailwind.config`, thème déclaré en CSS avec `@theme` (`app/admin/admin.css` pour l'admin, `app/(site)/site.css` pour le site public)
- Police de l'admin : Outfit, chargée par `next/font` dans `app/admin/layout.tsx` ; police du site public : Archivo (axe de largeur), dans `app/(site)/layout.tsx`
- Prisma 7 (version stable épinglée) avec **migrations versionnées**, adaptateur `@prisma/adapter-pg`
- PostgreSQL : base **locale** `portfolio` en développement (PostgreSQL 18, service Windows), Supabase Database en production
- Supabase Storage **en ligne** pour toutes les images et icônes, dans le même projet Supabase que la production ; buckets préfixés `dev-` en développement
- E-mails : SMTP Gmail via Nodemailer (mot de passe d'application)
- Validation : Zod. Tests : Vitest.
- Protection des routes : `proxy.ts` (ancien `middleware.ts`, renommé dans Next.js 16)

## Règles impératives

1. **Aucun secret dans le code, dans la documentation ou dans `.env.example`.** Le `.env.example` ne contient que des placeholders. Ne jamais écrire ni recopier un mot de passe réel.
2. `.env` n'est jamais commité et ne doit jamais être lu ou affiché dans une réponse.
3. **Ne jamais toucher à la base Supabase en développement.** Le développement se fait uniquement sur la base locale `portfolio`. Supabase Storage en ligne est autorisé (même projet que la production), mais uniquement dans les buckets `dev-*`.
4. Toute modification du schéma Prisma passe par une nouvelle migration. Ne jamais modifier une migration déjà créée.
5. `APP_ENV=development` : aucun e-mail envoyé, le lien (validation ou réinitialisation) est affiché dans la console. `APP_ENV=production` : envoi réel via SMTP.
6. Toute route d'administration est protégée côté serveur. Le contrôle côté client ne suffit jamais, et `proxy.ts` non plus : chaque layout, page et action serveur vérifie la session.
7. Les entrées sont validées côté serveur avant tout accès à la base.
8. Les contenus d'articles sont stockés en Markdown.
9. L'admin doit être responsive (mobile, tablette, desktop) et accessible au clavier.
10. **Un article n'est mis en ligne que par « Publier » suivi d'une confirmation.** Toute modification, y compris d'un article publié, est enregistrée dans un brouillon.
11. Aucune action sur Supabase Database ou sur Vercel sans demande explicite de Taoufik.
12. **Le site public ne lit que la base** (`lib/public/queries.ts`) : aucune donnée de contenu écrite dans le code, aucune lecture de `data/` ni de fichier local à l'exécution. Un article n'est visible que `PUBLISHED`, dans sa version publiée ; un brouillon répond 404. Un projet n'est visible que publié. Toute action de l'admin qui change un contenu visible appelle `revalidatePublic` (`lib/public/revalidate.ts`).
13. **Le seed ne tourne jamais sur la production sans confirmation explicite**, l'import des contenus non plus (E68). Les deux refusent `APP_ENV=production` et toute `DATABASE_URL` non locale, en simulation comme en écriture, sauf avec `--confirm-production` (`lib/target-guard.ts`) ; Claude Code n'ajoute jamais cette option de lui-même et ne lance ni `pnpm db:seed:production` ni l'import avec `--confirm-production`.

## Conventions

- **Anglais** : schéma Prisma (modèles, champs, énumérations), code, noms de fichiers, identifiants. Tables et colonnes en `snake_case` (`@@map`, `@map`).
- **Français** : interface, messages d'erreur, e-mails, URL de l'admin (`/admin/connexion`, `/admin/formations`…).
- Routes admin dans `app/admin/`, modules serveur dans `lib/` (marqués `import "server-only"`), composants dans `components/admin/`.
- Site public : routes dans `app/(site)/`, lectures et règles dans `lib/public/`, composants dans `components/site/`, styles dans `app/(site)/site.css` (scanné à part de l'admin).
- Fichiers référencés par leur chemin dans le bucket, URL publique calculée à l'affichage.
- Icônes : `lucide-react` en trait fin (réglé dans `admin.css`), pas d'emoji.
- Navigation de l'admin : barre horizontale en pilule, **sans logo** (elle commence par les liens et le menu du compte à partir de 1280 px, par le bouton « Menu » en dessous, qui ouvre un panneau modal), `components/admin/TopNav.tsx`.
- Styles de l'admin : composants de `components/admin/` et classes partagées de `admin.css` (`admin-card`, `admin-page-title`, `admin-section-title`, `admin-link`, `admin-thumb`) ; pas de styles en ligne par page.

## Charte visuelle de l'admin (étape 18, E60 et E61)

**La palette relevée sur la capture de référence fournie par Taoufik est la référence de l'admin** (décision E60). Elle est déclarée dans `@theme` de `app/admin/admin.css`, où les couleurs Tailwind par défaut sont désactivées (`--color-*: initial`) : `bg-red-500` et consorts ne compilent pas. Aucune autre couleur sans validation. Les ratios sont vérifiés par `components/admin/palette.test.ts`.

| Rôle                                  | Jeton Tailwind                       | Hex                   |
| ------------------------------------- | ------------------------------------ | --------------------- |
| Fond hors panneau                     | `canvas`                             | `#e7ebee`             |
| Cadre de la barre et du panneau       | `frame`                              | `#f2f3f7`             |
| Panneau, barre, champs                | `panel`                              | `#ffffff`             |
| Cartes                                | `card`                               | `#f6f6f6`             |
| Texte, boutons principaux, focus      | `ink` (survol `ink-hover`)           | `#0f0f12` (`#2c2c33`) |
| Texte secondaire                      | `muted`                              | `#5f636a`             |
| Bordures des champs et des listes     | `field-line`                         | `#8a8d93`             |
| Bordures des cartes, tableaux, séparateurs | `line`                          | `#e2e2e5`             |
| Badge positif, fond d'avertissement   | `lime`, `lime-soft`                  | `#b8f25c`, `#ecfad3`  |
| Bouton destructif, badge négatif      | `coral` (survol `coral-hover`)       | `#f2725f` (`#ee5f4a`) |
| Texte et bordure d'erreur             | `danger`                             | `#b42318`             |
| Statut « Publié »                     | `done-ink` sur `done-bg`             | `#137a3e` / `#d9f5e3` |
| Statut « Brouillon », « Non publié »  | `progress-ink` sur `progress-bg`     | `#2a4bd7` / `#dde6ff` |
| Statut « Modifications en attente »   | `waiting-ink` sur `waiting-bg`       | `#b42318` / `#fde3df` |
| Graphiques (décoratif)                | `hatch`, `chart-1`, `chart-2`        | `#d6d6da`, `#b6b6ba`, `#d3d3d6` |

Rôles :

- Texte noir sur panneau, cartes et fonds teintés (au moins 15). Texte secondaire `muted` (au moins 5,03).
- Bouton principal : pilule noire, texte blanc. Secondaire : pilule blanche à bordure noire fine. Destructif : pilule corail, **texte noir** (6,70). Hauteur minimale 44 px.
- Champs (saisie, listes déroulantes, fichiers, listes à cocher) : fond blanc, bordure `field-line` (3,33 sur blanc, 3,08 sur carte ; décision de Taoufik), rayon 14 px ; focus : anneau noir de 2 px décalé ; erreur : bordure `danger` de 2 px, message `danger` avec icône, lié par `aria-describedby`.
- Pilules de statut : une seule forme (`StatusBadge`), libellé toujours écrit.
- Alertes : fond teinté (succès `done-bg`, erreur `waiting-bg`, avertissement `lime-soft`, information `progress-bg`), icône dans une pastille blanche, libellé en gras (« Erreur : »…).
- Dialogues : panneau blanc, rayon 24 px, voile `ink/40`.
- **Interdits** : texte corail, vert anis ou gris de graphique (texte d'erreur : `danger`) ; texte blanc sur corail ou vert anis ; information portée par la couleur seule.
- **Logo** : aucun dans l'admin (E61) : ni « T », ni texte de marque, ni substitut, nulle part (barre, panneau mobile, pages sans session, 404, erreur, états vides). Le favicon n'est pas concerné.

**Motion (E61)**, dans `admin.css` (CSS et keyframes, aucune bibliothèque) :

- N'animer que `transform`, `opacity` (et `stroke-dashoffset` pour l'anneau) ; la couleur du contour et de l'anneau des champs passe en 150 ms.
- Entrées seulement, en `animation-fill-mode: backwards` : l'état final est l'état normal de la page, lisible sans JavaScript.
- 600 ms au plus, sauf le tracé de l'anneau (800 ms). Aucune boucle infinie, sauf le balayage des squelettes (1,6 s).
- Toute animation se déclare dans le bloc `@media (prefers-reduced-motion: no-preference)` d'`admin.css` ; tout déplacement ou toute échelle au survol ou au clic porte `motion-safe:`. Pas de classe `animate-*`. Vérifié par `components/admin/motion.test.ts`.
- Classes : `admin-page` (entrée de page, 250 ms), `admin-stagger` + `--admin-order` (cartes, 300 ms, 60 ms d'écart), `admin-bar` (barres, 600 ms, 50 ms), `admin-ring-draw` (anneau, 800 ms), `admin-alert` (alertes et notifications, 250 ms), `admin-dialog` et `admin-drawer` (dialogues et panneau mobile, 200 ms), `admin-menu` (menu du compte, 200 ms), `admin-rows` (lignes de tableau, 30 ms d'écart, 10 lignes), `admin-skeleton` (balayage). Boutons : soulèvement de 1 px et échelle 0,98 (150 ms). Indicateur de navigation : glissement de 250 ms. Pastilles de statut : aucune animation.
- Sous `prefers-reduced-motion: reduce` : aucun déplacement ni échelle, graphiques dans leur état final, squelettes statiques (filet global : durées ramenées à 0,01 ms).

## Site public (phase 2, E62 à E68)

Référence : vidéo fournie par Taoufik (non conservée dans le dépôt) ; mise en page et mouvement seulement, aucun texte, image, nom ni logo repris. Palette déclarée dans `@theme` de `app/(site)/site.css` (`--color-*: initial`), ratios vérifiés par `components/site/palette.test.ts`. Aucune autre couleur sans validation.

| Rôle                                   | Jeton    | Hex       |
| -------------------------------------- | -------- | --------- |
| Fond                                   | `paper`  | `#ececec` |
| Texte, contours, croix, focus          | `ink`    | `#0f0f10` |
| Texte secondaire                       | `muted`  | `#5f636a` |
| Bloc vertical, cartes d'accent         | `signal` | `#e0463a` |
| Fond des cartes et des images          | `tile`   | `#dcdcdc` |
| Filets décoratifs                      | `rule`   | `#c4c4c8` |
| Surfaces de lecture (code, cartes)     | `white`  | `#ffffff` |

- Ratios : `ink` sur `paper` 16,22, sur `white` 19,16 ; `muted` sur `paper` 5,11, sur `white` 6,04 ; `ink` sur `signal` 4,66. **Interdits** : rouge en texte (3,48), `muted` sur `tile` (4,40) ou sur `signal` (1,47), texte blanc sur rouge (4,11).
- Police : **Archivo** (`next/font`, variable, axe `wdth`) ; titres `site-wide` (largeur 125 %, graisse 800, capitales), contour `site-outline` décoratif (`aria-hidden`). La variable `--font-archivo` est posée sur `.site-root`, pas sur `:root` (d'où `@theme inline`).
- Image manquante : `public/defaults/image.svg` (`DEFAULT_IMAGE_SRC`), seule image par défaut. Images par `components/site/SiteImage.tsx` (`next/image`, `remotePatterns` Supabase, chargement différé sauf l'image principale).
- Pages gardées en cache (`revalidate = 3600` en repli) et invalidées par l'admin (`revalidatePublic`, E64).
- **Motion** (`site.css`, vérifié par `components/site/motion.test.ts`) : `transform` et `opacity` seulement ; entrées en `backwards` ; 600 ms au plus, sauf l'ouverture de l'éventail (850 ms, 900 ms au plus) ; une seule boucle infinie, l'anneau (`site-ring-spin`, 40 s) ; tout sous `@media (prefers-reduced-motion: no-preference)` ; pas de classe `animate-*`, pas de bibliothèque. Classes : `site-letter` (lettres du titre), `site-reveal` + `--order` (textes et cartes), `site-block` (bloc rouge), `site-fan-card` (éventail), `site-lift` + `--tilt` (survol des cartes), `site-ring-spin`.
- Import des anciens contenus : `scripts/import-public-content.ts` (E65, E68) : `plan.ts` (pur), `run.ts` (exécution par `ImportStore`, sans accès à l'administrateur), `store.ts` (Prisma). Images jamais importées (champs vides, image par défaut ; une technologie peut avoir un `iconPath` vide), données personnelles écartées (noms listés, jamais les valeurs), articles publiés seulement s'ils l'étaient déjà, à leur date d'origine. **Import réel seulement à la demande explicite de Taoufik** ; la simulation (`--dry-run`) sur la base locale aussi.
- **Accueil en une page (E66)** : grand titre = titre professionnel du profil (repli « Portfolio »), puis sections À propos, Projets, Parcours, Compétences, Articles, Contact (`components/site/home/`). Toute nouvelle donnée affichée sur l'accueil doit invalider `/` (`PUBLIC_PATHS`).
- **Navigation par ancres (E67)** : la barre et le pied de page ne contiennent que les ancres des sections de l'accueil (`components/site/links.ts` : `/#a-propos`, `/#projets`, `/#parcours`, `/#competences`, `/#articles`, `/#contact`), depuis toute page ; **aucun lien de navigation direct vers une page complète**. Chaque section montre un aperçu (`PREVIEW` dans `components/site/home/Sections.tsx` : 3 projets, 2 formations, 6 technologies, 3 articles ; la section Compétences ne montre que la grille de la stack, la liste des compétences n'est que sur `/competences`) et se termine par « Voir plus », seul accès à `/profil`, `/projets`, `/formations`, `/competences`, `/articles`. Toutes les sections sont toujours rendues (état vide sinon). Vérifié par `components/site/links.test.ts`.
- **Mouvement au défilement (E66)** : blocs `data-reveal` (+ `data-from="left|right"`, `--order`) révélés par `components/site/ScrollReveal.tsx` (rien n'est masqué sans JavaScript ni sous réduction) ; mouvements liés au défilement (`site-progress`, `site-drift`, dérive de `site-fan`, `site-heading-outline`) seulement sous `@supports (animation-timeline: view())`, sans durée. Grands titres par `BigTitle` (taille d'après la longueur, `--frame-pad`, découpe par mots sous 640 px au-delà de 9 caractères).

## Commandes

Tous les scripts de `package.json` sont opérationnels. `pnpm db:reset` détruit la base locale : seulement avec l'accord explicite de Taoufik (E32). `pnpm mail:test` envoie de vrais e-mails à `ADMIN_EMAIL` : seulement sur demande de Taoufik.

- Base locale : service Windows `postgresql-x64-18`, démarré automatiquement (sinon `Start-Service postgresql-x64-18` dans un terminal administrateur)
- Installer les dépendances : `pnpm install`
- Lancer le projet : `pnpm dev`
- Lint : `pnpm lint`
- Types : `pnpm typecheck`
- Tests : `pnpm test`
- Build : `pnpm build`
- Migrations (développement) : `pnpm db:migrate` (`prisma migrate dev`)
- Rejouer les migrations sur base vide : `pnpm db:reset`
- Seed (compte admin) : `pnpm db:seed`
- Buckets de stockage : `pnpm storage:setup`
- E-mails de test (SMTP réel, jeton factice) : `pnpm mail:test`
- Import des anciens contenus de `data/` : `pnpm content:import --dry-run` (simulation, comptes seulement) puis `pnpm content:import --apply` (base locale, aucun bucket touché) : **seulement à la demande explicite de Taoufik**. Ordre complet et commandes de production : README, « Peupler la base »
- Seed en production (étape 17 seulement, par Taoufik) : `pnpm db:seed:production` (`--confirm-production`)

## Méthode de travail

- À chaque reprise : lire `README.md` et ce fichier, puis `git log` et `git status` (du travail non commité peut venir d'une autre session : ne jamais l'écraser).
- Avant une modification qui n'est pas une correction évidente : proposer ce qui va être fait et attendre la validation de Taoufik.
- Vérifier chaque changement : `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, tous au vert.
- Tenir `README.md` et ce fichier à jour quand une fonctionnalité, une commande ou une règle change. Pas de nouveau document de suivi sans demande de Taoufik.
- Une nouvelle décision qui contredit une règle de ce fichier est signalée à Taoufik avant d'être appliquée.
