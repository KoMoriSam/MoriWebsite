<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="Logo KoMoriSam" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  Un jardin numérique personnel « 远方之森 » construit avec Vue 3, Vite SSG, Tailwind CSS et daisyUI, réunissant blog, lecteur de roman, recherche globale, commentaires et outils en ligne.
</p>

<p align="center">
  <a href="https://komori.cc/">Site en ligne</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">Code source</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Signaler un problème</a>
</p>

<p align="center">
  Version actuelle : <strong>1.17.0</strong>
  ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

---

## Vue d'ensemble

MoriWebsite est l'interface du site personnel de KoMoriSam. Le projet est conçu pour la publication, la lecture de textes longs et l'hébergement statique. Les articles et le roman sont conservés dans des dépôts séparés ; avant chaque build de production, le projet récupère un instantané du contenu, puis `vite-ssg` génère du HTML indexable pour les pages principales et les articles.

Le site comprend actuellement :

- une page d'accueil responsive avec profil, arrière-plan dynamique et liens de contact
- un blog filtrable par mot-clé, étiquette et année
- les volumes, la navigation entre chapitres et un lecteur paginé pour le roman original _Vers le lointain_ (`《向远方》`)
- une recherche globale couvrant articles, chapitres, versions du site et licences open source
- des commentaires Giscus au niveau des articles, chapitres et paragraphes
- un outil de consultation de l'état d'un serveur Minecraft
- journal des modifications, thèmes, progression de lecture et préférences locales
- une page présentant les licences des dépendances, polices, icônes et autres contenus tiers

Routes de production :

```text
/
/blog
/blog/:articleId
/novel
/novel/:volumeSlug/:chapterSlug?
/tools/:toolSlug?
/changelog
/licenses
```

En développement, `/test` permet également de tester les composants. Les URL inconnues utilisent la vue 404 de l'application et le build de production génère un fichier `404.html` adapté à l'hébergement statique.

## Points clés de la version 1.17.0

- renommage officiel du site en « 远方之森 » et unification des titres, descriptions et métadonnées SEO
- ajout de la police JetBrains Mono pour améliorer le rendu des polices à chasse fixe, comme les blocs de code
- introduction d'effets d'animation et d'animations pour enrichir les interactions
- amélioration de l'espacement de l'accueil, des barres latérales et de la liste des chapitres
- passage des polices de ponctuation Kaiming à des références CSS en ligne, suppression des polices locales et de la dépendance NProgress abandonnée

