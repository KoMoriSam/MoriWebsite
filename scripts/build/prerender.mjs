import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { renderDOMHead } from "@unhead/vue/client";
import { renderToString } from "vue/server-renderer";
import { build, mergeConfig } from "vite";
import { buildEvent, observeBuild } from "../lib/build-report.mjs";
import {
  ARTICLE_LOCALES,
  getArticleRedirects,
  resolveArticleVersion,
} from "../../src/utils/blog/article-versions.js";
import { sortArticleNavigation } from "../../src/utils/blog/article-navigation.js";
import { getRelatedArticles } from "../../src/utils/blog/related-articles.js";
import { createArticleWikiLinkResolver } from "../../src/utils/blog/article-wiki-links.js";
import { wikiLinkDependencies } from "../../src/utils/markdown/markdown-it-wikilink.js";

const compiler = resolve(".tmp/site-renderer");
const output = resolve("dist");
const stateDir = resolve(".tmp/site-data");
const manifestFile = resolve(compiler, "pages.json");
const full = process.argv.includes("--full");
const dryRun = process.argv.includes("--dry-run");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, data) => writeFile(file, JSON.stringify(data));
const hash = (value) =>
  createHash("sha256")
    .update(
      JSON.stringify(value, (key, entry) =>
        key === "contentHash" ? undefined : entry,
      ),
    )
    .digest("hex");

if (full) {
  const { default: config } = await import("../../vite.config.js");
  const compile = (options) =>
    build(
      mergeConfig(config, {
        configFile: false,
        mode: "production",
        ...options,
      }),
    );
  await observeBuild("vite", "compile client bundle", () =>
    compile({ build: { ssrManifest: true, emptyOutDir: true } }),
  );
  await mkdir(compiler, { recursive: true });
  await copyFile(
    resolve(output, "index.html"),
    resolve(compiler, "template.html"),
  );
  await copyFile(
    resolve(output, ".vite/ssr-manifest.json"),
    resolve(compiler, "assets.json"),
  );
  process.env.VITE_SSG = "true";
  await observeBuild("vite", "compile SSR bundle", () => compile({
    build: {
      ssr: "src/main.js",
      outDir: resolve(compiler, "server"),
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
      cssCodeSplit: false,
      rollupOptions: { output: { entryFileNames: "main.mjs" } },
    },
    ssr: { noExternal: ["vite-ssg"] },
  }));
} else {
  buildEvent("vite", "client and SSR bundles", "skip", {
    reason: "incremental build uses snapshot bundles",
  });
}

const snapshot = (await import("../../src/router/ssg-data.generated.js"))
  .default;
const articles = (
  await import("../../src/router/article-metadata.generated.js")
).default;
const images = await readJson(
  "src/utils/images/image-manifests.generated.json",
);
await mkdir(stateDir, { recursive: true });
await Promise.all(
  Object.entries({ snapshot, articles, images }).map(([key, value]) =>
    writeJson(resolve(stateDir, `${key}.json`), value),
  ),
);
process.env.SSG_DATA_DIR = stateDir;

const {
  createApp,
  includedRoutes,
  novelSsgRoutes,
  trackImageReads,
  stopTrackingImageReads,
  imageDependency,
  normalizeArticleDate,
} = await observeBuild("ssg", "load SSR bundle", () =>
  import(pathToFileURL(resolve(compiler, "server/main.mjs")).href),
);
const { app, routes } = await observeBuild("ssg", "load application routes", () =>
  createApp("/novel"),
);
const previous = full ? {} : await readJson(manifestFile);
const entries = new Map(snapshot.articles.map((entry) => [entry.path, entry]));
const list = articles.filter(
  (entry) =>
    !entry.legacy &&
    (!entry.article.lang ||
      entry.article.lang === (entry.article.sourceLocale || "zh-CN")),
);
const listHash = hash(list);
const articleRedirects = getArticleRedirects(list.map(({ article }) => article));
const resolveArticleWikiLink = createArticleWikiLinkResolver(
  list.map(({ article }) => article),
);
const homeArticles = list
  .filter(({ article }) => article.public !== false)
  .map(({ article }) => {
    const date = normalizeArticleDate(article.date);
    const timestamp = new Date(article.date).getTime();
    return {
      article,
      publishedTime: Number.isFinite(timestamp)
        ? timestamp
        : Date.parse(date) || 0,
    };
  })
  .sort((left, right) => right.publishedTime - left.publishedTime)
  .slice(0, 4);
