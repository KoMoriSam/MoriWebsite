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
</p>

<p align="center">
  Current version: <strong>2.20.1</strong>
  ·
  <a href="https://komori.cc/changelog">Changelog</a>
</p>

## Start here

远方之森 is Mori's personal website, bringing together technical explorations, essays, reading notes, original fiction, everyday tools, and multiplayer board games. Open the site on a desktop or phone to get started.

| What you want to do | Where to go |
| --- | --- |
| Read articles | [Blog](https://komori.cc/blog): find posts by keyword, tag, and year, and switch between published language versions |
| Follow the novel | [The Horizon /《向远方》](https://komori.cc/novel): browse volumes and chapters, resume reading, and adjust the reader layout |
| Convert images | [Image converter](https://komori.cc/tools/image-converter): batch conversion, compression, resizing, watermarks, and animation processing |
| Work with Sinhala text | [Font encoding converter](https://komori.cc/tools/sinhala-font-converter): convert between Unicode and legacy font encodings, including documents |
| Check a server | [Minecraft server status](https://komori.cc/tools/server-status): check connectivity and online information |
| Play with friends | [Avalon](https://komori.cc/games/avalon) offers social deduction for 5–10 players; [Fogport](https://komori.cc/games/fogport) offers an economic board game for 2–4 players |
| Explore the font project | [Kaiming](https://komori.cc/kaiming): learn about the project and its font resources |

## Reading and discussion

The blog and novel provide contents navigation, reading progress, and layout settings. Your theme, reading position, and preferences are saved in the current browser so you can pick up where you left off. Articles can include code, equations, diagrams, footnotes, and ruby annotations; code blocks support copying.

Press `Ctrl + K` (`Cmd + K` on macOS) to search article sections, novel chapters, release notes, and license entries. Filters for content type, tags, volumes, and years help you jump to relevant content.

The interface supports Chinese, English, French, and Sinhala. Articles offer their available translations and show language notices when your selected language is unavailable.

The novel's catalog is public; reading its chapters requires GitHub sign-in. Giscus supports discussions on articles, chapters, and individual paragraphs, with a GitHub account required to post. Blog and novel discussions live in [theWake](https://github.com/KoMoriSam/theWake) and [theHorizon](https://github.com/KoMoriSam/theHorizon), respectively.

Follow new posts through [RSS](https://komori.cc/rss.xml), and check the [changelog](https://komori.cc/changelog) and [announcements](https://komori.cc/announcements) for site updates.

## Tools and games

**The image converter** processes images in your browser. Use it to prepare batches of assets, reduce file sizes, standardize dimensions, add text or image watermarks, and process animated images.

**The Sinhala font encoding converter** converts between Unicode and legacy font encodings. You can paste text or work with DOCX, PPTX, and PDFs containing selectable text, then export editable DOCX or PPTX files.

**Multiplayer board games** let friends join the same room using a room code or invitation link. Avalon includes role configuration, team votes, missions, and game history. Fogport centers on industries, transport links, resources, and sales; it is a test version with development on hold and some features unfinished.

## Using the content

| Content | Terms |
| --- | --- |
| Original software source code in this repository | [MIT License](./LICENSE) |
| Original blog articles | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) by default; check the license shown on each article |
| Original novel The Horizon /《向远方》 | All Rights Reserved |
| Third-party libraries, fonts, icons, images, and other materials | Their respective licenses or rights notices |
| Reader comments | Rights remain with their authors, subject to their rights notices |

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

| Environment variable | Purpose |
| --- | --- |
| `VITE_SERVER_ADDRESS` | Default Minecraft server to query |
| `VITE_RANDOM_HERO_API` | Random homepage background service |
| `VITE_COMMENT_COUNTS_API` | Paragraph comment counts |
| `VITE_GAMES_API` | Multiplayer room service |
| `VITE_CHANGELOG_API`, `VITE_ANNOUNCEMENTS_API` | Changelog and announcement services |
| `VITE_ANALYTICS_API` | Traffic analytics service |

Variables prefixed with `VITE_` are included in client code and should contain public configuration only. Store private repository tokens and deployment credentials in build-environment Secrets.

## Build and publish

Workers Builds builds the site and content together, and Workers Static Assets hosts the results. A complete production build requires access to the two private content repositories, or local Vaults supplied through `CONTENT_BLOG_DIR` and `CONTENT_NOVEL_DIR`. Exporters work in temporary copies, and the website, RSS feed, and search index share the same content snapshot.

| Source or resource | How it is published |
| --- | --- |
| Website code | After validation, a `v<version>` tag advances `production` and triggers Workers Builds; ordinary `main` commits go live with a release |
| Blog and novel | Private `ObsidianVault` and `MyWritingVault` repositories hold the source content; each uses its `WORKERS_BUILD_HOOK` to rebuild `production` after updates |
| Kaiming fonts | Assets come from a GitHub Release in `KoMoriSam/Kaiming` and are verified before publication; font releases trigger a build through their Hook |
| Giscus comment assets | Themes and the loading animation are maintained in `giscus/` and published independently from a local terminal with `pnpm run deploy giscus` |
| Images and other content resources | Published with the content Worker; R2 is optional and currently disabled |

Content resources use `raw.komori.cc`: `/post` for the blog, `/novel` for the novel, `/giscus` for comment themes, `/kaiming` for fonts, and `/giscus/images/spin.gif` for the loading animation. `theWake` and `theHorizon` host discussions; the private content sources supply the published texts.

Workers Builds watches `production`, runs `pnpm build`, and deploys with `pnpm run deploy website`. Its `CONTENT_GITHUB_TOKEN` build Secret needs read-only Contents access to both private content repositories. Content Hooks also target `production`, so content updates use the released website code. GitHub Actions handles release validation, build triggers, and other automation.

| Command | Result |
| --- | --- |
| `pnpm build` | Generate the website in `dist/`, content assets in `.output/content/`, RSS, the search index, and license files |
| `pnpm preview` | Preview the production website build |
| `pnpm check <target>` | Run focused checks; omit the target to list options |
| `pnpm generate <target>` | Generate selected resources; omit the target to list options |
| `pnpm release prepare <version>` | Prepare the version number, release notes, and announcement draft |
| `pnpm release verify <version>` | Check that the package, README, and release-note versions agree |
| `pnpm run deploy <target>` | Publish the website, content, API, or Giscus; omit the target to list options |
| `pnpm release announcement publish` | Publish announcements independently |

Announcements are grouped under `x.y.0`. Maintenance, optimization, and fixes are incorporated into the same announcement so readers can find the version's full experience in one place. Blog front matter can set an article's `license`; the default is `CC BY-NC-SA 4.0`, and translations inherit the source article's license unless overridden.

Start with `src/views/` for pages, and find related implementations in `src/components/`, `src/composables/`, and `src/utils/`. Build and release commands live in `scripts/`; Cloudflare services live in `workers/`.

## Feedback and participation

[Open an issue](https://github.com/KoMoriSam/MoriWebsite/issues) to report a problem or suggest an improvement. Include the page, steps to reproduce, expected and actual behavior, and browser version. For conversations about the writing, use the comments on the article or novel page.

## Languages

- [中文](./README.md)
- [Français](./README_fr.md)
- [සිංහල](./README_si.md)