Consultez [`public/changelog.json`](./public/changelog.json) ou le [journal en ligne](https://komori.cc/changelog) pour l'historique complet.

## Stack technique

- Vue 3, Vue Router, Pinia
- Vite 6, vite-ssg
- Tailwind CSS 4, daisyUI 5
- Pagefind 1.5
- Unhead, VueUse
- Markdown-it, vue-markdown-render, KaTeX, highlight.js
- Polices auto-hébergées comme JetBrains Mono et Fraunces
- Giscus

## Fonctionnalités

### Contenu et lecture

- liste et détail des articles avec filtres combinés par mot-clé, étiquette et année
- volumes, navigation entre chapitres, nombre total de caractères, position de lecture et réglages persistants
- coloration du code Markdown, notes de bas de page, tâches, formules, encadrés, dialogues personnalisés, attributs et annotations ruby
- références d'images de style Obsidian, résolution des bannières, chargement différé et copie du code
- typographie, sommaire, barres latérales et progression adaptés aux ordinateurs et mobiles

### Recherche et découverte

- ouverture de la recherche globale avec `Ctrl/Cmd + K`
- index Pagefind personnalisé lors du build de production ; en développement, un index local peut être créé à partir des API de contenu
- recherche dans les sections d'articles, chapitres, versions du site et notices de licence
- filtres combinables par type de contenu, étiquette ou volume, et année
- état de recherche synchronisé avec l'URL et liens directs vers les titres ou ancres de licence

### Commentaires et état local

- commentaires Giscus pour les articles et chapitres
- discussions attachées à des paragraphes précis
- API facultative de comptage groupé des commentaires de paragraphe
- thème, réglages et position de lecture conservés dans le navigateur
- migration et nettoyage intégrés des anciens formats de stockage local

### SSG, SEO et données de licence

- récupération des articles, du catalogue du roman et du journal avant le build pour créer un instantané SSG commun
- routes statiques pour les articles avec des données identiques lors du rendu serveur et de l'hydratation
- liens canonical, métadonnées Open Graph, Twitter Card et JSON-LD générés avec Unhead
- collecte des dépendances de production et des licences complémentaires pour la page intégrée et `dist/legal/`
- génération de l'index Pagefind et d'une page 404 adaptée à l'hébergement statique après le rendu
- configuration de `dist/` comme répertoire de ressources statiques Cloudflare dans `wrangler.jsonc`

## Démarrage rapide

### Prérequis

- Node.js
- pnpm
- des sources de blog et de roman accessibles, ou des copies locales dans `mock/`

Le dépôt ignore `.env.development`, `.env.production` et `mock/`. Après un nouveau clonage, créez vos propres fichiers d'environnement, puis synchronisez les copies locales du contenu ou utilisez des sources distantes accessibles.

### Installer les dépendances

```bash
pnpm install
```

### Lancer le serveur de développement

```bash
pnpm dev
```

Le hook `predev` génère d'abord les données de licence intégrées à partir des dépendances de production installées. Vite écoute par défaut sur `0.0.0.0`.

### Construire pour la production

```bash
pnpm build
```

Le flux de build complet :

1. récupère le contenu de production et crée l'instantané SSG ;
2. collecte les dépendances et licences complémentaires ;
3. prérend le site et génère `404.html` ;
4. crée l'index Pagefind pour le blog, le roman, le journal et les licences ;
5. copie les textes de licence et les mentions tierces dans `dist/legal/`.

Les sources indiquées par `VITE_BLOG_RAW` et `VITE_NOVEL_RAW` doivent être accessibles pendant le build.

### Prévisualiser le build

```bash
pnpm preview
```

## Variables d'environnement

Créez `.env.development` et `.env.production` à la racine du projet, puis renseignez les valeurs côté client nécessaires à chaque environnement :

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
VITE_RANDOM_HERO_API=
VITE_COMMENT_COUNTS_API=
VITE_GISCUS_CSS_RAW=
```

| Variable                  | Utilisation                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_BLOG_RAW`           | URL de base du fichier `index.json`, du Markdown et des images du blog ; requise pour le build de production |
| `VITE_NOVEL_RAW`          | URL de base du fichier `index.json` et des chapitres du roman ; requise pour le build de production          |
| `VITE_SERVER_ADDRESS`     | Serveur Minecraft interrogé par défaut sur la page des outils                                                |
| `VITE_RANDOM_HERO_API`    | Endpoint de l'arrière-plan aléatoire de l'accueil                                                            |
| `VITE_COMMENT_COUNTS_API` | Endpoint groupé facultatif pour le nombre de commentaires de paragraphe                                      |
| `VITE_GISCUS_CSS_RAW`     | URL de base des thèmes Giscus personnalisés                                                                  |

Toutes ces variables utilisent le préfixe `VITE_` et sont exposées au code client. N'y placez aucun secret ni identifiant privé. `scripts/generate-routes.mjs` et `scripts/generate-pagefind-index.mjs` lisent tous deux `.env.production`.

## Scripts disponibles

| Commande       | Utilisation                                                                    |
| -------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`     | Générer les données de licence et lancer le serveur de développement           |
| `pnpm build`   | Générer le site SSG, l'index de recherche et les licences distribuées          |
| `pnpm preview` | Prévisualiser localement `dist/`                                               |
| `pnpm deploy`  | Publier `dist/` sur la branche `gh-pages` du dépôt                             |
| `pnpm push`    | Forcer l'envoi de la branche locale `main` vers la branche distante `cl-pages` |

`pnpm push` contient `--force` ; vérifiez l'usage de la branche distante et le commit courant avant de l'exécuter.

## Structure du projet

```text
src/
  assets/          # styles globaux, thèmes, lecture et polices
  components/
    blog/          # liste des articles et lecteur
    novel/         # catalogue, informations de chapitre et lecteur
    reader/        # Markdown, commentaires de paragraphe et réglages
    layout/        # navigation, recherche globale et squelettes de page
    ui/            # composants d'interface partagés
  composables/     # filtres, défilement, modales et images
  services/        # API de contenu, recherche, commentaires, serveur et arrière-plan
  stores/          # thème, journal des modifications et état de lecture
  router/          # routes et données SSG/licences générées au build
  utils/           # extensions Markdown, stockage, ressources et mises à jour
  views/           # pages associées aux routes

scripts/
  generate-routes.mjs                # crée les routes d'articles et l'instantané SSG
  generate-pagefind-index.mjs        # crée l'index Pagefind global personnalisé
  generate-third-party-licenses.mjs  # collecte et distribue les données de licence

licenses/          # licences complémentaires des polices, icônes et autres ressources
mock/              # copies locales ignorées par Git du blog et du roman
public/
  assets/          # images, polices et icônes
  archive/         # anciennes pages statiques archivées
  changelog.json   # historique des versions
```

## Notes sur le contenu et le build

- Le blog et le roman sont maintenus dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon).
- `src/router/ssg-data.generated.js` et `src/router/license-data.generated.js` sont générés automatiquement, ignorés par Git et ne doivent pas être modifiés manuellement.
- La configuration publique des dépôts et catégories Giscus est centralisée dans `src/constants/config.js`.
- La logique du blog, du roman et de la recherche globale se trouve dans `src/services/api-articles.js`, `src/services/api-chapters.js` et `src/services/search-content.js`.
- Les extensions Markdown se trouvent dans `src/utils/markdown/` ; `src/utils/article-assets.js` résout les images et bannières des articles.
- Le journal des modifications provient de `public/changelog.json`.
- La configuration des ressources statiques Cloudflare se trouve dans `wrangler.jsonc` ; le script de publication GitHub Pages reste dans `package.json`.

## Compatibilité

Le projet vise principalement les versions récentes de Chrome, Firefox, Microsoft Edge et des navigateurs mobiles courants. Le build active également le plugin legacy de Vite pour produire des ressources de compatibilité supplémentaires destinées aux anciens navigateurs.

## Licence

Sauf indication contraire, le code source logiciel original de ce dépôt est distribué sous [licence MIT](./LICENSE). Les bibliothèques, polices, icônes, images, articles et autres contenus non logiciels de tiers restent soumis à leurs licences ou mentions de droits respectives et ne sont pas placés sous licence MIT. Consultez les [mentions relatives aux tiers](./THIRD_PARTY_NOTICES.md), leur [version chinoise](./THIRD_PARTY_NOTICES.zh-CN.md) et la page intégrée [`/licenses`](https://komori.cc/licenses).

Les builds de production incluent les licences des dépendances d'exécution, la licence du projet, les mentions tierces et les licences complémentaires dans `dist/legal/`.

## Langues

- [中文](./README.md)
- [English](./README_en.md)
