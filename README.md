# 🚀 Portfolio Personnel - Taoufik OURO-BANG'NA

Portfolio moderne et élégant développé avec **Next.js 16**, **React 19** et **Tailwind CSS 4**. Ce site met en avant mes compétences, projets et expériences avec un design soigné, des animations fluides et une architecture performante.

![Portfolio Preview](public/images/preview.png)

## ✨ Caractéristiques

- 🎨 **Design Ultra Moderne** - Interface élégante avec glassmorphism, gradients animés et micro-interactions
- ⚡ **Performance Optimale** - Next.js 16 avec App Router pour un chargement ultra-rapide
- 📱 **Responsive Design** - Adapté à tous les écrans (mobile, tablette, desktop)
- 🎭 **Animations Fluides** - Transitions et animations CSS personnalisées
- 🗂️ **Gestion de Données JSON** - Architecture sans base de données, données dans des fichiers JSON
- 🎯 **SEO Optimisé** - Meta tags et structure optimisée pour le référencement
- 🌐 **TypeScript** - Code typé pour une meilleure maintenabilité
- 🎨 **Tailwind CSS 4** - Système de design moderne et cohérent
- 📦 **Architecture Modulaire** - Composants réutilisables et bien organisés

## 🛠️ Technologies Utilisées

### Frontend

- **Next.js 16** - Framework React pour le rendu côté serveur
- **React 19** - Bibliothèque UI moderne
- **TypeScript** - Typage statique JavaScript
- **Tailwind CSS 4** - Framework CSS utility-first

### Outils de Développement

- **ESLint** - Linter pour maintenir la qualité du code
- **pnpm** - Gestionnaire de paquets rapide et efficace
- **Font Awesome** - Bibliothèque d'icônes

## 📦 Installation

### Prérequis

- Node.js 18+
- pnpm (recommandé) ou npm

### Étapes d'installation

1. **Cloner le repository**

```bash
git clone https://github.com/taoufikOURO/portfolio.git
cd portfolio
```

2. **Installer les dépendances**

```bash
pnpm install
# ou
npm install
```

3. **Lancer le serveur de développement**

```bash
pnpm dev
# ou
npm run dev
```

4. **Ouvrir dans le navigateur**

```
http://localhost:3000
```

## 📁 Structure du Projet

```
portfolio/
├── app/                      # Application Next.js (App Router)
│   ├── components/          # Composants React réutilisables
│   │   ├── About.tsx       # Section À propos
│   │   ├── Contact.tsx     # Formulaire de contact
│   │   ├── Header.tsx      # Navigation principale
│   │   ├── Hero.tsx        # Section hero/bannière
│   │   ├── Projects.tsx    # Liste des projets
│   │   └── Stack.tsx       # Technologies maîtrisées
│   ├── lib/                # Utilitaires et fonctions
│   │   └── data.ts         # Fonctions de récupération des données
│   ├── projets/            # Pages des projets
│   │   ├── page.tsx        # Liste complète des projets
│   │   └── [slug]/         # Page détail d'un projet
│   ├── types/              # Définitions TypeScript
│   ├── globals.css         # Styles CSS globaux
│   ├── layout.tsx          # Layout principal
│   └── page.tsx            # Page d'accueil
├── data/                    # Données JSON
│   ├── profile.json        # Informations personnelles
│   ├── projets.json        # Liste des projets
│   └── stack.json          # Technologies
├── public/                  # Assets statiques
│   └── images/             # Images et icônes
└── README.md               # Documentation
```

## 🎨 Personnalisation

### Modifier vos informations

1. **Profil personnel** (`data/profile.json`)

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

2. **Ajouter des projets** (`data/projets.json`)

```json
{
    "id": 1,
    "slug": "nom-du-projet",
    "titre": "Titre du Projet",
    "description": "Description détaillée...",
    "estPublie": true,
    "lien": "https://projet.com",
    "image": "/images/projets/projet.png",
    "github": "https://github.com/user/projet",
    "stack": [...]
}
```

3. **Technologies** (`data/stack.json`)

```json
{
    "name": "Nom de la techno",
    "icon": "/images/stack/icone.png"
}
```

### Personnaliser les couleurs

Modifier les variables CSS dans `app/globals.css`:

```css
:root {
    --color-primary: #14213d; /* Bleu foncé principal */
    --color-accent: #fca311; /* Orange accent */
    /* ... autres variables */
}
```

## 🚀 Déploiement

### Vercel (recommandé)

1. Pusher votre code sur GitHub
2. Connecter votre repo à [Vercel](https://vercel.com)
3. Vercel détectera automatiquement Next.js et déploiera

### Build manuel

```bash
# Créer le build de production
pnpm build

# Lancer en production
pnpm start
```

## 📝 Scripts Disponibles

```bash
pnpm dev        # Démarre le serveur de développement
pnpm build      # Crée le build de production
pnpm start      # Lance le serveur de production
pnpm lint       # Vérifie le code avec ESLint
```

## 🎯 Fonctionnalités

### Pages

- ✅ Page d'accueil avec toutes les sections
- ✅ Page liste complète des projets
- ✅ Pages détails de chaque projet
- ✅ Navigation fluide entre les sections
- ✅ Footer avec liens et informations

### Sections

- ✅ **Hero** - Présentation avec photo et CTA
- ✅ **About** - À propos avec points forts
- ✅ **Stack** - Technologies avec icônes
- ✅ **Projects** - Projets récents en cartes
- ✅ **Contact** - Formulaire et liens sociaux

### Design

- ✅ Animations CSS personnalisées
- ✅ Effets glassmorphism
- ✅ Gradients animés
- ✅ Micro-interactions au hover
- ✅ Blobs décoratifs animés
- ✅ Scrollbar personnalisée
- ✅ Header avec effet de scroll

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit vos changements (`git commit -m 'Ajout fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👤 Contact

**Taoufik OURO-BANG'NA**

- 📧 Email: ourotaoufik1@gmail.com
- 💼 LinkedIn: [linkedin.com/in/taoufik-ouro-bang-na](https://www.linkedin.com/in/taoufik-ouro-bang-na)
- 🐙 GitHub: [@taoufikOURO](https://github.com/taoufikOURO)

---

⭐ **Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !**

Fait avec ❤️ et Next.js