const homeBlogHash = hash(
  homeArticles.map(({ article, publishedTime }) => [
    publishedTime,
    ARTICLE_LOCALES.map((locale) => {
      const { routePath, title, summary, banner, date, tags, length, lang } =
        resolveArticleVersion(article, locale);
      return { routePath, title, summary, banner, date, tags, length, lang };
    }),
  ]),
);
// The converter's guide only depends on the available routes for its linked article.
const guideId = "2026-09-25";
const guide = list.find(({ id }) => id === guideId)?.article || { id: guideId };
const guideRoutes = ARTICLE_LOCALES.map(
  (locale) => resolveArticleVersion(guide, locale).routePath,
);
const chronological = sortArticleNavigation(
  list.map(({ article }) => article),
  normalizeArticleDate,
);
const neighbors = new Map(
  chronological.map(({ id }, index) => [
    id,
    [chronological[index - 1], chronological[index + 1]].map(
      (article) =>
        article &&
        ARTICLE_LOCALES.map((locale) => {
          const { routePath, title, date } = resolveArticleVersion(
            article,
            locale,
          );
          return { routePath, title, date };
        }),
    ),
  ]),
);
const novelsHash = hash(snapshot.novelChapters);
const novelRoutes = new Map(
  novelSsgRoutes(app, snapshot.novelChapters).map(({ path, chapter }) => [
    path,
    chapter,
  ]),
);
const paths = [
  ...new Set([
    ...(await includedRoutes(routes.map(({ path }) => path))).filter(
      (path) => !articleRedirects.has(path),
    ),
    ...novelRoutes.keys(),
    "/404",
  ]),
];
// These pages depend on half-width punctuation for their first line breaks.
// Deliver the existing small fonts with HTML to avoid a late punctuation reflow.
const inlineFontRoutes = new Set(["/novel", "/kaiming", ...entries.keys()]);
const kaimingDirectory = resolve(
  process.env.CONTENT_BUILD_DIR || ".output/content-build",
  "kaiming",
);
let openingFontStyles = await readFile(resolve(kaimingDirectory, "index.css"), "utf8");
for (const name of ["Sans-VF.woff2", "Serif-VF.woff2"]) {
  const font = await readFile(resolve(kaimingDirectory, name));
  openingFontStyles = openingFontStyles.replaceAll(
    `https://raw.komori.cc/kaiming/${name}`,
    `data:font/woff2;base64,${font.toString("base64")}`,
  );
}
const openingFontHash = hash(openingFontStyles);
const pages = Object.fromEntries(
  paths.map((route) => {
    if (
      route !== "/" &&
      (!route.startsWith("/") ||
        route.includes("\\") ||
        route
          .split("/")
          .some(
            (part, index) =>
              index > 0 && (!part || part === "." || part === ".."),
          ))
    )
      throw new Error(`Unsafe route: ${route}`);
    const blogList = route === "/blog" || route.startsWith("/blog/page/");
    const article = entries.get(route);
    const chapter = novelRoutes.get(route);
    const home = route === "/" || route === "/home";
    return [
      route,
      {
        input: hash([
          article,
          article && neighbors.get(article.id),
          article && wikiLinkDependencies(article.content, resolveArticleWikiLink),
          article && getRelatedArticles(article.article, list.map(({ article }) => article), article.content),
          blogList && listHash,
          home && homeBlogHash,
          route === "/tools/sinhala-font-converter" && guideRoutes,
          (route === "/novel" || home) && novelsHash,
          chapter,
          route === "/changelog" && snapshot.changelog,
          inlineFontRoutes.has(route) && openingFontHash,
        ]),
        images: previous[route]?.images || [],
      },
    ];
  }),
);
const imageHash = (sources) => hash(sources.map(imageDependency));
const changed = paths.filter(
  (route) =>
    previous[route]?.input !== pages[route].input ||
    previous[route]?.imageHash !== imageHash(pages[route].images),
);
for (const route of paths)
  pages[route].imageHash = imageHash(pages[route].images);
const removed = Object.keys(previous).filter(
  (route) => !Object.hasOwn(pages, route),
);
const report = {
  totalPages: paths.length,
  regeneratedPages: changed.length,
  reusedPages: paths.length - changed.length,
  removedPages: removed.length,
  ...(dryRun ? { routes: changed, removed } : {}),
};
buildEvent("ssg", "page invalidation", "summary", {
  totalPages: paths.length,
  regenerate: changed.length,
  reuse: paths.length - changed.length,
  remove: removed.length,
});
if (process.env.SSG_RENDER_REPORT)
  await writeJson(process.env.SSG_RENDER_REPORT, report);
