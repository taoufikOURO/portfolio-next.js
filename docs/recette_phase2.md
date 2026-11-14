# Recette de la phase 2 : site public lu depuis la base

Références : `docs/cahier_des_charges.md` (version 2.0, §9), `docs/plan_implementation.md` (§0.5, décisions E62 à E65).

Statut : **à relire par Taoufik, rien n'est coché.** Les cases ne sont cochées que par Taoufik (ou sur sa confirmation écrite). Les mesures automatiques faites par Claude Code le 14 novembre 2026 sont rappelées en fin de document, à titre d'information : elles ne cochent aucune case.

## 1. Avant la recette

- [ ] Simulation de l'import lancée : `pnpm content:import` (comptes seulement, rien n'est écrit)
- [ ] Import réel lancé : `pnpm content:import --apply` (base locale `portfolio`, buckets `dev-*`)
- [ ] Relance de `pnpm content:import` : « 0 à créer » partout (idempotence)
- [ ] `pnpm build` puis `pnpm start` (ou `next start -p 3200`) pour voir les pages telles qu'elles seront servies

## 2. Pages × largeurs

Pour chaque case : rendu conforme à la référence (même système : titres en grand, croix de repère, cartes), contenu venu de la base, aucun défilement horizontal, texte lisible, focus visible au clavier.

| Page | Adresse | 1440 px | 390 px |
| ---- | ------- | ------- | ------ |
| Accueil | `/` | [ ] | [ ] |
| Projets | `/projets` | [ ] | [ ] |
| Détail d'un projet | `/projets/<slug>` | [ ] | [ ] |
| Projet non publié | `/projets/<slug d'un projet non publié>` → 404 | [ ] | [ ] |
| Articles | `/articles` | [ ] | [ ] |
| Détail d'un article avec couverture | `/articles/<slug>` | [ ] | [ ] |
| Détail d'un article sans couverture | `/articles/<slug>` (image par défaut) | [ ] | [ ] |
| Brouillon jamais publié | `/articles/<slug du brouillon>` → 404 | [ ] | [ ] |
| Formations | `/formations` | [ ] | [ ] |
| Compétences | `/competences` | [ ] | [ ] |
| Profil | `/profil` | [ ] | [ ] |
| Page introuvable | `/une-adresse-inconnue` → 404 | [ ] | [ ] |

## 3. Accueil en une page (référence, E66)

- [ ] Accroche en haut à gauche (texte neutre « Portfolio / année », à valider ou remplacer)
- [ ] **Titre professionnel du profil** en géant, plein et contour, bloc rouge vertical décalé derrière ; sur mobile, sur deux lignes s'il est long
- [ ] Nom en bas à gauche, lien « Découvrir » en bas à droite (mène à « À propos »)
- [ ] Croix de repère aux coins et aux tiers, flèches de repère à gauche et à droite, icône cible en haut à droite
- [ ] Éventail : photo du profil au centre (lien vers `/profil`), projets dans l'ordre de l'admin (quatre au plus, liens vers leur page), image par défaut pour les places vides
- [ ] Anneau de texte (nom et titre du profil), flèche vers la photo, prénom au centre
- [ ] Cartes atteintes au clavier, dans l'ordre, avec un contour de focus visible
- [ ] En défilant : 01 À propos (photo, bio, chiffres, liens), 02 Projets (six au plus, numérotés), 03 Parcours (frise), 04 Compétences et stack, 05 trois derniers articles, 06 Contact (bloc sombre, e-mail) ; une section vide n'apparaît pas
- [ ] Barre du haut collée au défilement ; ses liens (À propos, Projets, Parcours, Compétences, Articles, Contact) sont des **ancres** : ils font défiler l'accueil jusqu'à la section, sans changer de page
- [ ] Depuis une page de détail (un projet, un article…), un lien de la barre ramène à l'accueil, sur la section ; la section en cours est surlignée
- [ ] Chaque section montre un aperçu (3 projets, 2 formations, 12 compétences et 6 technologies, 3 articles) et se termine par **« Voir plus »** (avec « n sur N »), qui ouvre la page complète
- [ ] Aucun autre lien de la barre ou du pied de page ne mène directement à une page complète
- [ ] Sur mobile, le menu se referme après le choix d'une section
- [ ] Phrase d'appel du contact (« Un projet, une question ou une opportunité : écrivez-moi. ») : à valider ou remplacer

## 4. Règles de contenu

