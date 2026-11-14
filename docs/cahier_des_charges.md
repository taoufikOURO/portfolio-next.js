# Cahier des charges : refonte du portfolio

Auteur : Taoufik OURO-BANG'NA
Périmètre de cette version : **phase 1, interface d'administration**. La partie visible du site est traitée en phase 2.

| Version | Date            | Changement                                                                                         |
| ------- | --------------- | -------------------------------------------------------------------------------------------------- |
| 1       | 6 novembre 2026 | Version validée en entretien                                                                       |
| 1.1     | 6 novembre 2026 | Décisions prises après l'état des lieux (voir §12) : schéma en anglais, brouillon pour toute modification d'article, barre latérale, Supabase Storage en ligne, rôles des couleurs, points ouverts tranchés |
| 1.2     | 6 novembre 2026 | Stockage de développement précisé (même projet Supabase que la production, buckets `dev-*`), mention de la CLI Supabase retirée, couleurs Tailwind par défaut bloquées dans l'admin |
| 1.3     | 7 novembre 2026 | Étape 8 : changer l'adresse e-mail exige le mot de passe actuel (proposition appliquée, à valider par Taoufik) |
| 1.4     | 7 novembre 2026 | Mot de passe actuel exigé pour changer d'adresse : validé par Taoufik avec l'étape 8 |
| 1.5     | 13 novembre 2026 | §3.3 Articles : champs exigés pour publier et image de couverture envoyée à part (E55), décisions E57 : avertissement de sortie avec modifications non enregistrées, création en deux temps, slug refusé avec enregistrement des autres champs, description à 500 caractères, abandon sans JavaScript par une page de confirmation. Acceptés par Taoufik avec l'étape 14 |
| 1.6     | 13 novembre 2026 | §5 : navigation en barre horizontale (pilule) et nouvelle **charte visuelle de l'admin** (§5.1, décision E60 du plan, étape 18) ; palette précédente conservée pour référence, à réviser en phase 2. Tableau de bord : publications par mois, répartition du contenu, projets récents. Comportement, routes, validations et base inchangés. **Validée par Taoufik le 14 novembre 2026 (étape 18)** |
| 1.7     | 14 novembre 2026 | §5.1 (E61 du plan, étape 18) : logo retiré de l'admin, sans substitut ; bordure des champs et des listes `#8a8d93` (décision de Taoufik) ; règles de mouvement (motion design). Comportement, routes, validations et base inchangés. **Validée par Taoufik le 14 novembre 2026 (étape 18)** |

Plan de réalisation : `docs/plan_implementation.md`.

---

## 1. Objectif

Remplacer le portfolio actuel, qui s'appuie sur des fichiers JSON et Markdown versionnés dans `data/`, par une application Next.js avec base de données et interface d'administration. Les contenus sont gérés depuis le navigateur, sans modifier de fichiers à la main.

## 2. État actuel (à titre de référence)

- Site Next.js + Tailwind CSS, hébergé sur Vercel (`taoufikouro.vercel.app`, le domaine `taoufikouro.dev` est en cours de renouvellement).
- Contenus gérés par fichiers statiques dans `data/` :
  - `articles/*.md` et un JSON d'index (id, titre, description, auteur, date, slug, catégorie, image, chemin du fichier Markdown).
  - Formations (intitulé, description, dates, établissement, lieu, mention, moyenne, compétences).
  - Profil (identité, bio, à propos, liens GitHub et LinkedIn, photos, lien CV).
  - Projets (titre, description, lien, dépôt GitHub, image, stack, statut de publication).
  - Stack (nom, icône).
  - FAQ et services : présents mais **hors périmètre** pour la phase 1.
- **Décision : repartir de zéro.** Les données existantes ne sont pas importées. La base est remplie à la main depuis l'admin.
- Pendant la phase 1, le site public continue de lire `data/` : ces fichiers ne sont supprimés qu'en phase 2.

## 3. Périmètre phase 1 : administration

### 3.1 Authentification

