<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="KoMoriSam Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite</h1>

<p align="center">
  A personal digital garden "远方之森" built with Vue 3, Vite SSG, Tailwind CSS, and daisyUI, combining a blog, novel reader, site-wide search, comments, and online tools.
</p>

<p align="center">
  <a href="https://komori.cc/">Live Site</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite">Source Code</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Issues</a>
</p>

<p align="center">
  Current version: <strong>1.23.0</strong>
  ·
  <a href="https://komori.cc/changelog">Changelog</a>
</p>

---

## Overview

MoriWebsite is the frontend of KoMoriSam's personal website. It is designed around content publishing, long-form reading, and static hosting. Blog posts and novel content are maintained in separate repositories; before each production build, the project fetches a content snapshot and uses `vite-ssg` to generate indexable HTML for the main pages and blog posts.

The site currently includes:

- a responsive profile homepage with dynamic backgrounds and contact links
- a blog with keyword, tag, and year filters
- volumes, chapter navigation, and a paginated reader for the original novel _Toward the Distance_
- site-wide search across blog posts, novel chapters, changelogs, and open-source licenses
- Giscus comments at article, chapter, and paragraph level
- an online Minecraft server-status tool
- changelogs, theme switching, reading progress, and local reader preferences
- a license page for project dependencies, fonts, icons, and other third-party content

Production routes:

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

Development also exposes `/test` for component testing. Unknown URLs use the in-app 404 view, and production builds generate a `404.html` suitable for static hosting.

## Version 1.23.0 Highlights

- added Cloudflare D1-based visit and reading analytics with batch content-reading statistics
- switched Markdown math to MathJax SVG rendering with LaTeX copy and share-card support
- displayed reading/comment statistics for articles and chapters, aggregating main comments, paragraph comments, and replies
- fixed duplicate rendering in share cards, desktop novel reading-position restoration, and LaTeX first-paint issues

