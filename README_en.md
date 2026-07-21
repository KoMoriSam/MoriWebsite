<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="Logo" width="80" height="80">
  </a>
</p>

<h1 align="center">KoMoriSam</h1>

<p align="center">
  A personal website built with Vite, Vue 3, and daisyUI, combining a homepage, blog article flow, novel reader, comments, changelog, and profile pages.
</p>

<p align="center">
  <a href="https://komori.cc/">Live Site</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io">Source Code</a>
  ·
  <a href="https://github.com/KoMoriSam/komorisam.github.io/issues">Issues</a>
</p>

<p align="center">
  Latest version: <strong>1.13.0</strong>
  ·
  <a href="https://komori.cc/changelog">View changelog</a>
</p>

---

## Overview

This repository has evolved beyond a simple personal blog landing page. It is now a content-focused site application centered on reading experience and long-form publishing.

Current sections include:

- homepage greeting and server info
- article list and article reader
- Markdown-driven novel catalog and reader
- Giscus comments, including paragraph-level discussion
- about, contact, and changelog pages
- responsive reading and typography improvements for desktop and mobile

Current routes:

- /
- /blog
- /novel
- /about
- /contact
- /changelog

In development mode, an additional /test route is available for component and interaction testing.

## Tech Stack

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

## Features

### 1. Article System

- dedicated article list and detail views
- Markdown-based article rendering
- Obsidian-style image reference support and banner normalization
- article-level and paragraph-level comments

Article content currently comes from:

- mock/article
- mock/article/generate-index.mjs

### 2. Novel Reading System

- separate catalog and reader views
- chapter loading through index files and Markdown content
- persisted reader settings and reading state
- reader-focused typography, scrolling, and long-text experience improvements

Novel content currently lives in:

- mock/novel

### 3. Comments and Interaction

- Giscus is used as the comment backend
- custom Giscus themes are mapped to site themes
- paragraph comments can capture the current paragraph text for more precise discussion

### 4. External Data and Side Features

- homepage server info block
- daily quote service wrapper kept in the project
- changelog page driven by public/changelog.json

## Quick Start

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Environment Variables

The project currently relies on these Vite environment variables:

```bash
VITE_BLOG_RAW=
VITE_NOVEL_RAW=
VITE_SERVER_ADDRESS=
MXNZP_APP_ID=
MXNZP_APP_SECRET=
VITE_GISCUS_CSS_RAW=
```

What they are used for:

- VITE_BLOG_RAW: article index and Markdown source
- VITE_NOVEL_RAW: novel chapter index and content source
- VITE_SERVER_ADDRESS: default server address shown on the homepage
- MXNZP_APP_ID / MXNZP_APP_SECRET: credentials for the daily quote API
- VITE_GISCUS_CSS_RAW: site base URL used by theme-related assets

If you want to use only local static content, make sure the article and novel API URLs point to the corresponding static directories or a local proxy.

## Content and Project Layout

```bash
src/
  components/
    blog/          # article list, reader
    novel/         # novel detail, chapter info, reader controls
    reader/        # reader settings, style panels, paragraph comments, Markdown rendering
    layout/        # layout and navigation
  composables/     # reusable logic for scroll, modal, comments, images, etc.
  services/        # articles, novel chapters, server info, daily quotes
  stores/          # theme, changelog, reader state
  utils/           # Markdown, storage, update notice, helpers
  views/           # route-level pages

mock/
  article/         # article Markdown files, assets, and index generator
  novel/           # novel Markdown files and index generator

public/
  css/giscus/      # custom Giscus themes
  archive/         # archived static pages
  changelog.json   # changelog data
```

## Development Notes

- routing is defined in src/router/index.js
- changelog data is read from public/changelog.json
- Giscus configuration is centralized in src/constants/config.js
- content APIs are implemented in src/services/api-articles.js and src/services/api-chapters.js
- article and novel indexes are maintained by generate-index.mjs scripts

## Compatibility

The project is primarily intended for modern browsers:

- Chrome
- Firefox
- Microsoft Edge
- mainstream mobile browsers

## License

This project is licensed under the MIT License. See [LICENSE](https://github.com/KoMoriSam/komorisam.github.io/blob/master/LICENSE) for details.

## Languages

- 中文: [README.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README.md)
- Français: [README_fr.md](https://github.com/KoMoriSam/komorisam.github.io/blob/main/README_fr.md)
