<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="KoMoriSam Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  A personal digital garden "远方之森" built with Vue 3, Vite SSG, Tailwind CSS, and daisyUI, featuring a blog, novel reader, games, site-wide search, and online tools.
</p>

<p align="center">
  <a href="https://komori.cc/">Live Site</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">Source Code</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Issues</a>
</p>

<p align="center">
  Current version: <strong>2.18.2</strong>
  ·
  <a href="https://komori.cc/changelog">Changelog</a>
</p>

---

## Overview

MoriWebsite is KoMoriSam's personal website project. Its static frontend handles reading, tools, and game interfaces, while a Cloudflare Worker serves announcements, changelogs, game rooms, and other APIs. Blog posts and novel content live in separate repositories; production builds fetch a content snapshot and use `vite-ssg` to generate indexable HTML for the main pages and blog posts.

The site currently includes:

- a responsive profile homepage with dynamic backgrounds and contact links
- a blog with keyword, tag, and year filters
- volumes, chapter navigation, and a paginated reader for the original novel _Toward the Distance_
- site-wide search across blog posts, novel chapters, changelogs, and open-source licenses
- Giscus comments at article, chapter, and paragraph level
- browser-based image conversion, Sinhala Unicode/legacy-font conversion, and Minecraft server-status tools
- online Avalon games for 5–10 players
- Chinese, English, and Sinhala interfaces, plus themes, reading progress, and local reader preferences
- announcements, changelogs, and a blog RSS feed
- a license page for project dependencies, fonts, icons, and other third-party content

Production routes:

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

Development also exposes `/test` for component testing. Unknown URLs use the in-app 404 view, and production builds generate a `404.html` suitable for static hosting.

## Tech Stack

- Vue 3, Vue Router, Pinia
- Vite 6, vite-ssg
- Tailwind CSS 4, daisyUI 5
- Pagefind 1.5
- Unhead, VueUse
- Markdown-it, MathJax, Mermaid, highlight.js
- Vue I18n, Cloudflare Workers, Durable Objects, KV, D1
- Sharp
- Giscus

## Features

### Content and Reading

- blog list and detail views with combined keyword, tag, and year filtering
- novel volumes, chapter navigation, total word counts, persisted reading position, and reader settings
- Markdown code highlighting, footnotes, task lists, math, callouts, custom dialogue blocks, attributes, and ruby annotations
- Obsidian-style image references, banner resolution, lazy image loading, and code copying
- responsive typography, table of contents, sidebars, and reading progress on desktop and mobile
- a GitHub sign-in state for the novel-reading gate; the novel catalog remains public

### Search and Discovery

- open global search with `Ctrl/Cmd + K`
- production builds generate a custom Pagefind index; development can build a local index from the content APIs
- search blog sections, novel chapters, changelog releases, and individual license notices
- combine filters for content type, tag or volume, and year
- synchronize search state with the URL and link directly to document headings or license anchors

### Comments and Local State

- Giscus comments for blog posts and novel chapters
- discussions attached to individual paragraphs
- optional batch API for paragraph-comment counts
- browser-local theme, reader settings, and reading position
- built-in migration and cleanup for older local-storage formats

### Tools, Games, and Languages

- an in-browser image converter for batch conversion, compression, resizing, watermarks, and animated images
- a Sinhala font-encoding converter for Unicode and legacy encodings, with a document mode that exports DOCX
- Avalon rooms joined by code or invitation link, with role configuration, game records, and reconnection
- Chinese, English, and Sinhala interface text loaded by page, with the language preference saved locally
- responsive WebP variants for local images and optional variant manifests from the blog and novel sources

### SSG, SEO, and License Data

- fetches posts, the novel catalog, and changelogs before the build to create a shared SSG snapshot
- generates static blog routes while keeping server-rendered and hydration data consistent
- emits canonical links, Open Graph, Twitter Card, and JSON-LD metadata through Unhead
- collects production dependencies and supplemental license files into the in-app license page and `dist/legal/`
- creates the Pagefind index and a static-hosting-friendly 404 page after rendering
- generates blog RSS; announcements are published separately to KV, while release tags publish changelogs
- configures `dist/` as Cloudflare static assets through `wrangler.jsonc`

## Quick Start

### Prerequisites

- Node.js 24.15 or later in the 24.x line, or version 26 and later
- pnpm (the release workflow uses 12.3.4)
- reachable blog and novel sources, or local mirrors under `mock/`

The repository ignores `.env.development`, `.env.production`, and `mock/`. A fresh clone must create its own environment files and either synchronize the local content mirrors or point the variables to reachable remote sources.

### Install dependencies

```bash
pnpm install
```

### Start the development server

```bash
pnpm dev
```

The `predev` hook generates local responsive images, changelog data, and license data. Vite listens on `0.0.0.0` by default. To test game-room APIs locally, run `pnpm dev:games-api` in another terminal.

### Build for production

```bash
pnpm build
```

The complete build pipeline:

1. generates responsive variants of local images and loads available blog and novel image manifests;
2. generates the changelog, content SSG snapshot, and blog RSS feed;
3. collects dependency and supplemental license data;
4. prerenders the site and generates `404.html`;
5. creates the Pagefind index for blog, novel, changelog, and license content, then copies license files into `dist/legal/`.

The sources configured by `VITE_BLOG_RAW` and `VITE_NOVEL_RAW` must be reachable during the build.

### Preview the production build

```bash
pnpm preview
```

## Environment Variables

