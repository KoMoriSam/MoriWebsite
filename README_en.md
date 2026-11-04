<p align="center">
  <a href="https://komori.cc/">
    <img src="https://komori.cc/favicon.webp" alt="远方之森" width="80" height="80">
  </a>
</p>

<h1 align="center">MoriWebsite · 远方之森</h1>

<p align="center">
  Read articles and original fiction, work with images and Sinhala documents, and play board games with friends.
</p>

<p align="center">
  <a href="https://komori.cc/">Visit the site</a>
  ·
  <a href="https://komori.cc/rss.xml">Subscribe to the blog</a>
  ·
  <a href="https://github.com/KoMoriSam/MoriWebsite/issues">Report an issue</a>
  ·
  <a href="#languages">Other languages</a>
</p>

<p align="center">
  Current version: <strong>2.20.2</strong>
  ·
  <a href="https://komori.cc/changelog">Changelog</a>
</p>

## Start here

远方之森 is Mori's personal website, bringing together technical explorations, essays, reading notes, original fiction, everyday tools, and multiplayer board games. Open the site on a desktop or phone to get started.

| What you want to do      | Where to go                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read articles            | [Blog](https://komori.cc/blog): find posts by keyword, tag, and year, and switch between published language versions                                                        |
| Follow the novel         | [The Horizon /《向远方》](https://komori.cc/novel): browse volumes and chapters, resume reading, and adjust the reader layout                                               |
| Convert images           | [Image converter](https://komori.cc/tools/image-converter): batch conversion, compression, resizing, watermarks, and animation processing                                   |
| Work with Sinhala text   | [Font encoding converter](https://komori.cc/tools/sinhala-font-converter): convert between Unicode and legacy font encodings, including documents                           |
| Check a server           | [Minecraft server status](https://komori.cc/tools/server-status): check connectivity and online information                                                                 |
| Play with friends        | [Avalon](https://komori.cc/games/avalon) offers social deduction for 5–10 players; [Fogport](https://komori.cc/games/fogport) offers an economic board game for 2–4 players |
| Explore the font project | [Kaiming](https://komori.cc/kaiming): learn about the project and its font resources                                                                                        |

## Reading and discussion

The blog and novel provide contents navigation, reading progress, and layout settings. Your theme, reading position, and preferences are saved in the current browser so you can pick up where you left off. Articles can include code, equations, diagrams, footnotes, and ruby annotations; code blocks support copying.

Press `Ctrl + K` (`Cmd + K` on macOS) to search article sections, novel chapters, release notes, and license entries. Filters for content type, tags, volumes, and years help you jump to relevant content.

The interface supports Chinese, English, French, and Sinhala. Articles offer their available translations and show language notices when your selected language is unavailable.

The novel's catalog is public; reading its chapters requires GitHub sign-in. Giscus supports discussions on articles, chapters, and individual paragraphs, with a GitHub account required to post. Blog and novel discussions live in [theWake](https://github.com/KoMoriSam/theWake) and [theHorizon](https://github.com/KoMoriSam/theHorizon), respectively.

Follow new posts through [RSS](https://komori.cc/rss.xml), and check the [changelog](https://komori.cc/changelog) and [announcements](https://komori.cc/announcements) for site updates.

## Tools and games

**The image converter** processes images in your browser. Use it to prepare batches of assets, reduce file sizes, standardize dimensions, add text or image watermarks, and process animated images.

**The Sinhala font encoding converter** converts between Unicode and legacy font encodings. Paste text directly or work with DOCX and PPTX files. For PDFs with selectable text, export the content as an editable DOCX or the page layout as an editable PPTX.

**Multiplayer board games** let friends join the same room using a room code or invitation link. Avalon includes role configuration, team votes, missions, and game history. Fogport centers on industries, transport links, resources, and sales; it is a test version with development on hold and some features unfinished.

## Using the content

| Content                                                          | Terms                                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Original software source code in this repository                 | [MIT License](./LICENSE)                                                                                                  |
| Original blog articles                                           | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) by default; check the license shown on each article |
| Original novel The Horizon /《向远方》                           | All Rights Reserved                                                                                                       |
| Third-party libraries, fonts, icons, images, and other materials | Their respective licenses or rights notices                                                                               |
| Reader comments                                                  | Rights remain with their authors, subject to their rights notices                                                         |

Each article's attribution card lists its title, link, author, publication date, and license so you can identify the source and applicable terms. Third-party information is available on the [licenses page](https://komori.cc/licenses), in the [English notices](./THIRD_PARTY_NOTICES.md), and in the [Chinese notices](./THIRD_PARTY_NOTICES.zh-CN.md).

## Run locally

The project uses Vue 3, Vite SSG, Tailwind CSS, daisyUI, and Pagefind, with server APIs running on Cloudflare Workers. Use Node.js 24.15 or a later 24.x release, or Node.js 26 or later, with pnpm 12.3.4.

```bash
git clone https://github.com/KoMoriSam/MoriWebsite.git
cd MoriWebsite
pnpm install
```

Create `.env.development` in the project root and set the content and comment-theme URLs:

```dotenv
VITE_BLOG_RAW=https://raw.komori.cc/post
VITE_NOVEL_RAW=https://raw.komori.cc/novel
VITE_GISCUS_CSS_RAW=https://raw.komori.cc/giscus
```

```bash
pnpm dev
```

Open the address printed in the terminal. You can also point the content URLs to your own local mirrors; `mock/` and `.env*` files are ignored by Git. To develop multiplayer rooms, run `pnpm dev games` in another terminal.

Configure additional services as needed:

| Environment variable                           | Purpose                             |
| ---------------------------------------------- | ----------------------------------- |
| `VITE_SERVER_ADDRESS`                          | Default Minecraft server to query   |
| `VITE_RANDOM_HERO_API`                         | Random homepage background service  |
| `VITE_COMMENT_COUNTS_API`                      | Paragraph comment counts            |
| `VITE_GAMES_API`                               | Multiplayer room service            |
| `VITE_CHANGELOG_API`, `VITE_ANNOUNCEMENTS_API` | Changelog and announcement services |
| `VITE_ANALYTICS_API`                           | Traffic analytics service           |

Variables prefixed with `VITE_` are included in client code and should contain public configuration only. Store private repository tokens and deployment credentials in build-environment Secrets.

## Build and publish

### Build locally

Set `CONTENT_BLOG_DIR` and `CONTENT_NOVEL_DIR` to build from local Vaults, or use `CONTENT_GITHUB_TOKEN` to read both private content repositories. The site, RSS feed, and search index use the same content export.

| Command                             | Result                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm build`                        | Build the full site into `dist/` and content assets into `.output/content/`                        |
| `pnpm run build:smart`              | Use the local snapshot to choose an incremental or full build; pass `--full` to force a full build |
| `pnpm run build:smart --dry-run`    | See the build mode and what would change without deploying                                         |
| `pnpm preview`                      | Preview the built site                                                                             |
| `pnpm check <target>`               | Run focused checks; omit the target to list options                                                |
| `pnpm generate <target>`            | Generate selected resources; omit the target to list options                                       |
| `pnpm release prepare <version>`    | Prepare the version number, release notes, and announcement draft                                  |
| `pnpm release verify <version>`     | Check that the package, README, and release-note versions agree                                    |
| `pnpm run deploy <target>`          | Publish the website, content, API, or Giscus; omit the target to list options                      |
| `pnpm release announcement publish` | Publish announcements independently                                                                |

### Publish to production

| What changed                        | How it goes live                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website code                        | GitHub Actions validates the `v<version>` tag and advances `production`, triggering Workers Builds. Ordinary `main` commits go live with a release.                      |
| Blog and novel                      | Updates to the private `ObsidianVault` and `MyWritingVault` repositories trigger their respective `WORKERS_BUILD_HOOK`, using the released website code on `production`. |
| Kaiming fonts                       | A font release triggers a Deploy Hook. The build downloads and verifies assets from the GitHub Release in `KoMoriSam/Kaiming`.                                           |
| Giscus themes and loading animation | Maintain them in `giscus/` and publish them separately with `pnpm run deploy giscus`.                                                                                    |

Workers Builds restores the snapshot from the last successful deployment. If only the content has changed and the snapshot is compatible, incremental SSG rebuilds affected pages and content assets and reuses the compiled frontend. Changes to site code or build configuration, or an unusable snapshot, trigger a full build. With no changes to publish, deployment is skipped. Both full and incremental builds reuse valid cached image variants. The build log reports `INCREMENTAL`, `FULL`, or `SKIPPED`.

An incremental release deploys only the Workers whose output changed. Workers Static Assets serves the site and its content. The private R2 bucket stores build snapshots. Blog and novel text and images remain available at `raw.komori.cc/post` and `raw.komori.cc/novel`; on the same host, `/kaiming` serves fonts and `/giscus` serves comment themes and the loading animation at `/giscus/images/spin.gif`.

In Workers Builds for `website`, set the production branch to `production`, leave the Build command blank, and set the Deploy command to `pnpm run build:smart --deploy`. Set these variables in the production build environment:

| Setting                                                      | Value                                                                                                                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTENT_GITHUB_TOKEN` (Secret)                              | GitHub token with read-only Contents access to both private content repositories                                                                                                        |
| `SSG_R2_ENDPOINT`, `SSG_R2_BUCKET`, `SSG_SNAPSHOT_NAMESPACE` | R2 S3 API endpoint without the bucket path, private snapshot bucket name, and `production`, respectively                                                                                |
| `SSG_R2_ACCESS_KEY`, `SSG_R2_SECRET_KEY` (Secrets)           | Access Key ID and Secret Access Key from the same [R2 S3 credentials](https://developers.cloudflare.com/r2/get-started/s3/), with **Object Read & Write** scoped to the snapshot bucket |

Announcements are grouped under `x.y.0`. Maintenance, optimization, and fixes are incorporated into the same announcement so readers can find the version's full experience in one place. Blog front matter can set an article's `license`; the default is `CC BY-NC-SA 4.0`, and translations inherit the source article's license unless overridden.

Start with `src/views/` for pages, and find related implementations in `src/components/`, `src/composables/`, and `src/utils/`. Build and release commands live in `scripts/`; Cloudflare services live in `workers/`.

## Feedback and participation

[Open an issue](https://github.com/KoMoriSam/MoriWebsite/issues) to report a problem or suggest an improvement. Include the page, steps to reproduce, expected and actual behavior, and browser version. For conversations about the writing, use the comments on the article or novel page.

## Languages

- [中文](./README.md)
- [Français](./README_fr.md)
- [සිංහල](./README_si.md)