- [ ] Seuls les articles publiés apparaissent, dans leur version publiée ; des modifications en attente n'apparaissent pas
- [ ] « Publié le » et, après une republication, « Mis à jour le »
- [ ] Projets dans l'ordre de l'admin ; un projet non publié n'apparaît nulle part
- [ ] Détail d'un projet : description, technologies, liens dans l'ordre, collaborateurs (nom et lien de profil seulement)
- [ ] Formations et compétences conformes à l'admin
- [ ] Image manquante (couverture, projet, photo) : la même image neutre (gris clair, carré rouge)
- [ ] Markdown des articles : titres, listes, liens, code coloré, citation ; aucun HTML brut exécuté

## 5. Mise à jour depuis l'admin (invalidation)

- [ ] Publier un article : il apparaît aussitôt dans `/articles` et à son adresse
- [ ] Modifier un article publié sans le republier : le site ne change pas ; après « Publier » : le site change
- [ ] Supprimer un article : il disparaît (404)
- [ ] Publier, retirer, réordonner ou modifier un projet : accueil, liste et détail à jour
- [ ] Modifier le profil : nom et titre à jour sur toutes les pages
- [ ] Modifier une formation, une compétence ou une technologie : pages concernées à jour

## 6. Mouvement

- [ ] À l'arrivée sur l'accueil : lettres du titre qui basculent, bloc rouge qui se déplie, éventail qui s'ouvre
- [ ] Survol d'une carte : elle se soulève et tourne légèrement
- [ ] Anneau de texte qui tourne lentement (seule animation en boucle)
- [ ] Textes qui se révèlent à l'entrée sur les autres pages
- [ ] Accueil, en défilant : chaque bloc apparaît en arrivant à l'écran (fondu, montée ou glissement), les lettres des titres de section basculent, la frise du parcours se dessine
- [ ] Barre de progression rouge en haut, titre et éventail qui remontent lentement en quittant l'écran, contours des titres qui glissent (navigateurs compatibles : Chrome, Edge, Safari récents)
- [ ] Avec « réduire les animations » activé dans le système : affichage direct, aucun déplacement, anneau immobile, aucun bloc masqué

## 7. Accessibilité, référencement

- [ ] Lien « Aller au contenu » au premier Tab
- [ ] Menu mobile ouvrable au clavier, liens de 44 px
- [ ] Titres d'onglet distincts sur chaque page
- [ ] Aperçu de partage (Open Graph) : couverture ou image du projet, sinon image par défaut
- [ ] `/sitemap.xml` liste les pages, les projets publiés et les articles publiés ; `/robots.txt` exclut `/admin`

## 8. Points à trancher (plan §0.5.6)

- [ ] Accroche de l'accueil : texte neutre conservé, ou champ du profil à ajouter
- [ ] Image par défaut en SVG pour Open Graph : conservée, ou version PNG à ajouter
- [ ] Photo détourée de plus de 1 Mo : à réduire et envoyer depuis l'admin, ou abandonnée
- [ ] Barre oblique inverse dans le nom du profil (base locale) : voulue ou à corriger
- [ ] Suppression de `data/`, de `public/images/`, de l'ancien code du site et des dépendances `framer-motion`, `highlight.js` (plan §0.5.7)

## 9. Validation

- [ ] **Validation écrite de la phase 2 par Taoufik**

---

## Annexe : mesures automatiques de Claude Code (14 novembre 2026, information seulement)

Build servi par `next start -p 3200`, `APP_ENV=development`, base locale `portfolio`, buckets `dev-*`, Chrome headless, données de test « Test P2 » supprimées ensuite (16 tables identiques à l'instantané initial, 6 fichiers sur 6 retirés des buckets).

- 12 pages × 1440 et 390 px : 0 défilement horizontal, 0 élément rogné, 0 cible de moins de 44 px (hors un lien dans le texte d'un article), contraste le plus faible 5,11, police ≥ 12 px, un seul `h1` par page, titres uniques, 0 image cassée ; brouillons, modifications en attente et projet non publié jamais affichés ; 404 attendus obtenus.
- Mouvement : entrées 416–500 ms, bloc rouge 588–595 ms, éventail 805 ms, survol 245–254 ms, une seule boucle (anneau, 40 s) ; sous réduction émulée : aucune animation, aucun déplacement.
- Invalidation par l'admin (administrateur temporaire) : publication, suppression d'un article et publication d'un projet reflétées immédiatement (liste, détail, plan du site).
- Captures hors du dépôt : dossier `captures\p2` du répertoire temporaire de la session de Claude Code.