Create `.env.development` and `.env.production` in the project root and provide the client-side values needed by each environment:

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

| Variable                  | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `VITE_BLOG_RAW`           | Base URL for the blog `index.json`, Markdown, and images; required for production builds |
| `VITE_NOVEL_RAW`          | Base URL for the novel `index.json` and chapter Markdown; required for production builds |
| `VITE_SERVER_ADDRESS`     | Default Minecraft server queried by the tools page                                       |
| `VITE_RANDOM_HERO_API`    | Random homepage-background endpoint                                                      |
| `VITE_COMMENT_COUNTS_API` | Optional batch endpoint for paragraph-comment counts                                     |
| `VITE_GISCUS_CSS_RAW`     | Base URL for custom Giscus theme assets                                                  |
| `VITE_GAMES_API`          | Optional game-room API URL; production has a default                                     |
| `VITE_CHANGELOG_API`      | Optional changelog API URL; production has a default                                     |
| `VITE_ANNOUNCEMENTS_API`  | Optional announcements API URL; production has a default                                 |
| `VITE_ANALYTICS_API`      | Optional site-analytics API URL; production has a default                                |

All of these variables use the `VITE_` prefix and are exposed to client code. Do not store secrets or private credentials in them. Both `scripts/generate-routes.mjs` and `scripts/generate-pagefind-index.mjs` read `.env.production`.

## Available Scripts

| Command                          | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                       | Generate license data and start the development server             |
| `pnpm build`                     | Generate the SSG site, search index, and distributed license files |
| `pnpm preview`                   | Preview `dist/` locally                                            |
| `pnpm deploy`                    | Build and deploy the website with Wrangler                         |
| `pnpm release prepare <version>` | Prepare the changelog, snapshots, and announcement                 |
| `pnpm dev:games-api`            | Start the local game-room API                                        |
| `pnpm api-worker`               | Deploy the API Worker separately                                     |
| `pnpm announcement publish`     | Publish announcements separately to KV                              |

After committing the release changes, pushing a `v<version>` tag lets GitHub Actions deploy the website and publish the changelog. `announcements/` is ignored by Git: check it with `pnpm announcement publish --dry-run`, then publish it separately with `pnpm announcement publish --yes`. Deploy the API Worker separately when needed.

## Project Structure

```text
src/
  assets/          # global, theme, reading, and font styles
  components/
    novel/         # novel catalog, chapter information, and reader
    markdown/      # Markdown rendering and extensions
    games/         # game rooms, Avalon, and Fogport interfaces
    tools/         # tool-specific components
    layout/        # navigation and shared page shells
  games/           # game catalog and routes
  i18n/            # page-split text in three languages
  composables/     # reading, games, account, and other behavior
  services/        # content, search, announcements, and API requests
  stores/          # theme, novel, and reading state
  router/          # routes and build-generated SSG/license data
  utils/           # Markdown extensions, storage, asset resolution, and updates
  views/           # route-level pages

scripts/
  generate-routes.mjs                # creates static blog routes and the SSG snapshot
  generate-images.mjs                # creates local image variants and reads remote manifests
  generate-rss.mjs                   # creates the blog RSS feed
  generate-pagefind-index.mjs        # creates the custom site-wide Pagefind index
  generate-third-party-licenses.mjs  # collects and distributes license data
  api-worker.js                      # Cloudflare API and game-room entry point

licenses/          # supplemental license texts for fonts, icons, and other assets
mock/              # Git-ignored local mirrors of blog and novel content
public/
  assets/          # images, fonts, and icons
  archive/         # archived legacy static pages
  changelog.json    # legacy-compatible version data
  changelog.v1.json # static fallback for the changelog API
```

## Content and Build Notes

- Blog and novel content are maintained in [theWake](https://github.com/KoMoriSam/theWake) and [theHorizon](https://github.com/KoMoriSam/theHorizon).
- `src/router/ssg-data.generated.js` and `src/router/license-data.generated.js` are generated, ignored by Git, and should not be edited manually.
- Public Giscus repository and category settings are centralized in `src/constants/config.js`.
- Blog, novel, and global-search logic lives in `src/services/api-articles.js`, `src/services/api-chapters.js`, and `src/services/search-content.js`.
- Markdown extensions live under `src/utils/markdown/`; `src/utils/resolve-article-assets.js` resolves article images and banners.
- Changelog sources live under `changelog/releases/` and generate `public/changelog.json` and `public/changelog.v1.json`; local announcement sources under `announcements/` are ignored by Git.
- The website's static assets and API Worker use `wrangler.jsonc` and `wrangler.api.jsonc`, respectively.

## Browser Support

The project primarily targets recent versions of Chrome, Firefox, Microsoft Edge, and mainstream mobile browsers. The build also enables Vite's legacy plugin to emit additional compatibility assets for older browsers.

## License

Unless otherwise stated, original software source code in this repository is available under the [MIT License](./LICENSE). Third-party libraries, fonts, icons, images, articles, and other non-software content remain subject to their respective licenses or rights notices and are not relicensed under MIT. See the [third-party notices](./THIRD_PARTY_NOTICES.md), the [Chinese notices](./THIRD_PARTY_NOTICES.zh-CN.md), and the in-app [`/licenses`](https://komori.cc/licenses) page.

Production builds include runtime dependency license texts, the project license, third-party notices, and supplemental license files under `dist/legal/`.

## Languages

- [中文](./README.md)
- [Français](./README_fr.md)
