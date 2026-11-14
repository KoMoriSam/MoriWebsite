<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">远方之森 · MoriWebsite</h1>

<p align="center">
  Write about technology and everyday life, read original stories, explore words and images, and play games with friends.
</p>

<p align="center">
  <a href="https://komori.cc/">Visit the site</a> ·
  <a href="https://komori.cc/blog">Blog</a> ·
  <a href="https://komori.cc/novel">Novel</a> ·
  <a href="https://komori.cc/tools">Tools</a> ·
  <a href="https://komori.cc/games">Games</a> ·
  <a href="https://komori.cc/changelog">Changelog</a>
</p>

<p align="center">
  <a href="./README.md">简体中文</a> ·
  English ·
  <a href="./README_fr.md">Français</a> ·
  <a href="./README_si.md">සිංහල</a>
</p>

<p align="center">
  Current version: <strong>2.21.2</strong>
</p>

## About 远方之森

**远方之森** is Mori's personal website and an evolving web project. It brings together technical notes, essays, reading notes, and original fiction, along with browser tools, multiplayer games, and independent design projects.

The site is designed for everyday reading and use. Articles have a dedicated reader and on-site discussions. The tools work in the browser wherever possible, and the desktop and mobile interfaces are tailored to how people use each device. This public repository contains the website code; the blog, novel, and other content are managed in separate repositories.

## What you can do here