- **Un seul compte administrateur**, celui de Taoufik. Il est créé par un script de seed à partir de variables d'environnement. Pas d'inscription publique. Le seed n'écrase jamais un compte existant.
- Connexion par **e-mail + mot de passe** (12 caractères minimum).
- Mot de passe stocké uniquement sous forme de hash (**argon2id**).
- **Validation de l'adresse e-mail** : lien envoyé après création ou changement d'adresse, valable 24 h.
  - Un compte dont l'adresse n'est pas validée peut se connecter, avec une bannière persistante et un bouton « Renvoyer le lien ».
  - Une nouvelle adresse n'est prise en compte qu'après clic sur le lien. L'ancienne adresse reçoit une notification.
  - Changer d'adresse exige le mot de passe actuel (validé par Taoufik avec l'étape 8).
- **Réinitialisation du mot de passe** par lien envoyé par e-mail, à usage unique, valable 1 h. Le message affiché est le même que l'adresse existe ou non.
- Après une réinitialisation ou un changement de mot de passe, toutes les autres sessions sont révoquées. Changer son mot de passe exige le mot de passe actuel.
- **Pas de 2FA** pour l'instant.
- **Sessions stockées en base**, cookie `httpOnly`, `secure` en production, `sameSite` strict. Durée : 7 jours glissants, 30 jours au maximum.
- Protection des routes `/admin` côté serveur : `proxy.ts` (nom du middleware depuis Next.js 16) pour une redirection rapide, **et** vérification de la session dans chaque layout, page et action serveur.
- Limitation des tentatives de connexion : 5 échecs en 15 minutes par adresse ou par IP, puis blocage de 15 minutes. Tentatives enregistrées en base, purgées après 30 jours.

### 3.2 Gestion des e-mails

- Envoi via **SMTP Gmail** (`smtp.gmail.com`, port 587, STARTTLS) avec un **mot de passe d'application** (la validation en deux étapes est déjà activée sur le compte).
- Variable `APP_ENV` :
  - `development` : aucun e-mail envoyé. Le lien complet est affiché dans la console du serveur.
  - `production` : envoi réel via SMTP.
- Modèles d'e-mails en français : validation d'adresse, réinitialisation du mot de passe, notification de changement d'adresse.

### 3.3 Articles (blog)

- Édition en **Markdown avec aperçu côte à côte** (zone de saisie à gauche, rendu à droite ; onglets « Écrire » et « Aperçu » sur mobile).
- **Sauvegarde automatique pendant la frappe**, toujours dans un brouillon.
- **Statuts** : brouillon, publié.
- **Un article n'est mis en ligne que par le bouton « Publier », suivi d'une confirmation.** Aucune autre action ne modifie le site public.
- **Modifier un article publié crée un brouillon de modifications.** La version en ligne reste visible et inchangée jusqu'à la publication. Le brouillon peut aussi être abandonné (avec confirmation) : l'éditeur revient alors à la version en ligne.
- Un article a au plus deux versions : la version publiée et le brouillon. Il n'y a pas d'historique.
- Un brouillon peut être conservé indéfiniment. Il est repris à la prochaine connexion.
- **Dates** :
  - `publishedAt` (« publié le ») : fixée à la première publication, jamais modifiée ensuite.
  - `lastPublishedAt` (« mis à jour le ») : mise à jour à chaque nouvelle publication d'un article déjà publié.
