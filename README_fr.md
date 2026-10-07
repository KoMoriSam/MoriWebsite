<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="Logo KoMoriSam" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  Un jardin numérique personnel « 远方之森 » construit avec Vue 3, Vite SSG, Tailwind CSS et daisyUI, réunissant blog, lecteur de roman, jeux, recherche globale et outils en ligne.
</p>

<p align="center">
  <a href="https://komori.cc/">Site en ligne</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">Code source</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Signaler un problème</a>
</p>

<p align="center">
  Version actuelle : <strong>2.18.2</strong>
  ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

---

## Vue d'ensemble

MoriWebsite est le projet de site personnel de KoMoriSam. Son interface statique gère la lecture, les outils et les jeux ; un Worker Cloudflare fournit les annonces, le journal des modifications, les salles de jeu et d'autres API. Les articles et le roman sont conservés dans des dépôts séparés ; le build récupère un instantané du contenu, puis `vite-ssg` génère du HTML indexable pour les pages principales et les articles.

Le site comprend actuellement :

- une page d'accueil responsive avec profil, arrière-plan dynamique et liens de contact
- un blog filtrable par mot-clé, étiquette et année
- les volumes, la navigation entre chapitres et un lecteur paginé pour le roman original _Vers le lointain_ (`《向远方》`)
- une recherche globale couvrant articles, chapitres, versions du site et licences open source
- des commentaires Giscus au niveau des articles, chapitres et paragraphes
- des outils de conversion d'images, de conversion entre Unicode et anciens encodages de polices cinghalaises, et de consultation d'un serveur Minecraft
- des parties d'Avalon en ligne pour 5 à 10 joueurs
- des interfaces en chinois, anglais et cinghalais, ainsi que les thèmes, la progression de lecture et les préférences locales
- les annonces, le journal des modifications et un flux RSS du blog
- une page présentant les licences des dépendances, polices, icônes et autres contenus tiers

Routes de production :

```text
/
/blog
/blog/:articleId
/novel
/novel/:volumeSlug/:chapterSlug?
/tools
/tools/image-converter
/tools/sinhala-font-converter
/tools/server-status
/games
/games/avalon
/changelog
/announcements
/licenses
/kaiming
```

En développement, `/test` permet également de tester les composants. Les URL inconnues utilisent la vue 404 de l'application et le build de production génère un fichier `404.html` adapté à l'hébergement statique.

## Stack technique

- Vue 3, Vue Router, Pinia
- Vite 6, vite-ssg
- Tailwind CSS 4, daisyUI 5
- Pagefind 1.5
- Unhead, VueUse
- Markdown-it, MathJax, Mermaid, highlight.js
- Vue I18n, Cloudflare Workers, Durable Objects, KV, D1
- Sharp
- Giscus

## Fonctionnalités

### Contenu et lecture

- liste et détail des articles avec filtres combinés par mot-clé, étiquette et année
- volumes, navigation entre chapitres, nombre total de caractères, position de lecture et réglages persistants
- coloration du code Markdown, notes de bas de page, tâches, formules, encadrés, dialogues personnalisés, attributs et annotations ruby
- références d'images de style Obsidian, résolution des bannières, chargement différé et copie du code
- typographie, sommaire, barres latérales et progression adaptés aux ordinateurs et mobiles
- état de connexion GitHub utilisé pour l'accès à la lecture du roman ; son catalogue reste public

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

### Outils, jeux et langues

- conversion, compression et redimensionnement d'images par lot dans le navigateur, avec filigranes et prise en charge des animations
- conversion entre Unicode et anciens encodages de polices cinghalaises, avec export DOCX en mode document
- salles d'Avalon accessibles par code ou lien d'invitation, avec configuration des rôles, historique et reconnexion
- textes de l'interface en chinois, anglais et cinghalais chargés selon la page, avec préférence linguistique locale
- variantes WebP des images locales et, si disponibles, manifestes de variantes des sources du blog et du roman

### SSG, SEO et données de licence