| Content | Where to go and what to expect |
| --- | --- |
| **Blog** | [Read articles](https://komori.cc/blog): find posts by keyword, tag, and year, read technical notes and essays, and switch between published translations. |
| **Original novel: The Horizon (《向远方》)** | [Browse volumes and chapters](https://komori.cc/novel): use the table of contents, saved progress, and layout settings to continue reading. The full text is available to authorized users who are signed in. |
| **Image conversion** | [Image format converter](https://komori.cc/tools/image-converter): convert images in batches, compress and resize them, add watermarks, and process animated images. |
| **Sinhala text processing** | [Font encoding converter](https://komori.cc/tools/sinhala-font-converter): convert text between Unicode and legacy font encodings, including DOCX, PPTX, and PDFs with selectable text. |
| **Minecraft server lookup** | [Server status](https://komori.cc/tools/server-status): check connectivity and online information for Java Edition and Bedrock Edition servers. |
| **Multiplayer board games** | [Avalon](https://komori.cc/games/avalon): online social deduction for 5–10 players. [Fogport](https://komori.cc/games/fogport): an experimental economic board game for 2–4 players that is still unfinished. |
| **Kaiming punctuation** | [Project overview](https://komori.cc/kaiming): learn about the design of punctuation glyphs and explore the related font resources. |

## Reading and discussion

The blog and novel share a reader with a table of contents, progress tracking, font and layout controls, themes, and a mobile reading experience adapted to touch. Your reading preferences and progress are saved in the current browser.

Articles support syntax highlighting, mathematical notation, Mermaid diagrams, footnotes, ruby annotations, wiki links, and other Markdown extensions. You can jump to a heading or paragraph, browse related content, or turn a selection into an image to share. Articles also show related recommendations, when they were last updated, and notices about how current the information is.

**On-site comments connect directly to GitHub Discussions.** Sign in with GitHub to post, reply, edit, delete, and react on the site. Discussions are available for articles, novel chapters, and individual paragraphs. You can sort comments by popularity, newest first, or oldest first. Long comments and nested discussions are designed to work across screen sizes. The blog and novel store their discussions in [theWake](https://github.com/KoMoriSam/theWake) and [theHorizon](https://github.com/KoMoriSam/theHorizon), respectively, without relying on an embedded comment interface.

The site interface supports **Simplified Chinese, English, French, and Sinhala**. Blog translations have their own URLs for direct sharing and search indexing. You can switch an article's language independently of the site interface.

Press `Ctrl + K` (`Cmd + K` on macOS) to search articles, chapters, release notes, and license information. You can also [subscribe to the blog via RSS](https://komori.cc/rss.xml).

## Technology and architecture

| Area | Main technologies and design |
| --- | --- |
| Front end | Vue 3, Vue Router, Pinia, Vite, Tailwind CSS, daisyUI |
| Content rendering | Vite SSG, Markdown-it, Pele (Mermaid), Pagefind, article pages generated separately for each language |
| Back end | Cloudflare Workers, D1, KV, R2, Durable Objects |
| Sign-in and discussions | GitHub OAuth and GitHub Discussions, with the site's own comment interface and API |
| Build and release | GitHub Actions, Cloudflare Workers Builds, build snapshots, incremental SSG, and versioned deployments |

The site serves public content and SEO metadata on statically prerendered pages. Workers handle dynamic features such as sign-in, discussions, analytics, and online multiplayer games. The blog and novel have their own publishing workflows, separate from the website code.

The build process checks what changed and decides whether to skip the build, update selected static pages, or run a full build. Snapshots let it reuse generated image variants and other build outputs. Release candidates are kept separate from production traffic so they can be verified before traffic is switched, with the option to roll back to an earlier version.

## Local development

Requires **Node.js 24.15+ (within 24.x) or 26+**, and **pnpm 12.3.4**.

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
pnpm dev
```

`pnpm dev` automatically prepares isolated local services and test data for the API, authentication, comments, and novel, then starts the site with sample content. **You don't need access to private content repositories or production secrets.** Open the address printed in the terminal.

Common commands:

| Command | What it does |
| --- | --- |
| `pnpm menu` | Open an interactive menu for development, checks, builds, and releases. |
| `pnpm dev` | Start the local site and its test services. |
| `pnpm dev:seed` | Refresh the isolated local test data. |
| `pnpm dev games` | Run the local multiplayer game service on its own. |
| `pnpm check` | List the available checks. For example, run `pnpm check markdown`. |
| `pnpm build` | Build the site, search index, and content assets from the full content sources. |
| `pnpm preview` | Preview the built site. |
| `pnpm run build:smart --dry-run` | See which build mode would be used and what would change. |

A **full production build** uses the actual content. Set `CONTENT_BLOG_DIR` and `CONTENT_NOVEL_DIR` to local content directories, or supply a `CONTENT_GITHUB_TOKEN` with permission to read the private content repositories. Provide access tokens and deployment credentials as environment secrets. Keep them out of the repository and out of client-side `VITE_` variables.

## Content and releases

Website development takes place on `main`, and released versions live on `production`. GitHub Actions prepares release commits and tags. Cloudflare builds and verifies the release, then switches production traffic to it. Updates to the blog, novel, and font resources can trigger their own builds. See the [changelog](https://komori.cc/changelog) and [site announcements](https://komori.cc/announcements) for details.

Most website code lives in `src/`, server-side Workers in `workers/`, and build, check, and release scripts in `scripts/`. Release records are kept in `changelog/releases/`. Automated releases depend on settings specific to this repository and its Cloudflare environment; deploying to another account requires its own configuration.

## Copyright and licensing

- **Original software code in this repository**: [MIT License](./LICENSE).
- **Original blog articles**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) by default; see each article's copyright notice.
- **Original novel: The Horizon (《向远方》)**: All Rights Reserved.
- **Third-party fonts, images, icons, and other assets**: subject to their respective licenses or rights notices.
- **Reader comments**: rights remain with their respective authors.

For third-party licensing information, see the [site's licenses page](https://komori.cc/licenses), the [Chinese notices](./THIRD_PARTY_NOTICES.zh-CN.md), and the [English notices](./THIRD_PARTY_NOTICES.md).

## Feedback

Use [GitHub Issues](https://github.com/KoMoriSam/MoriWebsite/issues) to report problems or suggest improvements. To discuss an article or the novel, you can also leave a comment on the relevant page.
