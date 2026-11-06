# Plan d'implémentation : phase 1 (administration)

Auteur : Claude Code, pour Taoufik OURO-BANG'NA
Références : `CLAUDE.md`, `docs/cahier_des_charges.md` (version 1.2)

| Version | Date            | Changement                                                                                           |
| ------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| 1       | 6 novembre 2026 | Proposition initiale                                                                                 |
| 2       | 6 novembre 2026 | Décisions de Taoufik intégrées : schéma en anglais, brouillon pour toute modification d'article, barre latérale, pnpm, Supabase Storage en ligne, rôles des couleurs |
| 3       | 6 novembre 2026 | Étapes 1 et 2 réalisées (en attente de validation). Décisions E21 à E24 (imports de `page.tsx`, 404 des URL inconnues, polices, `storage:setup`) |
| 4       | 6 novembre 2026 | Décisions de Taoufik sur les étapes 1 et 2 : brouillon pour toute modification d'article (E5 précisé), stockage de développement dans le même projet Supabase (E17 précisé), couleurs Tailwind par défaut bloquées dans l'admin (E25), 404 des URL inconnues conservée (E22 et E23 inchangés) |
| 5       | 6 novembre 2026 | Étape 3 réalisée (en attente de validation). Décisions E26 à E32 (identifiants, tables de jointure, découpage de `lib/env`, client Prisma généré, dépendances ajoutées, `vitest.config.mts`, consentement exigé par Prisma pour `migrate reset`) |
| 6       | 6 novembre 2026 | Étape 4 réalisée (en attente de validation). Décisions E33 (exécution du seed par Node, hook de résolution, modules de mot de passe) et E34 (comportement du seed) ; note ajoutée à E24 pour l'étape 10 |

Statut : **validé**. L'étape 0 est terminée. Les étapes 1, 2, 3 et 4 sont réalisées et en attente de validation par Taoufik (voir §0).

---

## 0. Suivi d'avancement

> **À lire en premier à chaque reprise de travail.**
> Règles :
> - Une seule étape « en cours » à la fois.
> - Une étape n'est cochée qu'après la réussite de tous ses critères de validation (§3.6) **et** la validation de Taoufik.
> - Cette section est mise à jour à la fin de chaque étape, et chaque fois qu'une tâche est terminée ou qu'une décision change.
> - En cas de doute sur la suite : reprendre à la « Prochaine action » ci-dessous.

### 0.1 Vue d'ensemble

| Bloc            | Étape                                                                  | Résultat attendu                         | Statut        |
| --------------- | ---------------------------------------------------------------------- | ---------------------------------------- | ------------- |
| **Cadrage**     | 0. Arbitrages                                                          | Décisions intégrées aux documents        | ✅ Terminé     |
| **Préparer**    | 1. Outillage (scripts pnpm, `AGENTS.md`, `.env.example`)               | Dépôt prêt                               | ⏸️ Réalisée, validation en attente |
|                 | 2. Séparation site public / admin                                      | L'admin a son propre espace              | ⏸️ Réalisée, validation en attente |
| **Fondations**  | 3. Prisma et base locale (schéma, migration, Vitest)                   | Base en place                            | ⏸️ Réalisée, validation en attente |
|                 | 4. Seed du compte administrateur                                       | Compte admin créé                        | ⏸️ Réalisée, validation en attente |
|                 | 5. Interface de base (barre latérale, boutons, champs, dialogues)      | Composants réutilisables                 | ⏳ À faire     |
| **Sécurité**    | 6. Module e-mail (console en dev, Gmail en prod)                       | Envoi selon `APP_ENV`                    | ⏳ À faire     |
|                 | 7. Connexion, sessions, protection `/admin`, anti brute-force          | Admin protégé                            | ⏳ À faire     |
|                 | 8. Validation d'e-mail, mot de passe oublié, page « Compte »           | Parcours par lien complets               | ⏳ À faire     |
| **Contenus**    | 9. Compétences et formations                                           | Premier CRUD, conventions fixées         | ⏳ À faire     |
|                 | 10. Supabase Storage (uploads sécurisés)                               | Service d'upload                         | ⏳ À faire     |
|                 | 11. Stack technique                                                    | Section fonctionnelle                    | ⏳ À faire     |
|                 | 12. Profil                                                             | Section fonctionnelle                    | ⏳ À faire     |
|                 | 13. Projets et collaborateurs GitHub                                   | Section fonctionnelle                    | ⏳ À faire     |
|                 | 14. Articles (éditeur, autosave, publication)                          | Section fonctionnelle                    | ⏳ À faire     |
| **Finir**       | 15. Tableau de bord                                                    | Accueil de l'admin                       | ⏳ À faire     |
|                 | 16. Recette et documentation                                           | Critères §10 du cahier vérifiés          | ⏳ À faire     |
|                 | 17. Mise en production (**uniquement sur demande**)                    | Site en ligne                            | ⏸️ En attente  |

Légende : ✅ terminé · 🔄 en cours · ⏳ à faire · ⏸️ en attente d'une décision de Taoufik.

**Pourquoi cet ordre** : les formations passent en premier parmi les contenus parce que c'est le CRUD le plus simple, sans upload. Il fixe les conventions réutilisées ensuite. Les articles passent en dernier parce qu'ils dépendent de tout le reste (interface, sessions, stockage, brouillons).

### 0.2 Prochaine action : étape 5 (après validation des étapes 1 à 4 par Taoufik)

**Rien n'est à faire tant que Taoufik n'a pas validé les étapes 1, 2, 3 et 4.** Ensuite, une seule étape à la fois :

1. **Étape 5 : fondations de l'interface d'administration** (voir §3.6). Dépend seulement de l'étape 2. Aucun prérequis dans `.env`.
2. Avant d'écrire du code, proposer le détail (liste et API des composants de `components/admin/`, page de démonstration temporaire, méthode de vérification du clavier, des largeurs et de Lighthouse) et attendre la validation.
3. Rappels pour la suite : `pnpm db:reset` demande l'accord explicite de Taoufik (E32) ; `storage:setup` attend `scripts/setup-storage.ts` (étape 10, voir la note de E24) ; l'étape 7 réutilise `lib/auth/password.ts`, `lib/auth/password-policy.ts` et la mise en minuscules de l'adresse (E34).

**Étape 4 : seed du compte administrateur** : réalisée