- récupération des articles, du catalogue du roman et du journal avant le build pour créer un instantané SSG commun
- routes statiques pour les articles avec des données identiques lors du rendu serveur et de l'hydratation
- liens canonical, métadonnées Open Graph, Twitter Card et JSON-LD générés avec Unhead
- collecte des dépendances de production et des licences complémentaires pour la page intégrée et `dist/legal/`
- génération de l'index Pagefind et d'une page 404 adaptée à l'hébergement statique après le rendu
- génération du flux RSS du blog ; annonces publiées séparément dans KV et journal publié par les balises de version
- configuration de `dist/` comme répertoire de ressources statiques Cloudflare dans `wrangler.jsonc`

## Démarrage rapide

### Prérequis

- Node.js 24.15 ou version ultérieure de la série 24.x, ou version 26 et ultérieure
- pnpm (le flux de publication utilise la version 12.3.4)
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

Le hook `predev` génère les variantes d'images locales, les données du journal et celles des licences. Vite écoute par défaut sur `0.0.0.0`. Pour tester l'API des salles de jeu en local, lancez `pnpm dev:games-api` dans un autre terminal.

### Construire pour la production

```bash
pnpm build
```

Le flux de build complet :

1. génère les variantes des images locales et lit les manifestes d'images disponibles pour le blog et le roman ;
2. génère le journal, l'instantané SSG du contenu et le flux RSS du blog ;
3. collecte les dépendances et licences complémentaires ;
4. prérend le site et génère `404.html` ;
5. crée l'index Pagefind pour le blog, le roman, le journal et les licences, puis copie les fichiers de licence dans `dist/legal/`.

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
VITE_GAMES_API=
VITE_CHANGELOG_API=
VITE_ANNOUNCEMENTS_API=
VITE_ANALYTICS_API=
```

| Variable                  | Utilisation                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_BLOG_RAW`           | URL de base du fichier `index.json`, du Markdown et des images du blog ; requise pour le build de production |
| `VITE_NOVEL_RAW`          | URL de base du fichier `index.json` et des chapitres du roman ; requise pour le build de production          |
| `VITE_SERVER_ADDRESS`     | Serveur Minecraft interrogé par défaut sur la page des outils                                                |
| `VITE_RANDOM_HERO_API`    | Endpoint de l'arrière-plan aléatoire de l'accueil                                                            |
| `VITE_COMMENT_COUNTS_API` | Endpoint groupé facultatif pour le nombre de commentaires de paragraphe                                      |
| `VITE_GISCUS_CSS_RAW`     | URL de base des thèmes Giscus personnalisés                                                                  |
| `VITE_GAMES_API`          | URL facultative de l'API des salles de jeu ; une valeur par défaut existe en production                      |
| `VITE_CHANGELOG_API`      | URL facultative de l'API du journal ; une valeur par défaut existe en production                              |
| `VITE_ANNOUNCEMENTS_API`  | URL facultative de l'API des annonces ; une valeur par défaut existe en production                            |
| `VITE_ANALYTICS_API`      | URL facultative de l'API de statistiques ; une valeur par défaut existe en production                         |

Toutes ces variables utilisent le préfixe `VITE_` et sont exposées au code client. N'y placez aucun secret ni identifiant privé. `scripts/generate-routes.mjs` et `scripts/generate-pagefind-index.mjs` lisent tous deux `.env.production`.

## Scripts disponibles

| Commande                         | Utilisation                                                           |
| -------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                       | Générer les données de licence et lancer le serveur de développement  |
| `pnpm build`                     | Générer le site SSG, l'index de recherche et les licences distribuées |
| `pnpm preview`                   | Prévisualiser localement `dist/`                                      |
| `pnpm deploy`                    | Construire et déployer le site avec Wrangler                          |
| `pnpm release prepare <version>` | Préparer le journal, les instantanés et l'annonce                     |
| `pnpm dev:games-api`            | Démarrer l'API locale des salles de jeu                              |
| `pnpm api-worker`               | Déployer séparément l'API Worker                                      |
| `pnpm announcement publish`     | Publier séparément les annonces dans KV                              |