- Champs : titre, slug (généré et modifiable, unique), description, catégorie (texte libre avec suggestions), auteur (prérempli avec le nom du profil), image de couverture, contenu Markdown, statut, dates.
- Image de couverture uploadée vers Supabase Storage. L'image de la version en ligne n'est remplacée qu'à la publication.
- **Champs exigés pour publier** : « Publier » est refusé si le titre, le slug ou le contenu de la version de travail est vide. Les erreurs sont liées aux champs, avec le même message avec et sans JavaScript.
- **Image de couverture envoyée à part** : le fichier est envoyé dès qu'il est choisi, dans un formulaire séparé de l'éditeur (même principe que la photo du profil) ; son chemin est ensuite enregistré dans la version de travail. La sauvegarde automatique ne renvoie jamais le fichier. Une couverture remplacée pendant l'édition : l'ancienne image, si elle n'appartient pas à la version publiée, est supprimée dès que la nouvelle est enregistrée ; celle de la version publiée n'est supprimée qu'à la publication.
- **Avertissement de sortie** : tant qu'un enregistrement est en attente (frappe pas encore envoyée, envoi en cours, y compris celui de la couverture) ou n'a pas abouti (échec, refus, conflit), l'éditeur affiche l'avertissement du navigateur à la fermeture ou à la sortie de la page. Il ne s'affiche pas après un enregistrement réussi. Aucune sauvegarde hors ligne.
- **Création en deux temps** : la page de création ne demande que le titre (obligatoire) ; le slug (proposé à partir du titre, suffixé `-2`, `-3`… s'il est déjà pris) et l'auteur (prénom et nom du profil) en sont tirés, puis l'éditeur s'ouvre. Fonctionne sans JavaScript.
- **Slug refusé, autres champs enregistrés** : un slug non conforme ou déjà pris est refusé, avec un message sous le champ, mais les autres champs sont enregistrés (le brouillon garde son slug précédent), pour ne pas bloquer la sauvegarde automatique du texte.
- **Description** : 500 caractères au plus.
- **Abandon du brouillon sans JavaScript** : avec JavaScript, l'abandon passe par un dialogue de confirmation ; sans JavaScript, par une page de confirmation dédiée (`[id]/abandonner`).
- Suppression d'un article : définitive, après confirmation, images comprises.
- Images dans le corps de l'article : hors phase 1.

### 3.4 Formations et compétences

- Liste des formations : intitulé, description, date de début, date de fin (facultative), établissement, lieu, mention (facultative), moyenne sur 20 (facultative), ordre d'affichage.
- Dates saisies au mois près (mois et année).
- Liste des compétences gérée séparément : nom unique, sans tenir compte de la casse, des accents ni des espaces superflus.
- **Relation plusieurs-à-plusieurs** : une formation possède plusieurs compétences, et une même compétence peut être rattachée à plusieurs formations.
- Une compétence ne peut pas être supprimée si elle est utilisée, sauf confirmation explicite qui détache les liens.

### 3.5 Profil

Un seul enregistrement (profil unique) :

- Nom, prénom, e-mail, titre professionnel, bio (courte), à propos (longue).
- Liens : GitHub, LinkedIn.
- Photo et photo détourée : Supabase Storage.
- CV : lien externe **ou** PDF uploadé, au choix.

### 3.6 Stack technique

- Liste des technologies : nom unique, icône uploadée depuis l'admin vers Supabase Storage, ordre d'affichage.
- Une technologie peut être rattachée à plusieurs projets, et un projet peut en avoir plusieurs.
- Suppression bloquée si la technologie est utilisée, sauf confirmation explicite.

### 3.7 Projets

- Champs : titre, slug, description, statut de publication, image, liens ordonnés (ex. « Code source » vers GitHub, « Démo » vers un site), date facultative, ordre d'affichage.
- Modifications enregistrées par bouton. Le changement de statut de publication demande une confirmation.
- **Relation avec la stack** : plusieurs-à-plusieurs.
- **Collaborateurs** : plusieurs-à-plusieurs avec les projets.
  - Saisie du **nom d'utilisateur GitHub** uniquement.
  - Le nom affiché et l'avatar sont récupérés automatiquement via l'API GitHub (`GET https://api.github.com/users/{username}`).
  - En cas d'échec (utilisateur introuvable, limite d'API), le collaborateur est enregistré avec le nom d'utilisateur et un message d'avertissement. Un bouton permet de relancer la récupération.

### 3.8 Stockage des fichiers (Supabase Storage)

Supabase Storage est utilisé **en ligne**, en développement comme en production, dans le **même projet Supabase**. Le développement n'écrit que dans des buckets préfixés `dev-`. Seul le stockage est concerné : la base de données Supabase n'est jamais utilisée en développement.

| Usage                      | Production | Développement   |
| -------------------------- | ---------- | --------------- |
| Images de couverture       | `articles` | `dev-articles`  |
| Images des projets         | `projets`  | `dev-projets`   |
| Photos du profil, CV       | `profil`   | `dev-profil`    |
| Icônes des technologies    | `stack`    | `dev-stack`     |

Règles :