if (!dryRun) {
  let JSDOM;
  if (changed.length) {
    const require = createRequire(import.meta.url);
    const ssgRequire = createRequire(require.resolve("vite-ssg/node"));
    ({ JSDOM } = await observeBuild("ssg", "load rendering dependencies", () =>
      import(pathToFileURL(ssgRequire.resolve("jsdom")).href),
    ));
  }
  const template = await readFile(resolve(compiler, "template.html"), "utf8");
  const assets = await readJson(resolve(compiler, "assets.json"));
  const fileFor = (route) => {
    const segments = route.slice(1).split("/").map(decodeURIComponent);
    if (
      segments.some((segment) =>
        /[<>:"/\\|?*\u0000-\u001f]|[. ]$/u.test(segment),
      )
    )
      throw new Error(`Unsafe output route: ${route}`);
    return resolve(
      output,
      route === "/" ? "index.html" : `${segments.join("/")}.html`,
    );
  };
  for (const route of removed) {
    const file = fileFor(route);
    if (!file.startsWith(output + (process.platform === "win32" ? "\\" : "/")))
      throw new Error("Unsafe removed route");
    await rm(file);
  }
  await observeBuild("ssg", "render pages and write HTML", async (update) => {
    let completed = 0;
    let writeMs = 0;
    for (const route of changed) {
      const imageReads = trackImageReads();
      const { app, head, initialState, triggerOnSSRAppRendered } =
        await createApp(route);
      if (novelRoutes.has(route) && initialState.pageData)
        throw new Error(`Unexpected hydration payload for novel chapter: ${route}`);
      const context = {};
      const html = await renderToString(app, context);
      await triggerOnSSRAppRendered();
      stopTrackingImageReads();
      pages[route].images = [...imageReads].sort();
      pages[route].imageHash = imageHash(pages[route].images);
      const state = JSON.stringify(JSON.stringify(initialState)).replace(
        /[<\u2028\u2029]/gu,
        (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
      );
      const dom = new JSDOM(
        template.replace(
          /(<body\b[^>]*\bid="app"[^>]*)(><\/body>)/u,
          (_, body) =>
            `${body} data-server-rendered="true">${html}<script>window.__INITIAL_STATE__=${state}</script></body>`,
        ),
      );
      try {
        const { document } = dom.window;
        if (!document.querySelector("[data-server-rendered]"))
          throw new Error("Missing SSG container");
        const resources = new Set(
          [...(context.modules || [])].flatMap((module) => assets[module] || []),
        );
        for (const href of resources) {
          if (!/\.(js|css)$/u.test(href)) continue;
          if (
            [...document.head.querySelectorAll("link")].some(
              (link) => link.getAttribute("href") === href,
            )
          )
            continue;
          const link = document.createElement("link");
          link.rel = href.endsWith(".js") ? "modulepreload" : "stylesheet";
          if (link.rel === "modulepreload") link.crossOrigin = "";
          link.href = href;
          document.head.append(link);
        }
        await renderDOMHead(head, { document });
        if (inlineFontRoutes.has(route)) {
          const style = document.createElement("style");
          style.id = "opening-punctuation-fonts";
          style.textContent = openingFontStyles;
          document.head.append(style);
        }
        const writeStarted = performance.now();
        const file = fileFor(route);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, dom.serialize());
        writeMs += performance.now() - writeStarted;
      } finally {
        dom.window.close();
      }
      update({ completed: ++completed, writeMs: Math.round(writeMs) });
    }
  }, { completed: 0, total: changed.length, reused: paths.length - changed.length });
  const publicData = resolve(output, "site-data");
  await mkdir(publicData, { recursive: true });
  await Promise.all(
    ["articles", "images"].map((key) =>
      copyFile(
        resolve(stateDir, `${key}.json`),
        resolve(publicData, `${key}.json`),
      ),
    ),
  );
  const staticRedirects = await readFile("public/_redirects", "utf8").catch(
    (error) => {
      if (error.code !== "ENOENT") throw error;
      return "";
    },
  );
  // The date URL must keep resolving after future slug changes.
  const redirectRules = [...articleRedirects].flatMap(([from, to]) =>
    [from, `${from}/`, `${from}.html`].map((path) => `${path} ${to} 302`),
  );
  const redirectFile = resolve(output, "_redirects");
  const redirectLines = [staticRedirects.trimEnd(), ...redirectRules].filter(Boolean);
  if (redirectLines.length) {
    await writeFile(redirectFile, `${redirectLines.join("\n")}\n`);
  } else {
    await rm(redirectFile, { force: true });
  }
  await writeJson(manifestFile, pages);
}
