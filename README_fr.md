<p align="center">
  <a href="https://komorisam.github.io/">
    <img src="https://komorisam.github.io/favicon.webp" alt="Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">KoMoriSam</h1>

<p align="center">
  Un site personnel construit avec Vite, Vue 3 et daisyUI, réunissant une page d'accueil, un flux d'articles, un lecteur de roman, un système de commentaires, un journal des modifications et des pages de profil.
</p>

<p align="center">
  <a href="https://komorisam.github.io/">Site en ligne</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io">Code source</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io/issues">Signaler un problème</a>
</p>

<p align="center">
  Dernière version : <strong>1.13.0</strong>
  ·
  <a href="https://komorisam.github.io/changelog">Voir le journal des modifications</a>
</p>

---

## Vue d'ensemble

Ce dépôt n'est plus une simple page de blog personnelle. Il s'agit désormais d'une application orientée contenu, centrée sur l'expérience de lecture et la publication de textes longs.

Sections actuellement disponibles :

- page d'accueil avec salutation et informations serveur
- liste d'articles et lecteur d'article
- catalogue de roman et lecteur basés sur Markdown
- commentaires Giscus, y compris au niveau du paragraphe
- pages à propos, contact et journal des modifications
- améliorations de typographie et de lecture pour ordinateur et mobile

Routes actuelles :

- /
- /blog
- /novel
- /about
- /contact
- /changelog

En développement, une route supplémentaire /test est disponible pour tester les composants et les interactions.

## Stack technique

- Vite 6
- Vue 3
- Vue Router
- Pinia
- Tailwind CSS 4
- daisyUI 5
- VueUse
- vue-markdown-render
- Giscus
- highlight.js

## Fonctionnalités

### 1. Système d'articles

- vues séparées pour la liste et le détail
- rendu d'articles en Markdown
- prise en charge des images au format Obsidian et normalisation des bannières
- commentaires au niveau de l'article et du paragraphe

Le contenu des articles provient actuellement de :

- mock/article
- mock/article/generate-index.mjs

### 2. Système de lecture de roman

- catalogue et lecteur séparés
- chargement des chapitres via index et fichiers Markdown
- persistance des réglages du lecteur et de l'état de lecture
- améliorations dédiées à la typographie, au défilement et à la lecture longue

Le contenu des romans se trouve actuellement dans :

- mock/novel

### 3. Commentaires et interactions

- Giscus est utilisé comme backend de commentaires
- des thèmes Giscus personnalisés suivent les thèmes du site
- les commentaires de paragraphe peuvent récupérer le texte courant pour une discussion plus précise

### 4. Données externes et fonctions annexes

- bloc d'information serveur sur la page d'accueil
- encapsulation de l'API de citation quotidienne conservée dans le projet
- page de changelog alimentée par public/changelog.json

## Démarrage rapide

### Installer les dépendances

```bash
pnpm install
```

### Lancer le serveur de développement

```bash
pnpm dev
```

### Construire pour la production

```bash
pnpm build
```

### Prévisualiser la build

```bash
pnpm preview
```

## Variables d'environnement

Le projet utilise actuellement les variables Vite suivantes :

```bash
BLOG_RAW=
NOVEL_RAW=
SERVER_ADDRESS=
MXNZP_APP_ID=
MXNZP_APP_SECRET=
GISCUS_CSS_RAW=
```

Utilisation :

- BLOG_RAW : source de l'index et des fichiers Markdown des articles
- NOVEL_RAW : source de l'index et du contenu des chapitres de roman
- SERVER_ADDRESS : adresse serveur par défaut affichée sur l'accueil
- MXNZP_APP_ID / MXNZP_APP_SECRET : identifiants pour l'API de citation quotidienne
- GISCUS_CSS_RAW : URL de base du site pour certaines ressources liées au thème

Si vous utilisez uniquement le contenu statique local, veillez à faire pointer les URL d'API des articles et des romans vers les répertoires statiques correspondants ou vers un proxy local.

## Organisation du contenu et du projet

```bash
src/
  components/
    blog/          # liste d'articles, lecteur
    novel/         # détail du roman, infos de chapitre, contrôles du lecteur
    reader/        # réglages, panneaux de style du lecteur, commentaires de paragraphe, rendu Markdown
    layout/        # mise en page et navigation
  composables/     # logique réutilisable pour le scroll, les modales, les commentaires, les images, etc.
  services/        # articles, chapitres, serveur, citations quotidiennes
  stores/          # thème, changelog, état du lecteur
  utils/           # Markdown, stockage, notifications de mise à jour, aides diverses
  views/           # pages de niveau route

mock/
  article/         # fichiers Markdown des articles, ressources et générateur d'index
  novel/           # fichiers Markdown des romans et générateur d'index

public/
  css/giscus/      # thèmes Giscus personnalisés
  archive/         # anciennes pages statiques archivées
  changelog.json   # données du changelog
```

## Notes de développement

- le routage est défini dans src/router/index.js
- les données du changelog sont lues depuis public/changelog.json
- la configuration Giscus est centralisée dans src/constants/config.js
- les API de contenu sont implémentées dans src/services/api-articles.js et src/services/api-chapters.js
- les index des articles et des romans sont maintenus via des scripts generate-index.mjs

## Compatibilité

Le projet vise principalement les navigateurs modernes :

- Chrome
- Firefox
- Microsoft Edge
- navigateurs mobiles courants

## Licence

Ce projet est distribué sous licence MIT. Voir [LICENSE](https://github.com/KoMoriSam/komorisam.github.io/blob/master/LICENSE) pour plus de détails.

## Langues

- 中文: [README.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README.md)
- English: [README_en.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README_en.md)
