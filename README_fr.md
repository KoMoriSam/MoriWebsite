<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite · 远方之森</h1>

<p align="center">
  Lire des articles et un roman original, traiter des images et des documents cinghalais, et jouer entre amis.
</p>

<p align="center">
  <a href="https://komori.cc/">Visiter le site</a>
  ·
  <a href="https://komori.cc/rss.xml">S'abonner au blog</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Signaler un problème</a>
</p>

<p align="center">
  <a href="https://github.com/KoMoriSam/MoriWebsite/blob/main/README.md">中文</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/blob/main/README_en.md">English</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/blob/main/README_si.md">සිංහල</a>
</p>

<p align="center">
  Version actuelle : <strong>2.21.1</strong>
  ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

## Pour commencer

远方之森 est le site personnel de Mori. Il rassemble des explorations techniques, des essais, des notes de lecture, un roman original, des outils du quotidien et des jeux de société multijoueurs. Il est accessible directement sur ordinateur ou téléphone.

| Votre objectif                 | Où aller                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lire des articles              | [Blog](https://komori.cc/blog) : rechercher par mot-clé, étiquette et année, puis choisir parmi les versions linguistiques publiées                                      |
| Suivre le roman                | [Vers le lointain /《向远方》](https://komori.cc/novel) : parcourir les volumes et chapitres, reprendre la lecture et régler la mise en page                             |
| Convertir des images           | [Convertisseur d'images](https://komori.cc/tools/image-converter) : conversion par lot, compression, redimensionnement, filigranes et traitement d'animations            |
| Traiter du texte cinghalais    | [Convertisseur d'encodage de polices](https://komori.cc/tools/sinhala-font-converter) : convertir entre Unicode et encodages traditionnels, y compris dans des documents |
| Consulter un serveur           | [État d'un serveur Minecraft](https://komori.cc/tools/server-status) : vérifier sa connexion et ses informations en ligne                                                |
| Jouer entre amis               | [Avalon](https://komori.cc/games/avalon), déduction sociale pour 5 à 10 joueurs ; [Fogport](https://komori.cc/games/fogport), jeu de gestion pour 2 à 4 joueurs          |
| Découvrir le projet de polices | [Kaiming](https://komori.cc/kaiming) : présentation du projet et ressources typographiques                                                                               |

## Lecture et discussions

Le blog et le roman proposent un sommaire, un suivi de progression et des réglages de mise en page. Le thème, la position de lecture et les préférences sont conservés dans le navigateur utilisé pour faciliter la reprise. Les articles peuvent contenir du code, des formules, des diagrammes, des notes de bas de page et des annotations ruby ; les blocs de code peuvent être copiés.

Appuyez sur `Ctrl + K` (`Cmd + K` sur macOS) pour rechercher des passages d'articles, des chapitres, des notes de version et des mentions de licence. Les filtres par type, étiquette, volume ou année permettent d'accéder directement au contenu pertinent.

L'interface est disponible en chinois, anglais, français et cinghalais. Les articles proposent leurs traductions disponibles et signalent la langue affichée lorsque la langue choisie n'est pas disponible.

Le catalogue du roman est public ; la lecture des chapitres nécessite une connexion GitHub. Giscus permet de discuter des articles, des chapitres et de paragraphes précis. Un compte GitHub est nécessaire pour publier un commentaire. Les discussions du blog et du roman sont hébergées respectivement dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon).

Abonnez-vous au [flux RSS](https://komori.cc/rss.xml) pour suivre le blog. Les évolutions du site sont présentées dans le [journal des modifications](https://komori.cc/changelog) et les [annonces](https://komori.cc/announcements).

## Outils et jeux

**Le convertisseur d'images** traite les images dans le navigateur. Il permet de préparer des lots, réduire la taille des fichiers, uniformiser les dimensions, ajouter des filigranes textuels ou graphiques et traiter des images animées.

**Le convertisseur d'encodage de polices cinghalaises** convertit entre Unicode et encodages traditionnels. Vous pouvez coller du texte ou traiter des fichiers DOCX et PPTX. Pour un PDF contenant du texte sélectionnable, vous pouvez exporter le contenu dans un DOCX modifiable ou la mise en page dans un PPTX modifiable.

**Les jeux de société multijoueurs** permettent de rejoindre une même salle avec un code ou un lien d'invitation. Avalon propose la configuration des rôles, les votes d'équipe, les missions et l'historique des parties. Fogport repose sur les industries, les liaisons, les ressources et les ventes ; il s'agit d'une version de test dont le développement est suspendu et certaines fonctions restent inachevées.

## Utilisation des contenus

| Contenu                                                         | Conditions                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Code source logiciel original de ce dépôt                       | [Licence MIT](./LICENSE)                                                                                                            |
| Articles originaux du blog                                      | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) par défaut ; consulter la licence indiquée sur chaque article |
| Roman original Vers le lointain /《向远方》                     | Tous droits réservés (All Rights Reserved)                                                                                          |
| Bibliothèques, polices, icônes, images et autres éléments tiers | Leurs licences ou mentions de droits respectives                                                                                    |
| Commentaires des lecteurs                                       | Les droits restent à leurs auteurs, selon leurs mentions de droits                                                                  |

La fiche d'attribution de chaque article présente son titre, son lien, son auteur, sa date de publication et sa licence pour identifier la source et les conditions applicables. Les licences tierces sont consultables sur la [page des licences](https://komori.cc/licenses), dans les [mentions en anglais](./THIRD_PARTY_NOTICES.md) et les [mentions en chinois](./THIRD_PARTY_NOTICES.zh-CN.md).

## Exécuter en local

Le projet utilise Vue 3, Vite SSG, Tailwind CSS, daisyUI et Pagefind. Les API serveur fonctionnent sur Cloudflare Workers. Utilisez Node.js 24.15 ou une version ultérieure de la série 24.x, ou Node.js 26 et ultérieur, avec pnpm 12.3.4.

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
```

Créez `.env.development` à la racine du projet pour définir les adresses des contenus et des thèmes de commentaires :

```dotenv
VITE_BLOG_RAW=https://raw.komori.cc/post
VITE_NOVEL_RAW=https://raw.komori.cc/novel
VITE_GISCUS_CSS_RAW=https://raw.komori.cc/giscus
```

```bash
pnpm dev
```

Ouvrez l'adresse affichée dans le terminal. Les adresses de contenu peuvent aussi pointer vers vos propres copies locales ; `mock/` et les fichiers `.env*` sont ignorés par Git. Pour développer les salles multijoueurs, lancez `pnpm dev games` dans un autre terminal.

Configurez les autres services selon vos besoins :

| Variable d'environnement                       | Utilisation                                   |
| ---------------------------------------------- | --------------------------------------------- |
| `VITE_SERVER_ADDRESS`                          | Serveur Minecraft interrogé par défaut        |
| `VITE_RANDOM_HERO_API`                         | Service d'arrière-plan aléatoire de l'accueil |
| `VITE_COMMENT_COUNTS_API`                      | Nombre de commentaires par paragraphe         |
| `VITE_GAMES_API`                               | Service des salles multijoueurs               |
| `VITE_CHANGELOG_API`, `VITE_ANNOUNCEMENTS_API` | Services du journal et des annonces           |
| `VITE_ANALYTICS_API`                           | Service de statistiques de fréquentation      |

Les variables `VITE_` sont intégrées au code client et doivent contenir uniquement une configuration publique. Conservez les jetons des dépôts privés et les identifiants de déploiement dans les Secrets de l'environnement de build.

## Construire et publier

### Construire en local

Indiquez les Vaults locaux avec `CONTENT_BLOG_DIR` et `CONTENT_NOVEL_DIR`, ou utilisez `CONTENT_GITHUB_TOKEN` pour lire les deux dépôts privés de contenu. Le site, le flux RSS et l'index de recherche utilisent le même export.

Ouvrez `pnpm menu` et choisissez une opération avec les touches fléchées et Entrée.

| Commande                            | Résultat                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                        | Effectuer un build complet du site dans `dist/` et des ressources dans `.output/content/`                                               |
| `pnpm run build:smart`              | Utiliser l'instantané local pour choisir entre un build incrémental et un build complet ; ajouter `--full` pour forcer un build complet |
| `pnpm run build:smart --dry-run`    | Voir le mode de build et les changements prévus sans déployer                                                                           |
| `pnpm preview`                      | Prévisualiser le site généré                                                                                                            |
| `pnpm check <cible>`                | Exécuter les vérifications ciblées ; sans cible, afficher les options                                                                   |
| `pnpm generate <cible>`             | Générer les ressources choisies ; sans cible, afficher les options                                                                      |
| `pnpm release prepare <version>`    | Préparer le numéro de version et les notes                                                                      |
| `pnpm release verify <version>`     | Vérifier la cohérence des versions du paquet, des README et du journal                                                                  |
| `pnpm run deploy <cible>`           | Publier le site, les contenus, l'API ou Giscus ; sans cible, afficher les options                                                       |
| `pnpm release announcement publish` | Publier les annonces séparément                                                                                                         |

### Publier en production

| Source de la mise à jour                 | Mise en ligne                                                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code du site                             | Lancez **发布网站** depuis `main` dans GitHub Actions. Le workflow finalise le brouillon, crée le commit et la balise, puis avance `production`. Cloudflare vérifie le déploiement et synchronise les notes de version. |
| Blog et roman                            | Une mise à jour dans l'un des dépôts privés `ObsidianVault` ou `MyWritingVault` déclenche son `WORKERS_BUILD_HOOK` et utilise le code du site déjà publié sur `production`.      |
| Polices Kaiming                          | Une nouvelle version déclenche un Deploy Hook. Le build télécharge et vérifie les ressources de la GitHub Release de `KoMoriSam/Kaiming`.                                        |
| Thèmes Giscus et animation de chargement | Maintenus dans `giscus/` et publiés séparément avec `pnpm run deploy giscus`.                                                                                                    |

Workers Builds restaure l'instantané du dernier déploiement réussi. Si seul le contenu change et que l'instantané est compatible, la génération statique incrémentale reconstruit les pages et les ressources concernées et réutilise le code du site déjà compilé. Le build est complet si le code du site ou la configuration de build change, ou si l'instantané est inutilisable. S'il n'y a rien à publier, le déploiement est ignoré. Les deux modes réutilisent les variantes d'image valides déjà en cache. Le journal de build indique `INCREMENTAL`, `FULL` ou `SKIPPED`.

Une publication incrémentale ne déploie que les Workers dont les fichiers générés ont changé. Workers Static Assets sert le site et ses contenus. Le compartiment R2 privé conserve les instantanés de build. Les textes et images du blog et du roman restent accessibles via `raw.komori.cc/post` et `raw.komori.cc/novel`. Sur le même domaine, `/kaiming` sert les polices et `/giscus` les thèmes de commentaires, avec l'animation à l'adresse `/giscus/images/spin.gif`.

Dans `pnpm menu`, ouvrez **内容管理** pour rédiger le brouillon et poussez-le sur `main` avec le code. Dans **发布**, ouvrez GitHub Actions et cliquez sur **Run workflow**. En cas d’échec, consultez les journaux Workers Builds et relancez le build. Pour activer la publication, configurez la variable `RELEASE_APP_CLIENT_ID` et le secret `RELEASE_APP_PRIVATE_KEY` dans GitHub Settings → Environments → production, puis autorisez `main` à utiliser cet environnement. L’application doit avoir les droits de lecture et d’écriture sur Contents et pouvoir avancer `main` et `production` et créer les balises de version. Le jeton Cloudflare doit pouvoir modifier Workers Scripts et Workers KV Storage.

Dans les paramètres Workers Builds de `website`, choisissez `production` comme branche de production, laissez la commande de build vide et définissez la commande de déploiement sur `pnpm run build:smart --deploy`. Configurez les variables suivantes dans l'environnement de build de production :

| Paramètre                                                    | Valeur                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTENT_GITHUB_TOKEN` (secret)                              | Jeton GitHub avec accès Contents en lecture seule aux deux dépôts privés de contenu                                                                                                                                          |
| `SSG_R2_ENDPOINT`, `SSG_R2_BUCKET`, `SSG_SNAPSHOT_NAMESPACE` | Point de terminaison de l'API S3 de R2 sans le chemin du compartiment, nom du compartiment privé des instantanés et `production`, respectivement                                                                             |
| `SSG_R2_ACCESS_KEY`, `SSG_R2_SECRET_KEY` (secrets)           | Identifiant de clé d'accès et clé secrète issus des mêmes [identifiants S3 de R2](https://developers.cloudflare.com/r2/get-started/s3/), avec l'autorisation **Object Read & Write** limitée au compartiment des instantanés |

Les annonces sont regroupées sous `x.y.0`. Maintenance, optimisations et corrections sont intégrées à la même annonce pour présenter l'expérience complète d'une version en un seul endroit. Le front matter des articles peut préciser une `license` ; la valeur par défaut est `CC BY-NC-SA 4.0`, et les traductions héritent de la licence originale sauf indication contraire.

Les pages se trouvent dans `src/views/`, leurs composants et leur logique dans `src/components/`, `src/composables/` et `src/utils/`. Les commandes de build et de publication se trouvent dans `scripts/`, les services Cloudflare dans `workers/`.

## Retours et participation

[Ouvrez une issue](https://github.com/KoMoriSam/MoriWebsite/issues) pour signaler un problème ou proposer une amélioration. Précisez la page, les étapes, le résultat attendu, le comportement observé et la version du navigateur. Pour échanger sur les textes, utilisez les commentaires de l'article ou du roman.
