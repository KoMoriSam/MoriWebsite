<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="Logo KoMoriSam" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  Un jardin numérique personnel construit avec Vue 3, Vite SSG, Tailwind CSS et daisyUI, réunissant blog, lecteur de roman, recherche globale, commentaires et outils en ligne.
</p>

<p align="center">
  <a href="https://komori.cc/">Site en ligne</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">Code source</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Signaler un problème</a>
</p>

<p align="center">
  Version actuelle : <strong>1.14.0</strong>
  ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

---

## Vue d'ensemble

MoriWebsite est l'interface du site personnel de KoMoriSam. Le projet est conçu pour la publication et la lecture de textes longs. La génération de site statique (SSG) fournit des pages d'articles indexables et des métadonnées SEO complètes.

Le site comprend actuellement :

- une page d'accueil responsive avec profil, arrière-plan dynamique et liens de contact
- un blog filtrable par mot-clé, étiquette et année
- le roman original _Vers l'horizon_, alimenté par Markdown, et son lecteur dédié
- une recherche globale Pagefind couvrant articles, chapitres et journal des modifications
- des commentaires Giscus au niveau des articles, chapitres et paragraphes
- des outils en ligne, dont l'état d'un serveur Minecraft
- journal des modifications, thèmes, progression de lecture et préférences locales

Routes de production :

```text
/
/blog
/blog/:articleId
/novel
/novel/:volumeSlug/:chapterSlug?
/tools/:toolSlug?
/changelog
```

En développement, `/test` permet également de tester les composants et interactions. Les URL inconnues utilisent la vue 404 de l'application, et le build génère un fichier `404.html` adapté à l'hébergement statique.

## Stack technique

- Vue 3, Vue Router, Pinia
- Vite 6, vite-ssg
- Tailwind CSS 4, daisyUI 5
- Pagefind
- Unhead
- VueUse
- Markdown-it, vue-markdown-render
- Giscus
- highlight.js

## Fonctionnalités

### Contenu et lecture

- liste et détail des articles avec filtrage combiné par mot-clé, étiquette et année
- volumes, navigation entre chapitres, position de lecture et réglages persistants
- coloration du code Markdown, notes de bas de page, tâches, formules, encadrés et format de dialogue personnalisé
- références d'images de style Obsidian, bannières et chargement différé
- typographie, barres latérales et progression adaptées aux ordinateurs et mobiles

### Recherche et découverte

- ouverture de la recherche globale avec `Ctrl/Cmd + K`
- index statique créé par Pagefind après le build de production
- filtres combinables par type de contenu, étiquette ou volume, et année
- recherche plein texte et filtres propres à la liste du blog
- état de recherche synchronisé avec l'URL pour le partage et la navigation

### Commentaires et état local

- commentaires Giscus pour les articles et chapitres
- discussions attachées à des paragraphes précis
- API facultative de comptage groupé des commentaires de paragraphe
- thème, réglages et position de lecture conservés dans le navigateur
- migration et nettoyage intégrés des anciens formats de stockage local

### SSG, SEO et hébergement statique

- récupération des articles, du catalogue du roman et du journal avant le build pour créer un instantané SSG commun
- routes statiques pour les articles avec des données identiques au rendu serveur et à l'hydratation
- liens canonical, métadonnées Open Graph, Twitter Card et JSON-LD générés avec Unhead
- index Pagefind et page 404 pour hébergement statique générés après le rendu
- fichier `wrangler.jsonc` configuré pour servir `dist/` comme ressources statiques Cloudflare

## Démarrage rapide

### Installer les dépendances

```bash
pnpm install
```

### Lancer le serveur de développement

```bash
pnpm dev
```

Le serveur de développement écoute par défaut sur toutes les interfaces réseau.

### Construire pour la production

```bash
pnpm build
```

Le build crée l'instantané SSG, prérend le site et génère l'index Pagefind dans `dist/`. Les sources des articles et du roman doivent être accessibles pendant cette opération.

### Prévisualiser le build

```bash
pnpm preview
```

## Variables d'environnement

Les fichiers `.env.development` et `.env.production` fournissent les sources et services propres à chaque environnement :

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
VITE_RANDOM_HERO_API=
VITE_COMMENT_COUNTS_API=
VITE_GISCUS_CSS_RAW=
```

| Variable                  | Utilisation                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_BLOG_RAW`           | URL de base de l'index, du Markdown et des images du blog ; requise pour le build de production |
| `VITE_NOVEL_RAW`          | URL de base de l'index et des chapitres du roman ; requise pour le build de production          |
| `VITE_SERVER_ADDRESS`     | Serveur Minecraft interrogé par défaut sur la page des outils                                   |
| `VITE_RANDOM_HERO_API`    | Endpoint de l'arrière-plan aléatoire de l'accueil                                               |
| `VITE_COMMENT_COUNTS_API` | Endpoint facultatif de comptage des commentaires de paragraphe                                  |
| `VITE_GISCUS_CSS_RAW`     | URL de base des thèmes Giscus personnalisés                                                     |

`scripts/generate-routes.mjs` lit `.env.production` avant le build. Ne validez aucun identifiant privé dans le dépôt ; seules les valeurs destinées au client doivent utiliser le préfixe `VITE_`.

## Structure du projet

```text
src/
  components/
    blog/          # liste des articles et lecteur
    novel/         # catalogue, informations de chapitre et lecteur
    reader/        # Markdown, commentaires de paragraphe et réglages
    layout/        # navigation, recherche globale et mise en page
    ui/            # composants d'interface partagés
  composables/     # filtres, défilement, modales et images
  services/        # API de contenu, commentaires, serveur et arrière-plan
  stores/          # thème, journal des modifications et état de lecture
  router/          # routes et données SSG générées au build
  utils/           # extensions Markdown, stockage local et notifications
  views/           # pages associées aux routes

scripts/
  generate-routes.mjs       # génère les routes d'articles et l'instantané SSG

mock/
  article/                  # articles, images et index locaux
  novel/                    # chapitres, index et générateur d'index locaux

public/
  assets/                   # images, polices et icônes
  archive/                  # anciennes pages statiques archivées
  changelog.json            # historique des versions
```

## Notes sur le contenu et le build

- Le blog et le roman sont maintenus dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon) ; `mock/` contient des copies locales.
- `src/router/ssg-data.generated.js` est généré automatiquement et ne doit pas être modifié manuellement.
- La configuration Giscus est centralisée dans `src/constants/config.js`.
- Les API des articles et chapitres se trouvent dans `src/services/api-articles.js` et `src/services/api-chapters.js`.
- Le journal des modifications provient de `public/changelog.json`.
- `pnpm deploy` publie `dist/` sur la branche `gh-pages` du dépôt ; la configuration des ressources statiques Cloudflare se trouve dans `wrangler.jsonc`.

## Compatibilité

Le projet vise principalement les versions récentes de Chrome, Firefox, Microsoft Edge et des navigateurs mobiles courants.

## Licence

Ce projet est distribué sous [licence MIT](./LICENSE).

## Langues

- [中文](./README.md)
- [English](./README_en.md)
