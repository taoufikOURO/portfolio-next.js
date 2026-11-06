# CLAUDE.md

Instructions permanentes pour Claude Code sur le projet **portfolio** de Taoufik OURO-BANG'NA.

Références : `docs/cahier_des_charges.md` (fonctionnel) et `docs/plan_implementation.md` (étapes). Lis-les avant toute tâche. Si une demande les contredit, signale-le au lieu de dévier.

## Contexte

- Refonte complète du portfolio personnel en Next.js.
- **Phase 1 (en cours)** : interface d'administration complète, protégée et responsive.
- **Phase 2 (plus tard)** : refonte de la partie visible du site. Pendant la phase 1, on n'y touche pas. Seule exception : le déplacement des pages publiques dans `app/(site)/` pour isoler l'admin, sans aucun changement visible pour les visiteurs.
- Le site public lit encore `data/` et `public/images/` : ne pas les supprimer avant la phase 2.

## Stack

- Next.js 16 (App Router), React 19, **TypeScript** strict
- **pnpm** (jamais npm ni yarn : un seul lockfile, `pnpm-lock.yaml`)
- Tailwind CSS 4 : pas de `tailwind.config`, thème déclaré en CSS avec `@theme` (`app/admin/admin.css` pour l'admin)
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

## Conventions

- **Anglais** : schéma Prisma (modèles, champs, énumérations), code, noms de fichiers, identifiants. Tables et colonnes en `snake_case` (`@@map`, `@map`).
- **Français** : interface, messages d'erreur, e-mails, URL de l'admin (`/admin/connexion`, `/admin/formations`…).
- Routes admin dans `app/admin/`, modules serveur dans `lib/` (marqués `import "server-only"`), composants dans `components/admin/`.
- Fichiers référencés par leur chemin dans le bucket, URL publique calculée à l'affichage.
- Icônes : `lucide-react`, pas d'emoji.
- Navigation de l'admin : barre latérale (fixe à partir de 1024 px, panneau ouvert par un bouton en dessous).

## Charte graphique

Palette imposée par Taoufik, déclarée dans `@theme` (Tailwind 4). Aucune autre couleur sans validation. Dans l'admin, les couleurs Tailwind par défaut sont désactivées (`--color-*: initial` dans `app/admin/admin.css`) : `bg-red-500` et consorts ne compilent pas.

| Nom              | Hex       |
| ---------------- | --------- |
| Crème            | `#f4f1de` |
| Terracotta       | `#e07a5f` |
| Bleu-gris foncé  | `#3d405b` |
| Vert sauge       | `#81b29a` |
| Sable            | `#f2cc8f` |

Rôles validés (ratios WCAG calculés, détail dans `docs/plan_implementation.md` §3.3) :

- Fond crème, texte et titres bleu-gris (8,87).
- Barre latérale : fond bleu-gris, texte crème ; élément actif en texte sable (6,63) avec un filet terracotta.
- Bouton principal : fond bleu-gris, texte crème. Bouton secondaire : bordure et texte bleu-gris sur crème.
- Bouton destructif : fond terracotta, texte bleu-gris **gras d'au moins 18,66 px** (3,42, conforme seulement en grand texte).
- Brouillon, modifications en attente, avertissements : fond sable, texte bleu-gris (6,63).
- Publié : fond bleu-gris, texte crème, pastille vert sauge.
- Succès et erreur : texte bleu-gris sur crème, filet gauche sauge ou terracotta, icône et libellé explicite.
- Bordures de champ et anneau de focus : bleu-gris (sable dans la barre latérale).
- **Interdits** : texte terracotta, sauge ou sable sur crème ; texte clair sur terracotta, sauge ou sable ; information portée par la couleur seule. Les variantes transparentes de la palette sont réservées aux séparateurs décoratifs.

## Commandes

Tous les scripts sont déclarés dans `package.json` depuis l'étape 1, mais `db:*` et `test` ne fonctionnent qu'après l'étape 3 (installation de `prisma` et `vitest`) et `storage:setup` qu'après l'étape 10 (`scripts/setup-storage.ts`). Ne pas les lancer avant.

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

## Méthode de travail

- **À chaque reprise : lire d'abord la section « 0. Suivi d'avancement » de `docs/plan_implementation.md`** et reprendre à la « Prochaine action ».
- Avant d'écrire du code : lire le cahier des charges et le plan, proposer ce qui va être fait si ce n'est pas déjà prévu, et attendre validation.
- Mettre à jour le suivi d'avancement (cases, statuts, journal) au fil de l'eau, et toujours à la fin d'une étape.
- Une étape du plan à la fois. Vérifier chaque étape (lint, types, tests, build, critères propres) avant de passer à la suivante.
- Mettre à jour `docs/cahier_des_charges.md` et `docs/plan_implementation.md` quand une décision change.