- Buckets en lecture publique, écriture réservée au serveur.
- En développement, l'application refuse de démarrer si un nom de bucket ne commence pas par `dev-`.
- Les buckets sont créés par un script idempotent (`pnpm storage:setup`).
- Types autorisés et tailles maximales : PNG, JPG, WebP, SVG pour les icônes et PDF pour le CV, **1 Mo au maximum chacun** (limite des Server Actions de Next.js, voir E52 du plan).
- Vérification du type réel du fichier côté serveur, pas seulement de l'extension.
- SVG contenant un script, un gestionnaire d'événement, un `<foreignObject>` ou une référence externe : refusé.
- Nom de fichier généré (pas de nom d'origine conservé tel quel).
- Le remplacement d'une image supprime l'ancien fichier.

## 4. Modèle de données

Modèles et champs en **anglais**. Tables et colonnes en `snake_case`. Dates stockées en UTC, affichées dans le fuseau de l'utilisateur. Pour les tokens et les sessions, seul un hash est stocké.

| Modèle           | Champs principaux                                                                                                   | Relations                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Admin`          | id, email (unique), passwordHash, emailVerifiedAt                                                                   | → Session, → AuthToken                                        |
| `Session`        | id, tokenHash (unique), expiresAt, lastSeenAt, ipAddress, userAgent                                                 | → Admin                                                        |
| `AuthToken`      | id, type (`EMAIL_VERIFICATION`, `PASSWORD_RESET`), tokenHash, targetEmail, expiresAt, usedAt                        | → Admin                                                        |
| `LoginAttempt`   | id, email, ipAddress, succeeded, createdAt                                                                          | —                                                              |
| `Article`        | id, slug (publié, unique), status (`DRAFT`, `PUBLISHED`), publishedAt, lastPublishedAt, createdAt, updatedAt      | → ArticleVersion publiée (0-1), → ArticleVersion brouillon (0-1) |
| `ArticleVersion` | id, title, slug, description, category, author, content (Markdown), coverImagePath                                  | → Article                                                      |
| `Education`      | id, title, description, startDate, endDate, institution, location, honors, grade, position                         | → Skill (N-N)                                                  |
| `Skill`          | id, name, normalizedName (unique)                                                                                   | → Education (N-N)                                              |
| `Profile`        | id (unique), firstName, lastName, email, jobTitle, bio, about, githubUrl, linkedinUrl, photoPath, cutoutPhotoPath, resumeUrl, resumePath | —                                         |
| `Project`        | id, slug (unique), title, description, imagePath, isPublished, date, position                                      | → Technology (N-N), → Collaborator (N-N), → ProjectLink (1-N) |
| `ProjectLink`    | id, label, url, position                                                                                            | → Project                                                      |
| `Technology`     | id, name, normalizedName (unique), iconPath, position                                                               | → Project (N-N)                                                |
| `Collaborator`   | id, githubUsername (unique), name, avatarUrl, profileUrl, syncedAt, syncError                                       | → Project (N-N)                                                |

Les fichiers sont référencés par leur **chemin** dans le bucket ; l'URL publique est calculée à l'affichage.

## 5. Interface d'administration

- URL : `/admin`, connexion sur `/admin/connexion`. Pages exclues de l'indexation par les moteurs de recherche.
- **Barre de navigation** horizontale en pilule blanche (étape 18, E60), sans logo (E61) : elle commence par les liens, visibles à partir de 1280 px, avec le menu du compte (avatar, adresse, « Voir le site », « Se déconnecter ») ; en dessous, panneau modal ouvert par un bouton « Menu » (même comportement que l'ancienne barre latérale : focus piégé, Échap, focus rendu au bouton).
- **Responsive** : mobile, tablette, desktop.
- **Accessible** : navigation au clavier, labels sur tous les champs, contrastes WCAG AA, messages d'erreur liés aux champs, information jamais portée par la couleur seule.
- **Contrôles stricts** :
  - validation des formulaires côté client et côté serveur avec le même schéma ;
  - confirmation avant toute suppression et toute publication ;
  - messages d'erreur et de succès clairs ;
  - état « enregistrement en cours » sur chaque action.
- Sections : tableau de bord (accès rapide, complétude du profil, chiffres du contenu, articles publiés par mois sur six mois, répartition du contenu, brouillons et modifications en attente, projets récents), articles, formations, compétences, profil, projets, stack, paramètres du compte (changer e-mail et mot de passe).
- Design : charte visuelle de l'admin ci-dessous (§5.1), reprise dans `CLAUDE.md`.

### 5.1 Charte visuelle de l'admin (version 1.7, étape 18, E60 et E61)

Référence : capture d'un tableau de bord fournie par Taoufik (non versionnée). Seule l'apparence en est reprise : chaque bloc affiche une donnée réelle du projet, aucun chiffre inventé. Couleurs relevées sur la capture, puis ajustées pour le contraste WCAG AA (texte ≥ 4,5, éléments non textuels ≥ 3).

| Rôle | Couleur | Remarque |
| ---- | ------- | -------- |
| Fond hors panneau | `#e7ebee` | relevé sur la capture |
| Cadre autour de la barre et du panneau | `#f2f3f7` | relevé |
| Panneau, barre de navigation, champs | `#ffffff` | |
| Cartes | `#f6f6f6` | relevé |
| Texte principal, boutons principaux, barres, lien actif, anneau de focus | `#0f0f12` | 19,14 sur le panneau |
| Texte secondaire | `#5f636a` | `#6b6f76` de départ foncé (4,21 sur le fond, échec) : 5,03 sur le fond, 6,04 sur le panneau |
| Bordures des champs de saisie et des listes déroulantes | `#8a8d93` | décision de Taoufik (14 novembre 2026) : 3,33 sur le blanc du champ, 3,08 sur la carte |
| Bordures des cartes et des tableaux, séparateurs | `#e2e2e5` | |
| Badge « Complet », fond des avertissements | `#b8f25c`, `#ecfad3` | texte noir (14,48 et 17,48) |
| Bouton destructif, badge « Incomplet » | `#f2725f` (survol `#ee5f4a`) | texte noir (6,70) ; jamais de texte blanc (2,86) |
| Texte et bordure d'erreur | `#b42318` | le corail échoue en texte (2,86) : 6,57 sur le panneau |
| Statut « Publié » | texte `#137a3e` sur `#d9f5e3` | 4,67 |
| Statut « Brouillon », « Non publié » | texte `#2a4bd7` sur `#dde6ff` | 5,46 |
| Statut « Modifications en attente », « Non validée » | texte `#b42318` sur `#fde3df` | 5,39 |
| Graphiques | hachures `#d6d6da`, gris `#b6b6ba` et `#d3d3d6` | décoratifs ; les valeurs sont toujours écrites |

- **Police** : Outfit (Google Fonts, servie par `next/font`, aucune dépendance ajoutée). **Icônes** : `lucide-react`, trait fin (1,5).
- **Formes** : boutons et pilules en `rounded-full` (44 px de haut au minimum), champs 14 px, alertes 16 px, dialogues 24 px, cartes 26 px, panneau 32 px.
- **Logo** : aucun dans l'admin (E61) ; ni lettre « T », ni texte de marque, ni substitut. Les pages sans session montrent le seul panneau, centré. Le favicon n'est pas concerné.
- **Composants** : bouton principal noir, secondaire à bordure noire fine, destructif corail ; champ blanc à bordure grise `#8a8d93`, focus en anneau noir de 2 px décalé ; une seule forme de pilule de statut ; tableau à en-tête gris clair et lignes de 64 px ; alertes à fond teinté avec icône dans une pastille blanche et libellé en gras ; dialogues blancs sur voile noir à 40 % ; états vides et pages 404 et erreur avec icône dans une pastille ; squelettes de chargement aux formes du contenu.
- **Mouvement** (E61) : seules la position, l'échelle, l'opacité (et le tracé de l'anneau) sont animées ; entrées seulement, contenu lisible à l'état final même sans JavaScript ; 600 ms au plus, sauf le tracé de l'anneau (800 ms) ; aucune boucle sauf le balayage des squelettes. Entrée de page en fondu avec glissement de 8 px (250 ms) ; cartes du tableau de bord décalées de 60 ms (300 ms) ; barres du graphique montant depuis la base (600 ms, 50 ms d'écart) ; anneau tracé en 800 ms ; indicateur du lien actif qui glisse vers le lien survolé (250 ms) ; boutons soulevés de 1 px au survol et à l'échelle 0,98 au clic (150 ms) ; contour et anneau de focus des champs en 150 ms ; alertes en fondu avec glissement de 8 px (250 ms) ; dialogues : voile en fondu et panneau de 0,96 à 1 (200 ms) ; panneau mobile et menu du compte en glissement et fondu (200 ms) ; squelettes à balayage lumineux lent (1,6 s) ; lignes de tableau en fondu décalé de 30 ms (10 lignes au plus) ; pastilles de statut sans animation. **Sous `prefers-reduced-motion: reduce`** : aucun déplacement ni échelle, aucune animation, graphiques dans leur état final, squelettes statiques.
- **Inchangé** : information jamais portée par la couleur seule (libellés en toutes lettres, préfixes « Erreur : », « Succès : »), liens d'évitement, focus visible, cibles de 44 px.
- **Palette précédente** (crème `#f4f1de`, terracotta `#e07a5f`, bleu-gris foncé `#3d405b`, vert sauge `#81b29a`, sable `#f2cc8f`) : **précédente, à réviser en phase 2** (site public).

## 6. Environnements

| Variable                          | Rôle                                                                     | Exemple (placeholder)                                   |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `APP_ENV`                       | `development` ou `production`                                          | `development`                                         |
| `APP_URL`                       | URL publique de l'application (liens des e-mails)                       | `http://localhost:3000`                               |
| `NEXT_PUBLIC_SITE_URL`          | URL utilisée par le site public existant (fusion avec `APP_URL` en phase 2) | `http://localhost:3000`                            |
| `DATABASE_URL`                  | Connexion Prisma                                                         | `postgresql://USER:PASSWORD@localhost:5432/portfolio` |
| `DIRECT_URL`                    | Connexion directe pour les migrations (= `DATABASE_URL` en développement) | `postgresql://...`                                    |
| `SESSION_SECRET`                | Signature du cookie de session                                           | *générer*                                           |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase                                                   | `https://xxxx.supabase.co`                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase (facultative, non utilisée en phase 1)             | *placeholder*                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Clé serveur Supabase (jamais côté client)                              | *placeholder*                                         |
| `SUPABASE_STORAGE_BUCKET_ARTICLES` | Bucket des images d'articles                                          | `dev-articles` / `articles`                         |
| `SUPABASE_STORAGE_BUCKET_PROJECTS` | Bucket des images de projets                                          | `dev-projets` / `projets`                           |
| `SUPABASE_STORAGE_BUCKET_PROFILE`  | Bucket du profil                                                      | `dev-profil` / `profil`                             |
| `SUPABASE_STORAGE_BUCKET_STACK`    | Bucket des icônes                                                     | `dev-stack` / `stack`                               |
| `SMTP_HOST`                     | Serveur SMTP                                                             | `smtp.gmail.com`                                      |
| `SMTP_PORT`                     | Port SMTP                                                                | `587`                                                 |
| `SMTP_USER`                     | Adresse Gmail                                                            | *placeholder*                                         |
| `SMTP_PASS`                     | Mot de passe d'application Gmail                                         | *placeholder*                                         |
| `MAIL_FROM`                     | Expéditeur                                                              | `Portfolio <placeholder>`                             |
| `ADMIN_EMAIL`                   | E-mail du compte admin (seed)                                            | *placeholder*                                         |
| `ADMIN_PASSWORD`                | Mot de passe initial du compte admin (seed, à supprimer ensuite)        | *placeholder*                                         |
| `GITHUB_TOKEN`                  | Optionnel, augmente la limite de l'API GitHub                            | *placeholder*                                         |

- Le `.env.example` contient toutes ces variables avec des valeurs factices et des commentaires.
- `.env` est listé dans `.gitignore` (avec l'exception `!.env.example`).
- En développement, l'application refuse de démarrer si `DATABASE_URL` ou `DIRECT_URL` ne pointe pas vers une base locale.

## 7. Base de données

- **Développement** : PostgreSQL local (PostgreSQL 18, service Windows), base `portfolio`, owner `postgres`. Mot de passe dans `.env` uniquement.
- **Production** : Supabase Database.
- Migrations Prisma versionnées, committées dans le dépôt. Prisma en version stable 7.x épinglée.
- Seed : crée le compte administrateur à partir de `ADMIN_EMAIL` et `ADMIN_PASSWORD`, hache le mot de passe, et crée le profil vide.
- Tests des uploads sur Supabase Storage en ligne, dans les buckets `dev-*`, avant tout déploiement en production.

## 8. Hors périmètre phase 1

- Partie publique du site (page d'accueil, pages articles, projets, parcours). Seul un déplacement de fichiers, sans changement visible, est fait pour séparer l'admin du site.
- FAQ et services.
- 2FA.
- Inscription publique et multi-administrateurs.
- Historique complet des versions d'articles.
- Images dans le corps des articles.
- Import des anciens JSON et Markdown.

## 9. Phase 2 (à venir)

- Refonte de l'interface visible, à cadrer après la validation de la phase 1.
- Affichage des articles, des projets, du parcours et de la stack à partir de la base.
- Suppression de `data/` et des images de `public/images/`.

## 10. Critères d'acceptation phase 1

- Connexion, déconnexion, validation d'e-mail et réinitialisation de mot de passe fonctionnent en `development` (lien dans la console) et en `production` (e-mail reçu).
- Aucune route `/admin` accessible sans session valide.
- Un article peut être créé, sauvegardé automatiquement en brouillon, repris après fermeture du navigateur, puis publié après confirmation.
- Modifier un article publié crée un brouillon : la version en ligne ne change qu'après « Publier » et confirmation, et « mis à jour le » est alors actualisé.
- Une formation et une compétence partagée entre deux formations peuvent être créées et liées.
- Un projet peut avoir des technologies, des liens et des collaborateurs. Le collaborateur est enregistré à partir d'un nom d'utilisateur GitHub.
- Les images et icônes sont uploadées dans Supabase Storage et testées dans les buckets de développement.
- L'interface admin est utilisable au clavier et sur mobile.
- Les migrations Prisma se rejouent sur une base vide sans erreur.

## 11. Points ouverts

- Date de mise en production : à fixer par Taoufik.

## 12. Journal des décisions (6 novembre 2026)

| Sujet                    | Décision                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| TypeScript               | Confirmé (déjà en place, mode strict).                                                            |
| Gestionnaire de paquets  | pnpm.                                                                                             |
| Nommage                  | Schéma, code et identifiants en anglais ; interface, messages, e-mails et URL en français.        |
| Articles                 | Toute modification va dans un brouillon ; mise en ligne uniquement par « Publier » + confirmation. |
| Navigation admin         | Barre latérale ; remplacée le 13 novembre 2026 par une barre horizontale en pilule (version 1.6, E60, en attente de validation). |
| Séparation admin / site  | Pages publiques déplacées dans un groupe de routes, sans changement visible pour les visiteurs.   |
| Couleurs                 | Palette inchangée ; rôles fixés selon les contrastes WCAG AA (voir `CLAUDE.md`). Couleurs Tailwind par défaut désactivées dans l'admin (`--color-*: initial`). **13 novembre 2026 (version 1.6, E60)** : l'admin passe à la charte visuelle du §5.1 ; l'ancienne palette est la palette précédente, à réviser en phase 2. **14 novembre 2026 (version 1.7, E61)** : bordure des champs et des listes `#8a8d93` ; logo retiré de l'admin ; règles de mouvement. |
| Stockage                 | Supabase Storage en ligne, dans le même projet que la production ; buckets `dev-*` en développement. |
| Base de développement    | PostgreSQL local uniquement.                                                                      |
| Éditeur Markdown         | Zone de texte native + barre d'outils, aperçu `react-markdown` assaini.                           |
| Tailles de fichiers      | 1 Mo pour tous les fichiers (E52 du plan).                                                                   |
| Tests                    | Vitest pour la logique serveur.                                                                   |
| Middleware               | `proxy.ts` (convention Next.js 16).                                                               |