Après validation des changements de version, l'envoi d'une balise `v<version>` permet à GitHub Actions de déployer le site et de publier le journal. `announcements/` est ignoré par Git : vérifiez avec `pnpm announcement publish --dry-run`, puis publiez séparément avec `pnpm announcement publish --yes`. Déployez aussi l'API Worker séparément si nécessaire.

## Structure du projet

```text
src/
  assets/          # styles globaux, thèmes, lecture et polices
  components/
    novel/         # catalogue, informations de chapitre et lecteur
    markdown/      # rendu Markdown et extensions
    games/         # salles de jeu, Avalon et interface de Fogport
    tools/         # composants des outils
    layout/        # navigation et structure des pages
  games/           # catalogue et routes des jeux
  i18n/            # textes des trois langues chargés par page
  composables/     # logique de lecture, de jeu et de compte
  services/        # contenu, recherche, annonces et requêtes API
  stores/          # thème, roman et état de lecture
  router/          # routes et données SSG/licences générées au build
  utils/           # extensions Markdown, stockage, ressources et mises à jour
  views/           # pages associées aux routes

scripts/
  generate-routes.mjs                # crée les routes d'articles et l'instantané SSG
  generate-images.mjs                # crée les variantes locales et lit les manifestes distants
  generate-rss.mjs                   # crée le flux RSS du blog
  generate-pagefind-index.mjs        # crée l'index Pagefind global personnalisé
  generate-third-party-licenses.mjs  # collecte et distribue les données de licence
  api-worker.js                      # point d'entrée de l'API Cloudflare et des salles de jeu

licenses/          # licences complémentaires des polices, icônes et autres ressources
mock/              # copies locales ignorées par Git du blog et du roman
public/
  assets/          # images, polices et icônes
  archive/         # anciennes pages statiques archivées
  changelog.json    # données des versions pour les anciens clients
  changelog.v1.json # secours statique de l'API du journal
```

## Notes sur le contenu et le build

- Le blog et le roman sont maintenus dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon).
- `src/router/ssg-data.generated.js` et `src/router/license-data.generated.js` sont générés automatiquement, ignorés par Git et ne doivent pas être modifiés manuellement.
- La configuration publique des dépôts et catégories Giscus est centralisée dans `src/constants/config.js`.
- La logique du blog, du roman et de la recherche globale se trouve dans `src/services/api-articles.js`, `src/services/api-chapters.js` et `src/services/search-content.js`.
- Les extensions Markdown se trouvent dans `src/utils/markdown/` ; `src/utils/resolve-article-assets.js` résout les images et bannières des articles.
- Les sources du journal se trouvent dans `changelog/releases/` et génèrent `public/changelog.json` et `public/changelog.v1.json` ; les annonces locales dans `announcements/` sont ignorées par Git.
- Les ressources statiques du site et l'API Worker sont configurés respectivement dans `wrangler.jsonc` et `wrangler.api.jsonc`.

## Compatibilité

Le projet vise principalement les versions récentes de Chrome, Firefox, Microsoft Edge et des navigateurs mobiles courants. Le build active également le plugin legacy de Vite pour produire des ressources de compatibilité supplémentaires destinées aux anciens navigateurs.

## Licence

Sauf indication contraire, le code source logiciel original de ce dépôt est distribué sous [licence MIT](./LICENSE). Les bibliothèques, polices, icônes, images, articles et autres contenus non logiciels de tiers restent soumis à leurs licences ou mentions de droits respectives et ne sont pas placés sous licence MIT. Consultez les [mentions relatives aux tiers](./THIRD_PARTY_NOTICES.md), leur [version chinoise](./THIRD_PARTY_NOTICES.zh-CN.md) et la page intégrée [`/licenses`](https://komori.cc/licenses).

Les builds de production incluent les licences des dépendances d'exécution, la licence du projet, les mentions tierces et les licences complémentaires dans `dist/legal/`.

## Langues

- [中文](./README.md)
- [English](./README_en.md)
