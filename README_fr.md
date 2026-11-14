<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">远方之森 · MoriWebsite</h1>

<p align="center">
  Écrire sur la technique et le quotidien, lire des récits originaux, explorer le texte et l’image, et jouer entre amis.
</p>

<p align="center">
  <a href="https://komori.cc/">Visiter le site</a> ·
  <a href="https://komori.cc/blog">Blog</a> ·
  <a href="https://komori.cc/novel">Roman</a> ·
  <a href="https://komori.cc/tools">Outils</a> ·
  <a href="https://komori.cc/games">Jeux</a> ·
  <a href="https://komori.cc/changelog">Journal des modifications</a>
</p>

<p align="center">
  <a href="./README.md">简体中文</a> ·
  <a href="./README_en.md">English</a> ·
  Français ·
  <a href="./README_si.md">සිංහල</a>
</p>

<p align="center">
  Version actuelle : <strong>2.21.2</strong>
</p>

## À propos de 远方之森

**远方之森** est le site personnel de Mori et un projet web qui continue d’évoluer. Il réunit des notes techniques, des essais, des notes de lecture et un roman original, ainsi que des outils utilisables dans le navigateur, des jeux multijoueurs et des projets de design indépendants.

Le site est conçu pour lire et utiliser ses outils au quotidien. Les articles disposent d’une interface de lecture dédiée et d’un espace de discussion intégré. Les outils fonctionnent autant que possible dans le navigateur, et les interfaces sur ordinateur et sur mobile sont adaptées à leurs usages respectifs. Ce dépôt public contient le code du site ; le blog, le roman et les autres contenus sont gérés dans des dépôts distincts.

## Que faire sur le site ?

