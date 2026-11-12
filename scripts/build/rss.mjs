import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import dotenv from "dotenv";

import { createRssFeed } from "../lib/rss-content.mjs";
import { digest } from "../lib/build-cache.mjs";
import { observeBuild } from "../lib/build-report.mjs";
import { hasMathSyntax } from "../../src/utils/markdown/load-markdown-features.js";
import { loadMathJaxPlugin } from "../../src/utils/markdown/mathjax-svg.js";

dotenv.config({ path: ".env.production", quiet: true });

const snapshotPath = resolve("src/router/ssg-data.generated.js");
const outputPath = resolve("public/rss.xml");
const base = String(process.env.VITE_BLOG_RAW || "").trim();
const contentBaseUrl = base && new URL(base, "https://komori.cc").href;

if (!contentBaseUrl) {
  throw new Error(
    "无法生成博客订阅源。请在 .env.production 中设置 VITE_BLOG_RAW。",
  );
}

try {
  await access(snapshotPath);
} catch {
  throw new Error(
    "博客内容尚未准备完成。请先运行 pnpm generate routes，再生成订阅源。",
  );
}

const snapshotUrl = pathToFileURL(snapshotPath);
snapshotUrl.searchParams.set("rss", String(Date.now()));
const snapshot = (await import(snapshotUrl.href)).default;
const version = process.env.SSG_RSS_CACHE_VERSION;
const cacheFile = resolve(".tmp/site-search-cache/rss.json");
const previous = version
  ? await readFile(cacheFile, "utf8")
      .then(JSON.parse)
      .catch(() => ({}))
  : {};
const current = {};
const hasMath = snapshot.articles.some(({ content }) => hasMathSyntax(content));
const cacheKey = (input) => digest(JSON.stringify([version, contentBaseUrl, [...input.slice(0, -1), hasMath]]));
let needsMath = hasMath && !version;
if (hasMath && version) {
  createRssFeed(snapshot.articles, {
    contentBaseUrl,
    renderContent(input) {
      if (hasMathSyntax(input[0]) && previous[cacheKey(input)] === undefined) needsMath = true;
      return "";
    },
  });
}
const mathPlugin = needsMath
  ? await observeBuild("rss", "load MathJax renderer", loadMathJaxPlugin)
  : undefined;
const { xml, items } = await observeBuild("rss", "render feed entries", (update) => {
  let hits = 0;
  let misses = 0;
  const feed = createRssFeed(snapshot?.articles, {
    contentBaseUrl,
    mathPlugin,
    renderContent(input, render) {
      if (!version) {
        misses++;
        return render();
      }
      const key = cacheKey(input);
      if (Object.hasOwn(previous, key)) hits++;
      else misses++;
      return (current[key] = previous[key] ?? render());
    },
  });
  update({ documents: feed.items.length, hits, misses });
  return feed;
});
await observeBuild("rss", "write feed and cache", async () => {
  if (version) await writeFile(cacheFile, JSON.stringify(current));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf8");
}, { bytes: Buffer.byteLength(xml) });

console.log(`博客订阅源已生成：${items.length} 篇文章。文件：${outputPath}`);