- [x] Vérifier que `ADMIN_EMAIL` et `ADMIN_PASSWORD` sont présents et non vides dans `.env`, mot de passe ≥ 12 caractères (sans afficher les valeurs)
- [x] Installer `@node-rs/argon2` **2.2.2** (épinglé, `latest` stable du 6 octobre 2026 ; binaire précompilé, aucun script d'installation)
- [x] `lib/auth/password-policy.ts`, `lib/auth/password.ts` (argon2id, m = 19 456 Kio, t = 2, p = 1), `lib/env-schema.ts` (`parseSeedEnv`), `prisma/seed.ts`, `scripts/ts-resolve-hook.mjs`, commande de seed dans `prisma.config.ts` (E33, E34)
- [x] Tests Vitest : `lib/auth/password.test.ts` (13), `lib/seed-env.test.ts` (10) ; 75 tests au total
- [x] Premier `pnpm db:seed` : compte et profil créés ; second : rien modifié, message clair ; refus vérifiés (mot de passe de 11 caractères, adresse invalide, base distante)
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- [ ] **Validation par Taoufik**
- [ ] Taoufik : retirer `ADMIN_PASSWORD` de `.env` (le seed n'en a plus besoin, E34)

**Étape 3 : Prisma et base locale** : réalisée

- [x] Vérifier que `DATABASE_URL`, `DIRECT_URL` et `SESSION_SECRET` sont présents et non vides dans `.env` (sans afficher les valeurs) ; hôtes locaux, secret ≥ 32 caractères
- [x] Installer en versions épinglées : `prisma`, `@prisma/client`, `@prisma/adapter-pg` 7.10.1, `pg` 8.23.1, `zod` 4.6.7, `server-only` 0.0.1, `vitest` 5.1.0 ; plus `vite` 8.3.6 et `@types/pg` 8.23.1 (E30)
- [x] `prisma/schema.prisma` (§3.5), `prisma.config.ts`, migration `20261106123149_init`
- [x] `lib/env-schema.ts`, `lib/env.ts`, `lib/db.ts`, `vitest.config.mts`, `test/server-only.ts`, `lib/env.test.ts` (E28, E31)
- [x] `pnpm db:reset` (avec l'accord explicite de Taoufik, E32) puis `pnpm prisma migrate status` : à jour ; `prisma migrate diff` : aucun écart
- [x] Tables, index, contraintes uniques et clés étrangères vérifiés par requête en lecture seule
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` (52 tests), `pnpm build`
- [ ] **Validation par Taoufik**

**Étape 1 : outillage** (aucun changement visible) : réalisée

- [x] Corriger `.gitignore` (`!.env.example`)
- [x] Créer `.env.example` (placeholders commentés uniquement)
- [x] Créer `.env` à partir de l'exemple, pour que Taoufik le remplisse
- [x] Ajouter les scripts `package.json` : `typecheck`, `test`, `db:migrate`, `db:deploy`, `db:reset`, `db:seed`, `db:studio`, `storage:setup` (ceux qui dépendent de paquets de l'étape 3 ou 10 ne sont **pas lancés** avant ces étapes)
- [x] Réduire `AGENTS.md` à un renvoi vers `CLAUDE.md`
- [x] Vérifier que `pnpm lint`, `pnpm typecheck` et `pnpm build` passent comme avant
- [ ] **Validation par Taoufik**

**Étape 2 : séparation site / admin** : réalisée

- [x] Captures **avant** : accueil, page projet, page article, 404, en mobile (390 px) et en desktop (1440 px), dans `docs/captures/avant/`
- [x] Déplacer les pages publiques dans `app/(site)/` avec `git mv` (7 fichiers en renommage pur ; `page.tsx` : 10 lignes d'import corrigées, voir E21)
- [x] Réduire `app/layout.tsx` à l'essentiel ; Header, Footer, polices, JSON-LD, `metadata`, `viewport` et `globals.css` dans `app/(site)/layout.tsx` (voir E23)
- [x] Créer `app/admin/layout.tsx`, `app/admin/admin.css` (palette dans `@theme`) et une page provisoire
- [x] Exclure `/admin` de l'indexation (`robots.ts` + `noindex`)
- [x] Captures **après** (`docs/captures/apres/`) et comparaison : les 8 captures sont identiques à l'octet près
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` ; `git diff -M` : 7 renommages purs, `page.tsx` renommé avec 44 % de similarité (imports seulement)
- [ ] **Validation par Taoufik**

**Écart connu (étape 2), accepté** : pour une URL inconnue (ex. `/une-page-inconnue`), le HTML renvoyé par le serveur n'est plus la page 404 complète mais la coquille d'erreur de Next (`<html id="__next_error__">`) ; la page 404 s'affiche ensuite après hydratation, identique à l'écran. Code HTTP 404 et `noindex` inchangés. C'est déjà le comportement des 404 `/articles/inconnu` et `/projets/slug-inconnu` avant l'étape 2. **Décision de Taoufik : accepté, la 404 des URL inconnues reste telle quelle** (E22 et E23 inchangés). Alternative écartée : `experimental.globalNotFound` (voir E22).

### 0.3 Prérequis à fournir par Taoufik

| Pour l'étape | Variables à remplir dans `.env`                                   | Fait |
| ------------ | ----------------------------------------------------------------- | ---- |
| 3            | `DATABASE_URL`, `DIRECT_URL` (même lien local), `SESSION_SECRET` | [x]  |
| 4            | `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                   | [x]  |
| 10           | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`           | [ ]  |
| 17           | Variables de production (Vercel), `SMTP_*`                        | [ ]  |

### 0.4 Journal

| Date            | Étape | Fait                                                                                             |
| --------------- | ----- | ------------------------------------------------------------------------------------------------ |
| 6 novembre 2026 | 0     | État des lieux, plan v1, décisions de Taoufik, cahier v1.1, `CLAUDE.md` mis à jour, plan v2      |
| 6 novembre 2026 | 1     | `.gitignore` corrigé, `.env.example` et `.env` créés                                             |
| 6 novembre 2026 | 1     | Scripts `package.json` ajoutés (`typecheck`, `test`, `db:*`, `storage:setup`), `AGENTS.md` réduit à un renvoi. Lint, types et build passent. Le premier `pnpm build` de référence a échoué (téléchargement `next/font/google`, réseau), le second est passé sans changement. |
| 6 novembre 2026 | 2     | Captures avant/après (Chrome headless, `prefers-reduced-motion`), pages déplacées dans `app/(site)/`, layouts, `app/admin/` provisoire, `robots.ts`. Décisions E21 à E24. Cache `.next/` supprimé (types périmés d'un ancien `next dev` qui faisaient échouer `pnpm typecheck`). |
| 6 novembre 2026 | 1-2   | Décisions de Taoufik appliquées : (1) modifier un article publié passe par un brouillon, seul « Publier » + confirmation met en ligne (E5, cahier §3.3 déjà conformes, libellé de E5 précisé, `CLAUDE.md` règle 10 inchangée) ; (2) stockage de développement dans le même projet Supabase que la production, buckets `dev-*`, plus aucune mention de la CLI Supabase dans le cahier (E17 conservé, précisé) ; (3) `--color-*: initial` dans `app/admin/admin.css`, `bg-red-500` vérifié absent du CSS admin et présent dans le CSS du site (E25) ; (4) 404 des URL inconnues conservée (E22, E23 inchangés). `docs/captures/` ajouté au `.gitignore`. Cahier passé en v1.2, plan en v4. Lint, types et build passent. Rien n'est commité. Étapes 1 et 2 toujours en attente de validation. |
| 6 novembre 2026 | 3     | À la demande de Taoufik (étape 3 seule, détaillée dans sa consigne). Variables vérifiées sans affichage. Dépendances installées en versions épinglées ; `allowBuilds` autorise `prisma` et `@prisma/engines` (téléchargement du moteur de migration). Schéma, `prisma.config.ts`, migration `20261106123149_init` créée et appliquée sur la base locale `portfolio` (PostgreSQL 18.6). `lib/env-schema.ts`, `lib/env.ts`, `lib/db.ts`, `vitest.config.mts`, 52 tests Vitest. Garde-fou de la CLI vérifié (DIRECT_URL distante factice : commande annulée avant toute connexion). Décisions E26 à E32. |
| 6 novembre 2026 | 3     | `pnpm db:reset` refusé par Prisma (détection d'un agent IA) ; relancé après accord explicite de Taoufik : migration rejouée sans erreur. `migrate status` à jour, `migrate diff` sans écart, 17 tables (dont `_prisma_migrations`), 27 index uniques ou clés primaires, 10 index, 12 clés étrangères, 25 colonnes `timestamptz`. Lint, types, tests et build passent. Aucune base Supabase touchée. Rien n'est commité. |
| 6 novembre 2026 | 4     | À la demande de Taoufik (étape 4 seule, détaillée dans sa consigne, qui vaut validation du détail). `ADMIN_EMAIL` et `ADMIN_PASSWORD` vérifiés sans affichage. `@node-rs/argon2` 2.2.2 épinglé. Node ne résout pas les imports sans extension du client généré (`ERR_MODULE_NOT_FOUND`) : hook `scripts/ts-resolve-hook.mjs` plutôt que `tsx` (E33). Premier seed : 1 administrateur (hash `$argon2id$v=19$m=19456,t=2,p=1$…`, qui vérifie le mot de passe de `.env` et ne le contient pas), profil id 1 vide. Second seed : état identique (`updated_at` inchangé). Refus vérifiés avec des valeurs factices passées en variables d'environnement (mot de passe de 11 caractères, adresse invalide, `DATABASE_URL` distante : sortie 1 avant toute connexion) ; adresse différente : avertissement, rien modifié ; `ADMIN_PASSWORD` vide : compte existant conservé. Journaux du seed : ni mot de passe, ni hash, ni adresse. Lint, types, 75 tests et build passent. Vérifications en lecture seule (`BEGIN READ ONLY`). Aucune base Supabase touchée. Rien n'est commité. |

---

## 1. État des lieux

### 1.1 Socle technique en place

| Élément            | État constaté                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js **16.1.6**, App Router, React **19.2.3**                                                               |
| Langage             | TypeScript 5, `strict: true`, alias `@/*` vers la racine                                                       |
| Styles              | Tailwind CSS **4** via `@tailwindcss/postcss`. **Aucun `tailwind.config.*`** : thème en variables CSS dans `app/globals.css` |
| Gestionnaire        | **pnpm** 12 (`pnpm-lock.yaml`, `pnpm-workspace.yaml` avec réglages `allowBuilds`)                             |
| Dépendances runtime | `framer-motion`, `highlight.js`, `lucide-react`, `next`, `react`, `react-dom`                                    |
| Qualité             | ESLint 9 (flat config, `eslint-config-next`). **Aucun test, aucune CI**                                        |
| Base de données     | Aucune dans le code. Sur le poste : **PostgreSQL 18** en service Windows (`postgresql-x64-18`, démarrage automatique). `psql` n'est pas dans le `PATH` |
| Authentification    | Aucune. Aucune route `/admin`, aucun `proxy.ts`                                                                |
| Variables d'env.    | Le site public n'utilise que `NEXT_PUBLIC_SITE_URL` (`app/lib/site.ts`)                                        |
| Documentation agent | `CLAUDE.md` **et** `AGENTS.md` (ancien, décrit l'architecture JSON et contient des informations déjà fausses)  |

### 1.2 Arborescence actuelle (fichiers suivis, hors `public/`)

```
app/
  layout.tsx            racine : polices, métadonnées, JSON-LD, <Header/> et <Footer/> globaux
  page.tsx              accueil (sections)
  globals.css           thème public (palette différente de la charte)
  not-found.tsx, robots.ts, sitemap.ts, icon.svg
  articles/  page.tsx, [slug]/page.tsx   (parseur Markdown écrit à la main + highlight.js)
  projets/   page.tsx, [slug]/page.tsx, [slug]/not-found.tsx
  formations/page.tsx
  components/  21 composants du site public (9 en "use client")
  lib/   data.ts (lecture des JSON), format.ts (dates, cn), site.ts (URL du site)
  types/ data.ts (types des JSON)
data/
  articles.json + articles/bienvenue.md, formations.json, profile.json,
  projets.json, stack.json, faq.json, services.json
public/images/{profile,projets,stack}/   images référencées par les JSON
```

### 1.3 Contenu de `data/` comparé au modèle cible

| Fichier            | Structure actuelle                                                                  | Modèle cible                      | Remarques                                                                 |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `articles.json`   | id, titre, description, auteur, date, slug, mdFile, categorie, image              | `Article` + `ArticleVersion`    | Contenu dans un fichier `.md` séparé ; ni statut ni date de mise à jour   |
| `formations.json` | intitule, description, debut/fin **en texte** (« Octobre 2025 »), etablissement, lieu, mention, moyenne **en texte**, competences **en texte libre** | `Education` + `Skill`           | Dates au mois près ; compétences non normalisées ; pas d'ordre           |
| `profile.json`    | nom, prenom, email, titreProfessionnel, bio, aPropos, liens, photo, transparentPhoto, cv | `Profile`                       | Correspondance quasi directe                                              |
| `projets.json`    | id, slug?, titre, description, estPublie, lien?, image?, github[], stack[]          | `Project`, `ProjectLink`, `Technology` | `lien` + `github[]` deviennent des `ProjectLink`                    |
| `stack.json`      | name, icon                                                                          | `Technology`                    | Correspondance directe                                                    |
| `faq.json`, `services.json` | —                                                                       | —                                 | Hors périmètre phase 1                                                    |

Conformément au cahier des charges (§2), **aucune donnée n'est importée**. Ces fichiers servent seulement à vérifier que le modèle couvre les besoins.

### 1.4 Ce qui est réutilisable pour l'admin

- **Socle** : Next 16, React 19, TypeScript strict, Tailwind 4, ESLint, alias `@/*`.
- `lucide-react` pour les icônes (pas d'emoji, règle conservée).
- `slugify()` (`app/lib/data.ts`) et `cn()` (`app/lib/format.ts`) : logique **recopiée** dans `lib/`, pour ne pas lier l'admin au code de lecture des JSON qui disparaîtra en phase 2.
- `highlight.js` : coloration du code dans l'aperçu Markdown (via `rehype-highlight`).
- Bonnes pratiques présentes : lien d'évitement, `:focus-visible`, `lang="fr"`, `poweredByHeader: false`.
- `zod` 4 n'est présent que comme dépendance transitive d'ESLint : il sera **ajouté explicitement**.

### 1.5 Ce qui doit être supprimé ou remplacé

**Pendant la phase 1, rien n'est supprimé.** Le site public lit toujours `data/` et `public/images/`.

| Élément                                                      | Action                                                  | Quand                         |
| ------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| `data/*.json`, `data/articles/`                             | Supprimer                                                | Phase 2                       |
| `app/lib/data.ts`, `app/types/data.ts`                      | Remplacer par des requêtes Prisma                        | Phase 2                       |
| Parseur Markdown fait main (`app/articles/[slug]/page.tsx`) | Remplacer par le moteur de rendu de l'admin              | Phase 2                       |
| `public/images/{profile,projets,stack}`                     | Supprimer (images dans Supabase Storage)                 | Phase 2                       |
| `app/layout.tsx` (Header/Footer globaux)                     | Déplacer dans `app/(site)/layout.tsx`                   | **Fait** (étape 2)            |
| `.gitignore` : `.env*` ignorait aussi `.env.example`        | Exception `!.env.example` ajoutée                        | **Fait**                      |
| `AGENTS.md`                                                   | Réduire à un renvoi vers `CLAUDE.md`                     | **Fait** (étape 1)            |
| `README.md`                                                   | Mettre à jour                                            | Fin de phase 1 (étape 16)     |

---

## 2. Écarts avec le cahier des charges et décisions prises

| #   | Écart constaté                                                                                          | Décision                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | `CLAUDE.md` indiquait npm, le projet utilise pnpm.                                                      | **pnpm.** `CLAUDE.md` corrigé.                                                                                                                  |
| E2  | Tailwind 4 n'a pas de `tailwind.config` (`theme.extend.colors` n'existe plus).                          | Palette déclarée dans un bloc `@theme` de `app/admin/admin.css`. `CLAUDE.md` corrigé.                                                           |
| E3  | Next 16 a renommé `middleware.ts` en `proxy.ts`.                                                        | `proxy.ts` : contrôle rapide du cookie. La vérification réelle se fait côté serveur dans chaque layout, page et action. Cahier corrigé.            |
| E4  | Plusieurs combinaisons de la palette échouent au contraste WCAG AA.                                    | Rôles des couleurs fixés à partir des ratios calculés (§3.3). Aucune couleur ajoutée.                                                            |
| E5  | Autosave et « modifier un article publié le met en ligne immédiatement » se contredisaient.            | **Modifier un article publié passe par un brouillon.** Toute modification va dans un brouillon ; seule l'action « Publier », avec confirmation, met la version en ligne. La version publiée reste visible pendant l'édition (§3.2). |
| E6  | Accents impossibles dans les identifiants Prisma.                                                       | **Schéma entièrement en anglais** (modèles, champs, énumérations). Tables et colonnes en `snake_case`. Interface et URL en français.            |
| E7  | Ni sessions ni tentatives de connexion dans le modèle.                                                  | Tables `Session` et `LoginAttempt`.                                                                                                              |
| E8  | Changement d'e-mail : pas de stockage de l'adresse en attente.                                          | Champ `AuthToken.targetEmail`.                                                                                                                   |
| E9  | Collaborateurs : pas d'état de récupération GitHub.                                                     | Champs `Collaborator.syncedAt` et `syncError`.                                                                                                   |
| E10 | `misÀJourLe` ne correspond pas à `@updatedAt`.                                                          | `Article.lastPublishedAt` est géré explicitement à chaque republication. `updatedAt` reste un champ technique.                                  |
| E11 | Les images étaient stockées sous forme d'URL.                                                           | Stockage du **chemin** dans le bucket (`...Path`), URL publique calculée à l'affichage, ancien fichier supprimable.                              |
| E12 | Ordre d'affichage prévu seulement pour les formations.                                                  | Champ `position` sur `Education`, `Project`, `Technology` et `ProjectLink`.                                                                      |
| E13 | Deux variables pour l'URL du site (`NEXT_PUBLIC_SITE_URL`, `APP_URL`).                                  | Les deux coexistent en phase 1, fusion en phase 2.                                                                                              |
| E14 | Le layout racine affiche le Header et le Footer publics partout.                                        | Pages publiques déplacées dans `app/(site)/`. URL et rendu identiques pour les visiteurs.                                                       |
| E15 | `.gitignore` excluait `.env.example`.                                                                   | Corrigé.                                                                                                                                         |
| E16 | Le tag `latest` de Prisma est une version candidate (8.0.0-rc.30).                                      | Version stable **7.x épinglée** (7.10.1 au 6 novembre 2026).                                                                                    |
| E17 | Le cahier prévoyait des tests de stockage avec la CLI Supabase locale (Docker).                         | **Supabase Storage en ligne**, y compris en développement, **dans le même projet Supabase que la production**, avec des buckets préfixés `dev-`. Pas de Docker, pas de CLI Supabase. La base de développement reste le PostgreSQL local. |
| E18 | Aucun test automatisé.                                                                                  | **Vitest** pour la logique serveur dès l'étape 3.                                                                                               |
| E19 | `AGENTS.md` contredit le code et doublonne `CLAUDE.md`.                                                 | Réduit à un renvoi vers `CLAUDE.md` (étape 1).                                                                                                   |
| E20 | TypeScript « à confirmer ».                                                                             | Confirmé (déjà en place, mode strict).                                                                                                          |
| E21 | `app/page.tsx` importe `./lib/data` et `./components/*` en relatif : le déplacement dans `(site)` les casse. | **Corriger les 10 imports de `page.tsx` seulement** (`./` devient `../`). Les 7 autres fichiers déplacés sont des renommages purs. `components/`, `lib/` et `types/` restent dans `app/`. |
| E22 | Un `not-found.tsx` dans `(site)` ne couvre pas les URL qui ne correspondent à aucune route : Next affiche sa 404 noire par défaut. | **Route fourre-tout** `app/(site)/[...slug]/page.tsx` qui appelle `notFound()`. Captures identiques, HTTP 404 et `noindex` conservés. Effet de bord : le HTML serveur est la coquille d'erreur de Next (comme pour `/articles/inconnu` déjà avant), et `/admin/xyz` inconnu affiche la 404 publique (à traiter à l'étape 7). Alternative non retenue : `experimental.globalNotFound`. **Validé par Taoufik : la 404 reste telle quelle.** |
| E23 | Les polices Next sont des classes posées sur `<body>`, et `globals.css` lit `--font-*` sur `body`.      | `(site)/layout.tsx` enveloppe le contenu dans `<div class="site-root …polices">`. Dans `globals.css`, les trois `--font-*`, `font-family` et `-webkit-font-smoothing` passent de `body` à `.site-root`. `metadata` et `viewport` passent dans `(site)/layout.tsx` (canonical `/`, Open Graph, `themeColor` ne doivent pas s'appliquer à l'admin). |
| E24 | `storage:setup` doit lancer un script TypeScript, et `tsx` n'est pas dans les dépendances prévues (§3.8). | `node --env-file=.env scripts/setup-storage.ts` (Node 24 exécute le TypeScript). Le script devra utiliser des **imports relatifs avec extension `.ts`**, pas l'alias `@/`. Pas de dépendance ajoutée. **Note (étape 4, E33)** : `lib/env-schema.ts` importe désormais `./auth/password-policy` sans extension. À l'étape 10, ajouter `--import ./scripts/ts-resolve-hook.mjs` (et `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`) au script `storage:setup` ; les imports relatifs pourront alors rester sans extension. |
| E25 | Tailwind 4 déclare par défaut toute sa palette (`red-500`, `slate-700`…) : un réflexe de classe introduirait une couleur hors charte dans l'admin. | `app/admin/admin.css` : `--color-*: initial` en tête du bloc `@theme`, puis les cinq couleurs de la charte. Vérifié par build : `bg-red-500` placé temporairement dans l'admin et dans le site public n'est généré que dans le CSS du site. Aucun impact sur le site public (CSS séparés). `black` et `white` n'existent plus dans l'admin : utiliser `cream` et `slate-blue`. |
| E26 | §3.5 ne fixe ni le type des identifiants ni la façon de garantir le profil unique.                       | **UUID v7** générés par Prisma (`@default(uuid(7)) @db.Uuid`), non devinables dans les URL de l'admin et triables par date. `Profile.id` : `Int @default(1)` ; l'unicité est assurée par l'application (`upsert` sur l'id 1), pas par une contrainte `CHECK` que Prisma ne sait pas décrire. Champs texte obligatoires du profil à `""` par défaut (profil vide du seed). `Education`, `Skill`, `Profile`, `ProjectLink`, `Technology` et `Collaborator` n'ont pas de `createdAt`/`updatedAt`, conformément au §3.5. |
| E27 | Les tables des relations plusieurs-à-plusieurs implicites ne peuvent pas recevoir `@@map`.              | Nommées par la relation : `_education_skills`, `_project_technologies`, `_project_collaborators`. Leurs colonnes `A` et `B` sont imposées par Prisma : **seule exception** au `snake_case`. Passer à des modèles de jointure explicites demanderait une nouvelle migration. |
| E28 | `lib/env.ts` doit être `server-only`, mais les garde-fous servent aussi hors de Next.js (CLI Prisma, seed, scripts Node). | Deux fichiers : **`lib/env-schema.ts`** (pur : schéma Zod, `parseEnv`, `EnvError`, `isLocalDatabaseUrl`, `isDevBucketName` ; imports Node-compatibles, voir E24) et **`lib/env.ts`** (`import "server-only"`, valide `process.env` au premier import). Obligatoires : `APP_ENV`, `APP_URL`, `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (≥ 32 caractères), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, les 4 buckets ; `SMTP_*` et `MAIL_FROM` seulement en production ; `ADMIN_*` hors de l'application (seed). Hôte local strict : `localhost`, `127.0.0.1`, `::1`, hôte absent refusé, paramètre `?host=` distant refusé. **`prisma.config.ts` applique aussi le garde-fou** : hors `APP_ENV=production`, toute commande Prisma vers une `DIRECT_URL` non locale est annulée avant connexion. |
| E29 | Prisma 7 : générateur `prisma-client` avec sortie obligatoire, `.env` non chargé par la CLI, URL hors du schéma. | Client généré dans **`generated/prisma/`** (ignoré par Git et ESLint), régénéré par le script **`postinstall`** (et `pnpm db:generate`). `.env` chargé dans `prisma.config.ts` par `process.loadEnvFile` (natif Node, pas de `dotenv`), sans écraser les variables déjà définies ni échouer si `.env` est absent. CLI : `DIRECT_URL` ; application : `DATABASE_URL` via `@prisma/adapter-pg` (`lib/db.ts`). |
| E30 | Dépendances nécessaires non listées au §3.8.                                                            | `vite` 8.3.6 (dépendance pair **obligatoire** de `vitest` 5, épinglée plutôt qu'installée implicitement) et `@types/pg` 8.23.1 (types de `pg`). `pnpm-workspace.yaml` : `allowBuilds` pour `prisma` et `@prisma/engines` (pnpm 12 bloque leurs scripts ; le second télécharge le moteur de migration). Avertissement non bloquant : `vitest` 5 attend `@types/node` ≥ 22 (pair facultatif), le projet a `^20` alors que Node 24 tourne en local ; non modifié, à trancher. |
| E31 | `vitest.config.ts` en syntaxe ESM dans un paquet CommonJS : Vite 8 affiche un avertissement.           | **`vitest.config.mts`**, plutôt que `"type": "module"` dans `package.json` (impact sur tout le projet). `server-only` remplacé par un module vide (`test/server-only.ts`) dans les tests. Alias `@/` en expression régulière pour ne pas capturer `@prisma/…`. |
| E32 | Prisma 7 refuse `migrate reset` lancé par un agent IA sans consentement explicite.                      | Avant chaque `pnpm db:reset`, Claude Code demande l'accord explicite de Taoufik (commande, base visée, perte des données) ; la commande est relancée avec la variable `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` contenant sa réponse. En non interactif, `--force` est nécessaire. Taoufik peut aussi lancer `! pnpm db:reset` lui-même. Remarque pour l'étape 10 : Node exécute les `.ts` de `lib/` avec un avertissement `MODULE_TYPELESS_PACKAGE_JSON` (sans effet). |
| E33 | Le seed tourne hors de Next.js, sans `tsx` (E24). Or Node 24 n'ajoute pas l'extension aux imports relatifs, et le client généré (`generated/prisma/`) importe `./enums`, `../models`… sans extension : `ERR_MODULE_NOT_FOUND`. | **Hook de résolution `scripts/ts-resolve-hook.mjs`** (`module.registerHooks`, natif Node) : un import relatif sans extension est réessayé avec `.ts`, puis `/index.ts`. Commande : `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/ts-resolve-hook.mjs prisma/seed.ts`, déclarée dans `prisma.config.ts` (`migrations.seed`). Aucune dépendance ajoutée ; ni le générateur Prisma ni `tsconfig.json` ne sont modifiés. Alternatives écartées : `tsx` (dépendance non prévue), `importFileExtension = "ts"` dans le générateur (touche le client utilisé par Next et `tsc`). **`lib/auth/password.ts` n'est pas `server-only`** (le seed l'importe hors de Next) ; il ne peut pas fuiter vers le navigateur, car `@node-rs/argon2` est un module natif que Next garde côté serveur. La règle des 12 caractères est isolée dans **`lib/auth/password-policy.ts`** (pur, sans argon2), pour que les schémas Zod partagés client/serveur des étapes 7 et 8 l'importent sans embarquer argon2. Longueur comptée en points de code (un emoji compte pour un). |
| E34 | Comportement du seed non précisé : compte existant avec une autre adresse, `ADMIN_PASSWORD` à retirer après le premier seed, variables Supabase pas encore remplies. | **Compte unique** : si un administrateur existe, le seed ne crée rien et ne modifie rien, même si `ADMIN_EMAIL` a changé (avertissement qui renvoie vers la page « Compte »). `ADMIN_PASSWORD` n'est exigé que pour créer le compte ; s'il est fourni, il doit faire au moins 12 caractères (sinon refus avant toute connexion). **`ADMIN_EMAIL` est enregistré en minuscules** (et sans espaces autour) : l'étape 7 doit normaliser l'adresse saisie de la même façon. Le mot de passe n'est jamais rogné. Le seed ne valide que ses variables (`parseSeedEnv` dans `lib/env-schema.ts` : `APP_ENV`, `DATABASE_URL` locale en développement, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), pas tout le schéma de l'application, qui exige déjà Supabase. Il utilise `DATABASE_URL` (la CLI garde son propre garde-fou sur `DIRECT_URL`). La console ne cite que les noms des variables ; le message brut des erreurs Prisma n'est jamais affiché (il peut reprendre les arguments de la requête), seulement leur code avec une explication. Profil id 1 créé vide s'il manque, jamais modifié. |

---

## 3. Plan d'implémentation

### 3.1 Principes transverses

- **Isolation** : routes de l'admin dans `app/admin/`, modules serveur dans `lib/`, composants dans `components/admin/`. Le site public n'est modifié qu'à l'étape 2 (simple déplacement).
- **Langues** : code, noms de fichiers, schéma et identifiants en **anglais** ; interface, messages, e-mails et URL en **français**.
- **Modules serveur** marqués `import "server-only"` (base, sessions, e-mail, stockage).
- **Validation** : un schéma Zod par formulaire dans `lib/validation/`, utilisé côté client avant envoi et côté serveur avant tout accès à la base. Messages d'erreur en français.
- **Mutations** par Server Actions. Chaque action commence par `requireSession()`, valide ses entrées, puis écrit. `proxy.ts` ne remplace jamais ce contrôle.
- **Retour d'action** uniforme : `{ ok: true, message } | { ok: false, message, fieldErrors }`. Erreurs liées aux champs (`aria-invalid`, `aria-describedby`), messages annoncés (`role="status"` ou `role="alert"`).
- **Garde-fous de développement** (`lib/env.ts`, au démarrage, si `APP_ENV=development`) :
  - refus si l'hôte de `DATABASE_URL` ou `DIRECT_URL` n'est pas local (`localhost`, `127.0.0.1`, `::1`) ;
  - refus si un nom de bucket ne commence pas par `dev-`.
- **Une étape à la fois** : chaque étape se termine par `pnpm lint`, `pnpm typecheck`, `pnpm test` (dès l'étape 3), `pnpm build`, puis ses critères propres.

### 3.2 Cycle de vie d'un article

```
             créer                 modifier (autosave)              « Publier » + confirmation
  (rien) ──────────► Brouillon ─────────────────────► Brouillon ──────────────────────────────► Publié
                    (jamais publié)                                                              │
                                                                                                 │ modifier (autosave)
                                                                                                 ▼
                                               Publié + modifications en attente (la version en ligne ne change pas)
                                                     │                                  │
                                « Publier » + confirmation                  « Abandonner les modifications » + confirmation
                                                     ▼                                  ▼
                                   Publié (nouvelle version en ligne)        Publié (version en ligne inchangée)
```

- Un article a au plus **deux versions** : la version publiée et la version de travail (brouillon). Il n'y a pas d'historique, conformément au cahier.
- Toute frappe enregistre automatiquement la version de travail, jamais la version publiée.
- **Publier** (après confirmation) remplace la version publiée par la version de travail :
  - première publication : `publishedAt` est fixée et ne changera plus jamais ;
  - publications suivantes : `lastPublishedAt` (« mis à jour le ») prend la date du jour.
- Le **slug** fait partie de la version de travail. Son unicité est vérifiée à l'enregistrement et à nouveau, dans une transaction, au moment de publier.
- **Images de couverture** : une nouvelle image chargée pendant l'édition n'efface pas celle de la version en ligne. L'ancienne est supprimée du bucket seulement à la publication. Abandonner les modifications supprime l'image du brouillon si elle n'est pas utilisée par la version publiée.

### 3.3 Rôles des couleurs (charte, sans ajout de couleur)

Ratios WCAG 2.1 calculés. Seuils : 4,5 pour le texte normal, 3 pour le grand texte (≥ 24 px, ou ≥ 18,66 px en gras) et pour les éléments non textuels (bordures de champ, icônes porteuses de sens, anneau de focus).

| Usage                                   | Premier plan / fond                                                  | Ratio        | Conforme |
| --------------------------------------- | -------------------------------------------------------------------- | ------------ | -------- |
| Texte courant, titres                   | bleu-gris `#3d405b` sur crème `#f4f1de`                              | 8,87         | oui      |
| Barre latérale                          | texte crème sur fond bleu-gris                                        | 8,87         | oui      |
| Élément actif de la barre latérale      | texte sable `#f2cc8f` sur bleu-gris + filet terracotta (non textuel) | 6,63 / 3,42  | oui      |
| Bouton principal                        | texte crème sur fond bleu-gris                                        | 8,87         | oui      |
| Bouton secondaire                       | texte et bordure bleu-gris sur crème                                  | 8,87         | oui      |
| Bouton destructif (dialogue de confirmation) | texte bleu-gris **gras ≥ 18,66 px** sur fond terracotta `#e07a5f` | 3,42         | oui (grand texte) |
| Badge « Brouillon », « Modifications en attente » | texte bleu-gris sur sable + icône                         | 6,63         | oui      |
| Badge « Publié »                        | texte crème sur bleu-gris + pastille vert sauge `#81b29a`            | 8,87 / 4,21  | oui      |
| Message de succès                       | texte bleu-gris sur crème, filet gauche vert sauge (décoratif) + icône | 8,87       | oui      |
| Message d'erreur                        | texte bleu-gris sur crème, filet gauche terracotta (décoratif) + icône + préfixe « Erreur : » | 8,87 | oui |
| Avertissement (e-mail non validé, GitHub) | texte bleu-gris sur sable                                           | 6,63         | oui      |
| Bordure de champ                        | bleu-gris sur crème                                                   | 8,87         | oui      |
| Champ en erreur                         | bordure bleu-gris de 2 px + message + `aria-invalid` (jamais la couleur seule) | 8,87 | oui    |
| Anneau de focus                         | bleu-gris sur crème ; sable dans la barre latérale                   | 8,87 / 6,63  | oui      |
| Liens                                   | bleu-gris souligné                                                    | 8,87         | oui      |

**Interdits** : texte terracotta, sauge ou sable sur crème (2,60, 2,11 et 1,34) ; texte clair sur terracotta, sauge ou sable ; information portée par la couleur seule. Les variantes transparentes de la palette sont réservées aux séparateurs décoratifs.

### 3.4 Arborescence cible

```
app/
  layout.tsx                    racine minimale : <html lang="fr">, <body>
  (site)/                       site public déplacé (URL inchangées)
    layout.tsx                  metadata, viewport, polices, Header, Footer, JSON-LD, globals.css (E23)
    page.tsx, articles/, projets/, formations/, not-found.tsx
    [...slug]/page.tsx          route fourre-tout : notFound() pour les URL inconnues (E22)
  admin/
    admin.css                   @import "tailwindcss" + @theme (palette)
    layout.tsx                  importe admin.css, noindex
    (auth)/                     pages accessibles sans session
      connexion/  mot-de-passe-oublie/  reinitialiser/  verifier-email/
    (dashboard)/
      layout.tsx                requireSession() + AdminShell (barre latérale)
      page.tsx                  tableau de bord
      articles/  formations/  competences/  profil/  projets/  stack/  compte/
components/admin/               AdminShell, Sidebar, Button, SubmitButton, Field, TextArea,
                                Select, MultiSelect, FileField, Alert, Toast, ConfirmDialog,
                                DataTable, EmptyState, StatusBadge, MarkdownEditor, MarkdownPreview
lib/
  env-schema.ts                 schéma des variables + garde-fous (pur, réutilisable hors Next, E28)
  env.ts                        variables validées pour l'application (server-only)
  db.ts                         client Prisma (singleton, adaptateur pg)
  auth/                         password.ts, password-policy.ts, session.ts, require-session.ts, tokens.ts, rate-limit.ts
  mail/                         transport.ts, templates.ts, send.ts
  storage/                      client.ts, rules.ts, upload.ts, remove.ts
  articles/                     autosave.ts, publish.ts, discard.ts
  github.ts
  validation/                   un fichier par domaine
  slug.ts, cn.ts
prisma/
  schema.prisma, migrations/, seed.ts
scripts/
  setup-storage.ts              création idempotente des buckets
  ts-resolve-hook.mjs           résolution des imports sans extension pour Node (E33)
generated/prisma/              client Prisma généré (ignoré par Git, E29)
test/server-only.ts             remplace `server-only` dans les tests
prisma.config.ts
proxy.ts
vitest.config.mts
.env.example
```

### 3.5 Modèle de données

Modèles et champs en anglais (`camelCase`), tables au pluriel et colonnes en `snake_case` via `@@map` et `@map`. Dates en `timestamptz` (UTC). Pour les tokens et les sessions, seul le **hash SHA-256** est stocké.

| Modèle             | Champs                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Admin`            | id, email (unique), passwordHash, emailVerifiedAt?, createdAt, updatedAt                                                                     |
| `Session`          | id, adminId, tokenHash (unique), expiresAt, lastSeenAt, ipAddress?, userAgent?, createdAt                                                     |
| `AuthToken`        | id, adminId, type (`EMAIL_VERIFICATION`, `PASSWORD_RESET`), tokenHash (unique), targetEmail?, expiresAt, usedAt?, createdAt                  |
| `LoginAttempt`     | id, email, ipAddress, succeeded, createdAt (index email + createdAt et ipAddress + createdAt)                                                  |
| `Article`          | id, slug? (unique : slug **publié**), status (`DRAFT`, `PUBLISHED`), publishedVersionId? (unique), draftVersionId? (unique), publishedAt?, lastPublishedAt?, createdAt, updatedAt |
| `ArticleVersion`   | id, articleId, title, slug, description, category, author, content (Markdown), coverImagePath?, createdAt, updatedAt                          |
| `Education`        | id, title, description, startDate, endDate?, institution, location, honors?, grade? (`Decimal(4,2)`), position                               |
| `Skill`            | id, name, normalizedName (unique : minuscules, sans accents ni espaces superflus)                                                             |
| `Profile`          | id (toujours 1), firstName, lastName, email, jobTitle, bio, about, githubUrl?, linkedinUrl?, photoPath?, cutoutPhotoPath?, resumeUrl?, resumePath? |
| `Project`          | id, slug (unique), title, description, imagePath?, isPublished, date?, position, createdAt, updatedAt                                        |
| `ProjectLink`      | id, projectId, label, url, position                                                                                                          |
| `Technology`       | id, name, normalizedName (unique), iconPath, position                                                                                        |
| `Collaborator`     | id, githubUsername (unique, en minuscules), name?, avatarUrl?, profileUrl?, syncedAt?, syncError?                                             |

Relations plusieurs-à-plusieurs implicites : `Education` ↔ `Skill`, `Project` ↔ `Technology`, `Project` ↔ `Collaborator`. Suppression d'un article ou d'un projet en cascade sur ses versions ou ses liens.

### 3.6 Étapes

Chaque étape liste : **Objectif**, **Fichiers**, **Dépend de**, **Critères de validation**.

---

#### Étape 0 : Arbitrages ✅ terminée

- Décisions intégrées dans `docs/cahier_des_charges.md` (v1.1), `CLAUDE.md` et ce plan.

#### Étape 1 : Hygiène du dépôt et outillage (réalisée, validation en attente)

- **Objectif** : préparer le dépôt sans changer le comportement du site.
- **Fait** : `.gitignore` (`!.env.example`), `.env.example` (placeholders commentés), `.env` créé à partir de l'exemple pour que Taoufik le remplisse (non suivi par Git), scripts `package.json` (`typecheck`, `test`, `db:migrate`, `db:deploy`, `db:reset`, `db:seed`, `db:studio`, `storage:setup`), `AGENTS.md` réduit à un renvoi vers `CLAUDE.md`.
- **Dépend de** : étape 0.
- **Validation** :
  - `git check-ignore .env` répond `.env` ; `git check-ignore .env.example` ne répond rien. ✅
  - `.env.example` ne contient aucune vraie valeur. ✅
  - `pnpm lint`, `pnpm typecheck` et `pnpm build` passent, comme avant. ✅

#### Étape 2 : Séparation site public / admin (réalisée, validation en attente)

- **Objectif** : l'admin a son propre layout et sa propre feuille de style. Les visiteurs voient exactement le même site public.
- **Fichiers** : `app/layout.tsx` réduit, `app/(site)/layout.tsx` (metadata, viewport, Header, Footer, JSON-LD, polices, `globals.css`), déplacement par `git mv` de `page.tsx`, `articles/`, `projets/`, `formations/` et `not-found.tsx` dans `app/(site)/`, `app/(site)/[...slug]/page.tsx` (E22), `app/globals.css` (règle `.site-root`, E23), `app/admin/layout.tsx`, `app/admin/admin.css`, page provisoire `app/admin/page.tsx`, `app/robots.ts` (`/admin` exclu).
- **Dépend de** : étape 1.
- **Validation** :
  - URL publiques inchangées : `/`, `/projets`, `/projets/[slug]`, `/articles`, `/articles/[slug]`, `/formations`, 404, `/sitemap.xml`, `/robots.txt`. ✅ (mêmes codes HTTP ; `sitemap.xml` et `icon.svg` identiques à l'octet ; `robots.txt` : seule la ligne `Disallow: /admin` est ajoutée)
  - Captures avant/après identiques (accueil, page projet, page article, 404), en mobile et en desktop. ✅ (8 sur 8, identiques à l'octet)
  - `/admin` s'affiche sans Header ni Footer publics, fond crème, texte bleu-gris, `noindex`. ✅ (`<meta name="robots" content="noindex, nofollow">`)
  - `git diff -M` ne montre que des renommages pour les fichiers déplacés. ⚠️ 7 sur 8 en renommage pur ; `page.tsx` à 44 % de similarité à cause des 10 imports corrigés (E21).

#### Étape 3 : Prisma et base locale (réalisée, validation en attente)

- **Objectif** : schéma complet et première migration sur la base locale `portfolio`.
- **Fichiers** : `package.json` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `zod`, `server-only`, `vitest`, en versions stables épinglées, plus `vite` et `@types/pg`, E30 ; scripts `postinstall` et `db:generate`, E29), `pnpm-workspace.yaml` (`allowBuilds`), `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/20261106123149_init/`, `lib/env-schema.ts`, `lib/env.ts` (E28), `lib/db.ts`, `vitest.config.mts` (E31), `test/server-only.ts`, `lib/env.test.ts`, `.gitignore` et `eslint.config.mjs` (`generated/`).
- **Dépend de** : étape 1. `DATABASE_URL` rempli dans `.env` par Taoufik.
- **Validation** :
  - `pnpm db:reset` rejoue toutes les migrations sur une base vide sans erreur (critère §10). ✅ (après accord explicite de Taoufik, E32)
  - `pnpm prisma migrate status` : à jour. ✅ (et `prisma migrate diff` : aucun écart entre schéma et base)
  - `lib/env.ts` refuse de démarrer si une variable obligatoire manque, avec un message en français qui nomme la variable sans afficher sa valeur. ✅ (testé sur les 11 variables obligatoires, et vérifié à la main avec la vraie configuration privée de `DATABASE_URL`)
  - Les garde-fous refusent une URL de base non locale et un bucket sans préfixe `dev-` en développement (tests Vitest). ✅ (52 tests ; garde-fou de la CLI Prisma vérifié à part)
  - Tables, index et contraintes d'unicité vérifiés. ✅ par requête SQL en lecture seule (Prisma Studio est une interface interactive, non pilotable par Claude Code) : 16 tables métier, 27 index uniques ou clés primaires, 10 index, 12 clés étrangères, 25 colonnes `timestamptz`, aucune colonne hors `snake_case` hormis `A`/`B` (E27).

#### Étape 4 : Seed du compte administrateur (réalisée, validation en attente)

- **Objectif** : créer le compte unique à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`, et le profil vide (id 1).
- **Fichiers** : `prisma/seed.ts`, `lib/auth/password.ts` (argon2id via `@node-rs/argon2` 2.2.2), `lib/auth/password-policy.ts`, `lib/env-schema.ts` (`parseSeedEnv`), `scripts/ts-resolve-hook.mjs`, `prisma.config.ts` (commande de seed), `package.json`, tests `lib/auth/password.test.ts` et `lib/seed-env.test.ts` (E33, E34).
- **Dépend de** : étape 3.
- **Validation** :
  - Premier lancement : administrateur créé, mot de passe stocké uniquement sous forme de hash. ✅ (une ligne dans `admins`, hash `$argon2id$v=19$m=19456,t=2,p=1$…` qui vérifie le mot de passe de `.env` et ne le contient pas ; profil id 1 aux champs vides)
  - Second lancement : aucun doublon, mot de passe existant **non écrasé**, message clair. ✅ (état de la base identique, `updated_at` inchangé ; « Compte administrateur déjà présent pour ADMIN_EMAIL : aucun compte créé, mot de passe existant conservé. »)
  - Rien de sensible dans la console (ni mot de passe, ni hash). ✅ (journaux des deux lancements vérifiés : ni mot de passe, ni hash, ni adresse)
  - Mot de passe de moins de 12 caractères refusé. ✅ (tests Vitest ; `pnpm db:seed` avec un mot de passe factice de 11 caractères : sortie 1 avant toute connexion, base inchangée)
  - Non vérifié de bout en bout : la création refusée sur base **vide** (mot de passe court ou absent), qui demanderait un `pnpm db:reset`. La validation a lieu avant toute requête : le comportement est le même que sur la base remplie.

#### Étape 5 : Fondations de l'interface d'administration

- **Objectif** : coque avec **barre latérale** et composants accessibles, réutilisés par toutes les sections.
- **Barre latérale** : fixe et toujours visible à partir de 1024 px ; en dessous, panneau latéral ouvert par un bouton « Menu » (focus piégé dans le panneau, fermeture par Échap ou par le bouton, focus rendu au déclencheur). Page courante signalée par `aria-current="page"`.
- **Fichiers** : `components/admin/*` (voir §3.4), `lib/cn.ts`, tokens de couleur dans `app/admin/admin.css`.
- **Dépend de** : étape 2.
- **Validation** :
  - Page de démonstration temporaire parcourue **uniquement au clavier** : ordre de tabulation logique, focus toujours visible, dialogue fermé par Échap.
  - Rendu vérifié à 360, 768, 1024 et 1440 px de large.
  - Chaque couple de couleurs utilisé figure dans le tableau §3.3.
  - Lighthouse Accessibilité ≥ 95 sur la page de démonstration.

#### Étape 6 : Module e-mail

- **Objectif** : envoi selon `APP_ENV`.
- **Fichiers** : `lib/mail/transport.ts` (Nodemailer, `smtp.gmail.com:587` en STARTTLS), `lib/mail/templates.ts` (validation d'adresse, réinitialisation, notification à l'ancienne adresse ; texte brut + HTML simple, en français), `lib/mail/send.ts`.
- **Dépend de** : étape 3.
- **Validation** :
  - En `development` : aucune connexion SMTP, lien complet affiché dans la console.
  - En `production` : test manuel ponctuel, e-mail reçu et lisible (Gmail mobile et desktop).
  - Aucun identifiant SMTP dans les journaux.

#### Étape 7 : Authentification et protection des routes

- **Objectif** : connexion, déconnexion, sessions, anti brute-force.
- **Décisions** : sessions en base, cookie contenant un jeton aléatoire signé avec `SESSION_SECRET` (seul son hash est stocké) ; durée 7 jours glissants, 30 jours au maximum ; `httpOnly`, `secure` en production, `sameSite=strict`, `path=/admin`. Anti brute-force : 5 échecs en 15 minutes par adresse ou par IP, puis blocage de 15 minutes ; tentatives purgées après 30 jours.
- **Fichiers** : `lib/auth/session.ts`, `lib/auth/require-session.ts`, `lib/auth/rate-limit.ts`, `proxy.ts` (redirection vers `/admin/connexion` si le cookie est absent ou mal signé), `app/admin/(auth)/connexion/`, `app/admin/(dashboard)/layout.tsx`, action de déconnexion, `lib/validation/auth.ts`.
- **Dépend de** : étapes 4 et 5.
- **Validation** :
  - Sans session, toute URL `/admin/**` hors pages de connexion redirige vers `/admin/connexion`, y compris en requête directe (`curl -i`).
  - Une Server Action appelée sans session valide est refusée, même si le proxy est contourné.
  - Cookie : `HttpOnly`, `SameSite=Strict`, `Secure` en production.
  - Au 6e échec, refus pendant 15 minutes, avec un message neutre qui ne révèle pas si l'adresse existe.
  - Déconnexion : session supprimée en base, cookie effacé.
  - Session expirée ou révoquée : retour à la connexion.
  - Tests Vitest sur les sessions et la limitation des tentatives.

#### Étape 8 : Validation d'e-mail, réinitialisation, compte

- **Objectif** : parcours par lien et section « Compte ».
- **Décisions** : lien de validation valable 24 h, lien de réinitialisation valable 1 h, usage unique. Un administrateur dont l'adresse n'est pas validée peut se connecter, avec une bannière persistante et un bouton « Renvoyer le lien ». Une nouvelle adresse n'est prise en compte qu'après clic sur le lien, et l'ancienne adresse reçoit une notification.
- **Fichiers** : `lib/auth/tokens.ts`, `app/admin/(auth)/mot-de-passe-oublie/`, `reinitialiser/`, `verifier-email/`, `app/admin/(dashboard)/compte/`.
- **Dépend de** : étapes 6 et 7.
- **Validation** :
  - Lien utilisable une seule fois, refusé après expiration ou s'il est modifié.
  - « Mot de passe oublié » affiche le même message, que l'adresse existe ou non.
  - Après réinitialisation ou changement de mot de passe, toutes les autres sessions sont révoquées.
  - Changer le mot de passe exige le mot de passe actuel.
  - Parcours complet testé en `development` (liens dans la console).

#### Étape 9 : Compétences et formations

- **Objectif** : premier CRUD complet, qui fixe les conventions des suivants.
- **Fichiers** : `app/admin/(dashboard)/competences/`, `app/admin/(dashboard)/formations/`, `lib/validation/education.ts`, `lib/validation/skill.ts`.
- **Décisions** : dates au mois près (`<input type="month">`, stockées au 1er du mois en UTC). Ordre modifiable par boutons « Monter » et « Descendre » (pas seulement par glisser-déposer).
- **Dépend de** : étapes 5 et 7.
- **Validation** :
  - Une compétence partagée entre deux formations est créée et liée (critère §10).
  - Doublon refusé même avec une casse, des accents ou des espaces différents.
  - Suppression d'une compétence utilisée : bloquée, puis possible après une confirmation qui liste les formations concernées et détache les liens.
  - Date de fin facultative ; date de fin antérieure au début refusée ; moyenne entre 0 et 20.
  - Mêmes erreurs avec JavaScript désactivé (validation serveur).

#### Étape 10 : Supabase Storage (en ligne)

- **Objectif** : service d'upload sécurisé.
- **Décisions** :
  - Buckets en lecture publique, écriture réservée au serveur. Production : `articles`, `projets`, `profil`, `stack`. Développement : `dev-articles`, `dev-projets`, `dev-profil`, `dev-stack`.
  - Tailles maximales : 5 Mo (PNG, JPG, WebP), 1 Mo (SVG), 5 Mo (PDF).
  - SVG contenant un script, un attribut `on*`, un `<foreignObject>` ou une référence externe : **refusé** avec un message explicite.
  - Nom de fichier généré : `<uuid>.<extension>`.
- **Fichiers** : `lib/storage/*`, `scripts/setup-storage.ts` (création idempotente des buckets nommés dans `.env` ; lancé par `node --env-file=.env`, donc **imports relatifs avec extension `.ts`, sans alias `@/`**, voir E24), `components/admin/FileField.tsx`, `package.json` (`@supabase/supabase-js`, `file-type`).
- **Dépend de** : étape 7. `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` remplis dans `.env`.
- **Validation** :
  - `pnpm storage:setup` crée les quatre buckets `dev-*`, et un second lancement ne change rien.
  - Image valide : présente dans le bucket, renommée, URL publique accessible.
  - Faux PNG (autre contenu renommé), fichier trop lourd, SVG avec script : refusés avant écriture.
  - `SUPABASE_SERVICE_ROLE_KEY` absente de tout fichier envoyé au navigateur (recherche dans `.next/static` après build).
  - Aucun fichier écrit dans un bucket sans préfixe `dev-` en développement.

#### Étape 11 : Stack technique

- **Fichiers** : `app/admin/(dashboard)/stack/`, `lib/validation/technology.ts`.
- **Dépend de** : étapes 9 et 10.
- **Validation** : création avec icône (PNG, WebP ou SVG) ; nom unique (même règle que les compétences) ; remplacement de l'icône qui supprime l'ancien fichier ; ordre modifiable ; suppression bloquée si la technologie est utilisée, sauf confirmation explicite.

#### Étape 12 : Profil

- **Fichiers** : `app/admin/(dashboard)/profil/`, `lib/validation/profile.ts`.
- **Dépend de** : étape 10.
- **Validation** : un seul enregistrement, jamais dupliqué ; photo et photo détourée uploadées (transparence du PNG conservée) ; CV par lien externe **ou** PDF uploadé, au choix ; URL GitHub et LinkedIn validées (`https://` ajouté si absent).

#### Étape 13 : Projets et collaborateurs

- **Fichiers** : `app/admin/(dashboard)/projets/`, `lib/github.ts` (`GET https://api.github.com/users/{username}`, `GITHUB_TOKEN` facultatif, délai d'attente de 5 s, `User-Agent` générique), `lib/validation/project.ts`.
- **Décisions** : modifications d'un projet enregistrées par bouton (pas d'autosave). Passage de « non publié » à « publié », ou l'inverse, soumis à confirmation.
- **Dépend de** : étapes 10 et 11.
- **Validation** :
  - Un projet peut avoir des technologies, plusieurs liens ordonnés et des collaborateurs (critère §10).
  - Collaborateur valide : nom et avatar récupérés.
  - Utilisateur introuvable, ou limite d'API simulée : collaborateur enregistré avec le seul nom d'utilisateur, avertissement visible, bouton « Relancer la récupération » fonctionnel.
  - Slug généré depuis le titre, modifiable, unique.
  - Nom d'utilisateur GitHub validé (39 caractères maximum, lettres, chiffres et tirets).

#### Étape 14 : Articles

- **Objectif** : éditeur Markdown avec aperçu côte à côte, cycle de vie du §3.2.
- **Décisions** :
  - Éditeur : zone de texte native avec une petite barre d'outils (gras, italique, titre, lien, code, liste). Aperçu avec `react-markdown`, `remark-gfm`, `rehype-sanitize` et `rehype-highlight`. Sur mobile, onglets « Écrire » et « Aperçu ».
  - Autosave 1,5 s après la dernière frappe, et à la sortie du champ.
  - Catégorie en texte libre, avec suggestions tirées des catégories existantes. Auteur prérempli avec le nom du profil.
  - Suppression définitive après confirmation, images comprises.
  - Images dans le corps de l'article : hors phase 1 (couverture uniquement, conformément au cahier).
- **Fichiers** : `app/admin/(dashboard)/articles/`, `components/admin/MarkdownEditor.tsx`, `components/admin/MarkdownPreview.tsx` (réutilisable en phase 2), `lib/articles/*`, `lib/validation/article.ts`.
- **Dépend de** : étapes 5, 7 et 10.
- **Validation** :
  - Article créé, sauvegardé automatiquement en brouillon pendant la frappe, retrouvé après fermeture du navigateur et nouvelle connexion (critère §10). Indicateur « Enregistré à hh:mm » annoncé sans submerger les lecteurs d'écran.
  - Modifier un article publié ne change pas la version en ligne tant que « Publier » n'est pas confirmé.
  - Première publication : `publishedAt` fixée ; republications : `publishedAt` inchangée, `lastPublishedAt` mise à jour.
  - « Abandonner les modifications » restaure la version publiée dans l'éditeur.
  - Slug déjà pris refusé, y compris si un autre article l'utilise dans son brouillon.
  - Le HTML et les scripts du Markdown ne s'exécutent pas dans l'aperçu.
  - Deux onglets sur le même article : avertissement en cas de conflit, pas de perte silencieuse.
  - Règles de gestion couvertes par des tests Vitest (publication, abandon, dates, slug).

#### Étape 15 : Tableau de bord

- **Fichiers** : `app/admin/(dashboard)/page.tsx`.
- **Dépend de** : étapes 9 à 14.
- **Validation** : brouillons et modifications en attente listés (les plus récents d'abord) avec un lien pour les reprendre ; compteurs par section ; accès rapides ; bannière si l'adresse e-mail n'est pas validée ; état vide propre sur une base neuve.

#### Étape 16 : Recette et documentation

- **Fichiers** : `docs/recette_phase1.md`, `CLAUDE.md`, `README.md`, `docs/cahier_des_charges.md`.
- **Dépend de** : toutes les étapes.
- **Validation** :
  - `pnpm db:reset`, seed, puis parcours complet de chaque critère §10.
  - Parcours clavier complet et test sur un vrai mobile.
  - `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build` sans erreur.
  - Recherche de secrets dans l'historique Git : aucun résultat.

#### Étape 17 (sur demande explicite) : préparation de la production

- Variables Vercel, `pnpm storage:setup` avec les noms de production, `prisma migrate deploy` (`DIRECT_URL` en connexion directe, `DATABASE_URL` sur le pooler Supabase), test SMTP réel.
- Liste de contrôle relue par Taoufik avant toute action sur Supabase Database ou Vercel.

### 3.7 Graphe des dépendances

```
0 → 1 ─┬─ 2 → 5 ──────┐
       └─ 3 ─┬─ 4 ────┴→ 7 ─┬─ 8
             └─ 6 ──────────┘
                     7 → 9 → 10 ─┬─ 11 → 13 ─┐
                                 ├─ 12 ──────┼→ 15 → 16 → (17)
                                 └─ 14 ──────┘
```

### 3.8 Dépendances npm prévues

Installées étape par étape, en version stable épinglée.

| Paquet                                                                | Étape | Rôle                                         |
| --------------------------------------------------------------------- | ----- | -------------------------------------------- |
| `zod`, `server-only`                                                  | 3     | Validation partagée, isolation serveur        |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`                | 3     | ORM, migrations, adaptateur PostgreSQL        |
| `vitest`, `vite` (pair obligatoire, E30)                              | 3     | Tests de la logique serveur                   |
| `@types/pg`                                                           | 3     | Types de `pg`                                 |
| `@node-rs/argon2`                                                     | 4     | Hachage argon2id                              |
| `nodemailer`, `@types/nodemailer`                                     | 6     | SMTP                                          |
| `@supabase/supabase-js`, `file-type`                                  | 10    | Stockage, détection du type réel              |
| `react-markdown`, `remark-gfm`, `rehype-sanitize`, `rehype-highlight` | 14    | Aperçu Markdown sûr                           |

Aucune bibliothèque d'authentification tierce : un seul compte, et le cahier impose des comportements précis.

---

## 4. Points en attente

- **Remplir `.env`** (créé à partir de `.env.example`) :
  - avant l'étape 3 : `DATABASE_URL` et `DIRECT_URL` (base locale), `SESSION_SECRET` ;
  - avant l'étape 4 : `ADMIN_EMAIL` et `ADMIN_PASSWORD` ;
  - avant l'étape 10 : `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
- **Base locale** : si la base `portfolio` n'existe pas encore, `pnpm db:migrate` la créera (l'utilisateur doit avoir le droit `CREATEDB`).
- **Mise en production** : date à fixer par Taoufik ; rien n'est fait sur Supabase Database ni sur Vercel sans demande explicite.
