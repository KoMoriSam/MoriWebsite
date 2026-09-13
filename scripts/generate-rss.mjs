import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import dotenv from "dotenv";

import { createRssFeed } from "./rss-content.mjs";

dotenv.config({ path: ".env.production" });

const snapshotPath = resolve("src/router/ssg-data.generated.js");
const outputPath = resolve("public/rss.xml");
const contentBaseUrl = String(process.env.VITE_BLOG_RAW || "").trim();

if (!contentBaseUrl) {
  throw new Error("缺少 VITE_BLOG_RAW，无法生成 RSS。");
}

try {
  await access(snapshotPath);
} catch {
  throw new Error("缺少 SSG 博客快照，请先运行 generate-routes.mjs。");
}

const snapshotUrl = pathToFileURL(snapshotPath);
snapshotUrl.searchParams.set("rss", String(Date.now()));
const snapshot = (await import(snapshotUrl.href)).default;
const { xml, items } = createRssFeed(snapshot?.articles, { contentBaseUrl });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, xml, "utf8");

console.log(`Generated RSS feed: ${items.length} articles -> ${outputPath}`);