See [`public/changelog.json`](./public/changelog.json) or the [online changelog](https://komori.cc/changelog) for the complete release history.

## Tech Stack

- Vue 3, Vue Router, Pinia
- Vite 6, vite-ssg
- Tailwind CSS 4, daisyUI 5
- Pagefind 1.5
- Unhead, VueUse
- Markdown-it, vue-markdown-render, KaTeX, highlight.js
- Self-hosted fonts such as JetBrains Mono and Fraunces
- Giscus

## Features

### Content and Reading

- blog list and detail views with combined keyword, tag, and year filtering
- novel volumes, chapter navigation, total word counts, persisted reading position, and reader settings
- Markdown code highlighting, footnotes, task lists, math, callouts, custom dialogue blocks, attributes, and ruby annotations
- Obsidian-style image references, banner resolution, lazy image loading, and code copying
- responsive typography, table of contents, sidebars, and reading progress on desktop and mobile

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

### SSG, SEO, and License Data

- fetches posts, the novel catalog, and changelogs before the build to create a shared SSG snapshot
- generates static blog routes while keeping server-rendered and hydration data consistent
- emits canonical links, Open Graph, Twitter Card, and JSON-LD metadata through Unhead
- collects production dependencies and supplemental license files into the in-app license page and `dist/legal/`
- creates the Pagefind index and a static-hosting-friendly 404 page after rendering
- configures `dist/` as Cloudflare static assets through `wrangler.jsonc`

## Quick Start

### Prerequisites

- Node.js
- pnpm
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

The `predev` hook first generates in-app license data from the installed production dependencies. Vite listens on `0.0.0.0` by default.

### Build for production

```bash
pnpm build
```

The complete build pipeline:

1. fetches the production content and creates the SSG snapshot;
2. collects dependency and supplemental license data;
3. prerenders the site and generates `404.html`;
4. creates the Pagefind index for blog, novel, changelog, and license content;
5. copies license texts and third-party notices into `dist/legal/`.

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
```

| Variable                  | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `VITE_BLOG_RAW`           | Base URL for the blog `index.json`, Markdown, and images; required for production builds |
| `VITE_NOVEL_RAW`          | Base URL for the novel `index.json` and chapter Markdown; required for production builds |
| `VITE_SERVER_ADDRESS`     | Default Minecraft server queried by the tools page                                       |
| `VITE_RANDOM_HERO_API`    | Random homepage-background endpoint                                                      |
| `VITE_COMMENT_COUNTS_API` | Optional batch endpoint for paragraph-comment counts                                     |
| `VITE_GISCUS_CSS_RAW`     | Base URL for custom Giscus theme assets                                                  |

All of these variables use the `VITE_` prefix and are exposed to client code. Do not store secrets or private credentials in them. Both `scripts/generate-routes.mjs` and `scripts/generate-pagefind-index.mjs` read `.env.production`.

## Available Scripts

| Command        | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `pnpm dev`     | Generate license data and start the development server             |
| `pnpm build`   | Generate the SSG site, search index, and distributed license files |
| `pnpm preview` | Preview `dist/` locally                                            |
| `pnpm deploy`  | Publish `dist/` to the repository's `gh-pages` branch              |
| `pnpm push`    | Force-push local `main` to the remote `cl-pages` branch            |

`pnpm push` includes `--force`; confirm the remote branch's purpose and your current commit before using it.

## Project Structure

```text
src/
  assets/          # global, theme, reading, and font styles
  components/
    blog/          # blog list and reader
    novel/         # novel catalog, chapter information, and reader
    reader/        # Markdown, paragraph comments, and reader settings
    layout/        # navigation, global search, and shared page shells
    ui/            # shared UI components
  composables/     # reusable filtering, scrolling, modal, and image logic
  services/        # content, search, comments, server, and background APIs
  stores/          # theme, changelog, and reading state
  router/          # routes and build-generated SSG/license data
  utils/           # Markdown extensions, storage, asset resolution, and updates
  views/           # route-level pages

scripts/
  generate-routes.mjs                # creates static blog routes and the SSG snapshot
  generate-pagefind-index.mjs        # creates the custom site-wide Pagefind index
  generate-third-party-licenses.mjs  # collects and distributes license data

licenses/          # supplemental license texts for fonts, icons, and other assets
mock/              # Git-ignored local mirrors of blog and novel content
public/
  assets/          # images, fonts, and icons
  archive/         # archived legacy static pages
  changelog.json   # version history data
```

## Content and Build Notes

- Blog and novel content are maintained in [theWake](https://github.com/KoMoriSam/theWake) and [theHorizon](https://github.com/KoMoriSam/theHorizon).
- `src/router/ssg-data.generated.js` and `src/router/license-data.generated.js` are generated, ignored by Git, and should not be edited manually.
- Public Giscus repository and category settings are centralized in `src/constants/config.js`.
- Blog, novel, and global-search logic lives in `src/services/api-articles.js`, `src/services/api-chapters.js`, and `src/services/search-content.js`.
- Markdown extensions live under `src/utils/markdown/`; `src/utils/article-assets.js` resolves article images and banners.
- Changelog data comes from `public/changelog.json`.
- Cloudflare static-asset settings live in `wrangler.jsonc`; the GitHub Pages publishing script remains in `package.json`.

## Browser Support

The project primarily targets recent versions of Chrome, Firefox, Microsoft Edge, and mainstream mobile browsers. The build also enables Vite's legacy plugin to emit additional compatibility assets for older browsers.

## License

Unless otherwise stated, original software source code in this repository is available under the [MIT License](./LICENSE). Third-party libraries, fonts, icons, images, articles, and other non-software content remain subject to their respective licenses or rights notices and are not relicensed under MIT. See the [third-party notices](./THIRD_PARTY_NOTICES.md), the [Chinese notices](./THIRD_PARTY_NOTICES.zh-CN.md), and the in-app [`/licenses`](https://komori.cc/licenses) page.

Production builds include runtime dependency license texts, the project license, third-party notices, and supplemental license files under `dist/legal/`.

## Languages

- [中文](./README.md)
- [Français](./README_fr.md)