| Contenu | Accès et fonctionnalités |
| --- | --- |
| **Blog** | [Lire les articles](https://komori.cc/blog) : rechercher par mot-clé, étiquette et année, lire des notes techniques et des essais, et passer d’une traduction publiée à l’autre. |
| **Roman original : Vers le lointain (《向远方》)** | [Parcourir les volumes et les chapitres](https://komori.cc/novel) : reprendre la lecture grâce à la table des matières, au suivi de la progression et aux réglages de mise en page. Le texte intégral est réservé aux personnes connectées qui disposent d’une autorisation. |
| **Conversion d’images** | [Convertisseur de formats d’image](https://komori.cc/tools/image-converter) : convertir des images par lot, les compresser, les redimensionner, ajouter des filigranes et traiter les images animées. |
| **Traitement de texte cinghalais** | [Convertisseur d’encodage de polices](https://komori.cc/tools/sinhala-font-converter) : convertir du texte entre Unicode et les anciens encodages de polices, y compris dans des fichiers DOCX, PPTX et PDF dont le texte est sélectionnable. |
| **Consultation de serveurs Minecraft** | [État des serveurs](https://komori.cc/tools/server-status) : vérifier la connectivité et consulter les informations en ligne des serveurs des éditions Java et Bedrock. |
| **Jeux de société multijoueurs** | [Avalon](https://komori.cc/games/avalon) : jeu de déduction sociale en ligne pour 5 à 10 personnes. [Fogport](https://komori.cc/games/fogport) : jeu de société expérimental de gestion économique pour 2 à 4 personnes, encore inachevé. |
| **Ponctuation Kaiming** | [Présentation du projet](https://komori.cc/kaiming) : découvrir le dessin des signes de ponctuation et les ressources typographiques associées. |

## Lecture et discussions

Le blog et le roman partagent une même interface de lecture, avec une table des matières, le suivi de la progression, des réglages de police et de mise en page, des thèmes et un mode de lecture adapté aux écrans tactiles. Les préférences et la progression sont enregistrées dans le navigateur utilisé.

Les articles prennent en charge la coloration syntaxique, les formules mathématiques, les diagrammes Mermaid, les notes de bas de page, les annotations de prononciation (ruby), les liens wiki et d’autres extensions Markdown. Il est possible d’accéder directement à un titre ou à un paragraphe, de consulter des contenus associés ou de transformer une sélection en image à partager. Les articles affichent aussi des recommandations, la date de leur dernière modification et des indications sur l’actualité des informations.

**Les commentaires du site sont directement reliés à GitHub Discussions.** Après connexion avec GitHub, on peut publier, répondre, modifier ou supprimer ses commentaires et ajouter des réactions depuis le site. Des espaces de discussion sont accessibles pour les articles, les chapitres du roman et les paragraphes. Les commentaires peuvent être triés par popularité, du plus récent au plus ancien ou dans l’ordre inverse. L’affichage des longs commentaires et des fils de réponses imbriqués est adapté aux différentes tailles d’écran. Les discussions du blog et du roman sont conservées respectivement dans [theWake](https://github.com/KoMoriSam/theWake) et [theHorizon](https://github.com/KoMoriSam/theHorizon), sans interface de commentaires externe intégrée à la page.

L’interface du site est disponible en **chinois simplifié, anglais, français et cinghalais**. Les traductions du blog ont chacune leur propre URL, ce qui facilite leur partage et leur indexation. On peut changer la langue d’un article indépendamment de celle de l’interface.

Le raccourci `Ctrl + K` (`Cmd + K` sur macOS) ouvre la recherche sur le site, qui permet de trouver des articles, des chapitres, des notes de version et des informations sur les licences. Le blog propose aussi un [flux RSS](https://komori.cc/rss.xml).

## Technologies et architecture

| Domaine | Principaux choix techniques |
| --- | --- |
| Interface | Vue 3, Vue Router, Pinia, Vite, Tailwind CSS, daisyUI |
| Rendu des contenus | Vite SSG, Markdown-it, Pele (Mermaid), Pagefind, pages d’articles générées séparément pour chaque langue |
| Côté serveur | Cloudflare Workers, D1, KV, R2, Durable Objects |
| Connexion et discussions | GitHub OAuth et GitHub Discussions, avec l’interface de commentaires et l’API propres au site |
| Construction et publication | GitHub Actions, Cloudflare Workers Builds, instantanés de construction, génération statique incrémentale et déploiements versionnés |

Les pages statiques prégénérées servent le contenu public et les métadonnées de référencement. Les Workers prennent en charge les fonctions dynamiques, comme la connexion, les discussions, les statistiques et les jeux en ligne. Le blog et le roman suivent des processus de publication indépendants du code du site.

Le processus de construction examine les changements pour décider s’il faut ignorer la construction, mettre à jour certaines pages statiques ou reconstruire l’ensemble du site. Les instantanés permettent de réutiliser les variantes d’images et d’autres fichiers générés. Les versions candidates sont isolées du trafic de production pour permettre leur vérification avant la bascule et, si nécessaire, le retour à une version précédente.

## Développement local

Prérequis : **Node.js 24.15 ou supérieur dans la série 24.x, ou Node.js 26 ou supérieur**, et **pnpm 12.3.4**.

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
pnpm dev
```

`pnpm dev` prépare automatiquement les services et les données de test isolés pour l’API, l’authentification, les commentaires et le roman, puis lance le site avec du contenu de démonstration. **Aucun accès aux dépôts de contenu privés ni aux secrets de production n’est nécessaire.** Ouvrez l’adresse affichée dans le terminal.

Commandes courantes :

| Commande | Utilité |
| --- | --- |
| `pnpm menu` | Ouvrir le menu interactif pour le développement, les vérifications, la construction et la publication. |
| `pnpm dev` | Lancer le site en local et ses services de test. |
| `pnpm dev:seed` | Actualiser les données de test locales isolées. |
| `pnpm dev games` | Lancer uniquement le service local des jeux multijoueurs. |
| `pnpm check` | Afficher les vérifications disponibles ; par exemple, lancer `pnpm check markdown`. |
| `pnpm build` | Générer le site, l’index de recherche et les ressources à partir des sources de contenu complètes. |
| `pnpm preview` | Prévisualiser le site généré. |
| `pnpm run build:smart --dry-run` | Voir le mode de construction qui serait utilisé et ce qui serait mis à jour. |

Une **construction complète pour la production** utilise les contenus réels. Indiquez les répertoires de contenu locaux avec `CONTENT_BLOG_DIR` et `CONTENT_NOVEL_DIR`, ou fournissez un `CONTENT_GITHUB_TOKEN` autorisé à lire les dépôts de contenu privés. Les jetons d’accès et les identifiants de déploiement doivent être fournis sous forme de secrets d’environnement. Ils ne doivent figurer ni dans le dépôt ni dans les variables `VITE_` accessibles côté client.

## Publication des contenus et des versions

Le code du site est développé et maintenu sur `main`, tandis que les versions publiées sont hébergées sur `production`. GitHub Actions prépare les commits et les tags de publication. Cloudflare construit et vérifie la version, puis la met en service. Les mises à jour du blog, du roman et des polices peuvent déclencher leurs propres constructions. Consultez le [journal des modifications](https://komori.cc/changelog) et les [annonces du site](https://komori.cc/announcements) pour en savoir plus.

Le code du site se trouve principalement dans `src/`, les Workers côté serveur dans `workers/`, et les scripts de construction, de vérification et de publication dans `scripts/`. Les notes de version sont conservées dans `changelog/releases/`. La publication automatisée repose sur des réglages propres à ce dépôt et à son environnement Cloudflare. Un déploiement sur un autre compte nécessite sa propre configuration.

## Droits d’auteur et licences

- **Code logiciel original de ce dépôt** : [licence MIT](./LICENSE).
- **Articles originaux du blog** : [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) par défaut ; la mention figurant dans chaque article fait foi.
- **Roman original : Vers le lointain (《向远方》)** : tous droits réservés.
- **Polices, images, icônes et autres ressources tierces** : soumises à leurs licences ou mentions de droits respectives.
- **Commentaires des lecteurs** : les droits restent la propriété de leurs auteurs.

Les informations relatives aux licences des ressources tierces sont disponibles sur la [page des licences du site](https://komori.cc/licenses), dans les [mentions en chinois](./THIRD_PARTY_NOTICES.zh-CN.md) et dans les [mentions en anglais](./THIRD_PARTY_NOTICES.md).

## Retours et suggestions

Signalez un problème ou proposez une amélioration via les [issues GitHub](https://github.com/KoMoriSam/MoriWebsite/issues). Pour discuter d’un article ou du roman, vous pouvez aussi laisser un commentaire sur la page concernée.
