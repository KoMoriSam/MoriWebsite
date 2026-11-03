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
  Version actuelle : <strong>2.20.2</strong>
  ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

## Pour commencer

远方之森 est le site personnel de Mori. Il rassemble des explorations techniques, des essais, des notes de lecture, un roman original, des outils du quotidien et des jeux de société multijoueurs. Il est accessible directement sur ordinateur ou téléphone.

| Votre objectif | Où aller |
| --- | --- |
| Lire des articles | [Blog](https://komori.cc/blog) : rechercher par mot-clé, étiquette et année, puis choisir parmi les versions linguistiques publiées |
| Suivre le roman | [Vers le lointain /《向远方》](https://komori.cc/novel) : parcourir les volumes et chapitres, reprendre la lecture et régler la mise en page |
| Convertir des images | [Convertisseur d'images](https://komori.cc/tools/image-converter) : conversion par lot, compression, redimensionnement, filigranes et traitement d'animations |
| Traiter du texte cinghalais | [Convertisseur d'encodage de polices](https://komori.cc/tools/sinhala-font-converter) : convertir entre Unicode et encodages traditionnels, y compris dans des documents |
| Consulter un serveur | [État d'un serveur Minecraft](https://komori.cc/tools/server-status) : vérifier sa connexion et ses informations en ligne |
| Jouer entre amis | [Avalon](https://komori.cc/games/avalon), déduction sociale pour 5 à 10 joueurs ; [Fogport](https://komori.cc/games/fogport), jeu de gestion pour 2 à 4 joueurs |
| Découvrir le projet de polices | [Kaiming](https://komori.cc/kaiming) : présentation du projet et ressources typographiques |

## Lecture et discussions

Le blog et le roman proposent un sommaire, un suivi de progression et des réglages de mise en page. Le thème, la position de lecture et les préférences sont conservés dans le navigateur utilisé pour faciliter la reprise. Les articles peuvent contenir du code, des formules, des diagrammes, des notes de bas de page et des annotations ruby ; les blocs de code peuvent être copiés.

Appuyez sur `Ctrl + K` (`Cmd + K` sur macOS) pour rechercher des passages d'articles, des chapitres, des notes de version et des mentions de licence. Les filtres par type, étiquette, volume ou année permettent d'accéder directement au contenu pertinent.

L'interface est disponible en chinois, anglais, français et cinghalais. Les articles proposent leurs traductions disponibles et signalent la langue affichée lorsque la langue choisie n'est pas disponible.

Le catalogue du roman est public ; la lecture des chapitres nécessite une connexion GitHub. Giscus permet de discuter des articles, des chapitres et de paragraphes précis. Un compte GitHub est nécessaire pour publier un commentaire. Les discussions du blog et du roman sont hébergées respectivement dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon).

Abonnez-vous au [flux RSS](https://komori.cc/rss.xml) pour suivre le blog. Les évolutions du site sont présentées dans le [journal des modifications](https://komori.cc/changelog) et les [annonces](https://komori.cc/announcements).

## Outils et jeux

**Le convertisseur d'images** traite les images dans le navigateur. Il permet de préparer des lots, réduire la taille des fichiers, uniformiser les dimensions, ajouter des filigranes textuels ou graphiques et traiter des images animées.

**Le convertisseur d'encodage de polices cinghalaises** convertit entre Unicode et encodages traditionnels. Vous pouvez coller du texte ou traiter des fichiers DOCX, PPTX et PDF contenant du texte sélectionnable, puis exporter un DOCX ou un PPTX modifiable.

**Les jeux de société multijoueurs** permettent de rejoindre une même salle avec un code ou un lien d'invitation. Avalon propose la configuration des rôles, les votes d'équipe, les missions et l'historique des parties. Fogport repose sur les industries, les liaisons, les ressources et les ventes ; il s'agit d'une version de test dont le développement est suspendu et certaines fonctions restent inachevées.

## Utilisation des contenus

| Contenu | Conditions |
| --- | --- |
| Code source logiciel original de ce dépôt | [Licence MIT](./LICENSE) |
| Articles originaux du blog | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) par défaut ; consulter la licence indiquée sur chaque article |
| Roman original Vers le lointain /《向远方》 | Tous droits réservés (All Rights Reserved) |
| Bibliothèques, polices, icônes, images et autres éléments tiers | Leurs licences ou mentions de droits respectives |
| Commentaires des lecteurs | Les droits restent à leurs auteurs, selon leurs mentions de droits |

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

| Variable d'environnement | Utilisation |
| --- | --- |
| `VITE_SERVER_ADDRESS` | Serveur Minecraft interrogé par défaut |
| `VITE_RANDOM_HERO_API` | Service d'arrière-plan aléatoire de l'accueil |
| `VITE_COMMENT_COUNTS_API` | Nombre de commentaires par paragraphe |
| `VITE_GAMES_API` | Service des salles multijoueurs |
| `VITE_CHANGELOG_API`, `VITE_ANNOUNCEMENTS_API` | Services du journal et des annonces |
| `VITE_ANALYTICS_API` | Service de statistiques de fréquentation |

Les variables `VITE_` sont intégrées au code client et doivent contenir uniquement une configuration publique. Conservez les jetons des dépôts privés et les identifiants de déploiement dans les Secrets de l'environnement de build.

## Construire et publier

Workers Builds construit le site et les contenus ensemble, puis Workers Static Assets les héberge. Un build de production complet nécessite l'accès aux deux dépôts privés de contenu, ou des Vaults locaux indiqués par `CONTENT_BLOG_DIR` et `CONTENT_NOVEL_DIR`. Les exporteurs travaillent sur des copies temporaires ; le site, le RSS et l'index de recherche utilisent le même instantané de contenu.

| Source ou ressource | Publication |
| --- | --- |
| Code du site | Après validation, une balise `v<version>` avance `production` et déclenche Workers Builds ; les commits ordinaires de `main` sont mis en ligne lors d'une version |
| Blog et roman | Les dépôts privés `ObsidianVault` et `MyWritingVault` conservent les sources ; chacun utilise son `WORKERS_BUILD_HOOK` pour reconstruire `production` après une mise à jour |
| Polices Kaiming | Les ressources proviennent d'une GitHub Release de `KoMoriSam/Kaiming` et sont vérifiées avant publication ; une version des polices déclenche le build par son Hook |
| Ressources Giscus | Thèmes et animation de chargement sont maintenus dans `giscus/` et publiés séparément depuis un terminal local avec `pnpm run deploy giscus` |
| Images et autres ressources de contenu | Publiées avec le Worker de contenu ; R2 est facultatif et actuellement désactivé |

Les ressources utilisent `raw.komori.cc` : `/post` pour le blog, `/novel` pour le roman, `/giscus` pour les thèmes de commentaires, `/kaiming` pour les polices et `/giscus/images/spin.gif` pour l'animation de chargement. `theWake` et `theHorizon` hébergent les discussions ; les sources privées fournissent les textes publiés.

Workers Builds surveille `production`, exécute `pnpm build`, puis déploie avec `pnpm run deploy website`. Son Secret de build `CONTENT_GITHUB_TOKEN` doit disposer d'un accès Contents en lecture seule aux deux dépôts privés. Les Hooks de contenu ciblent également `production` : leurs mises à jour utilisent donc le code du site déjà publié. GitHub Actions assure la validation des versions, le déclenchement des builds et les autres automatisations.

| Commande | Résultat |
| --- | --- |
| `pnpm build` | Générer le site dans `dist/`, les ressources dans `.output/content/`, le RSS, l'index de recherche et les licences |
| `pnpm preview` | Prévisualiser le site construit pour la production |
| `pnpm check <cible>` | Exécuter les vérifications ciblées ; sans cible, afficher les options |
| `pnpm generate <cible>` | Générer les ressources choisies ; sans cible, afficher les options |
| `pnpm release prepare <version>` | Préparer le numéro de version, les notes et le brouillon d'annonce |
| `pnpm release verify <version>` | Vérifier la cohérence des versions du paquet, des README et du journal |
| `pnpm run deploy <cible>` | Publier le site, les contenus, l'API ou Giscus ; sans cible, afficher les options |
| `pnpm release announcement publish` | Publier les annonces séparément |

Les annonces sont regroupées sous `x.y.0`. Maintenance, optimisations et corrections sont intégrées à la même annonce pour présenter l'expérience complète d'une version en un seul endroit. Le front matter des articles peut préciser une `license` ; la valeur par défaut est `CC BY-NC-SA 4.0`, et les traductions héritent de la licence originale sauf indication contraire.

Les pages se trouvent dans `src/views/`, leurs composants et leur logique dans `src/components/`, `src/composables/` et `src/utils/`. Les commandes de build et de publication se trouvent dans `scripts/`, les services Cloudflare dans `workers/`.

## Retours et participation

[Ouvrez une issue](https://github.com/KoMoriSam/MoriWebsite/issues) pour signaler un problème ou proposer une amélioration. Précisez la page, les étapes, le résultat attendu, le comportement observé et la version du navigateur. Pour échanger sur les textes, utilisez les commentaires de l'article ou du roman.

## Langues

- [中文](./README.md)
- [English](./README_en.md)
- [සිංහල](./README_si.md)
