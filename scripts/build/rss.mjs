import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import dotenv from "dotenv";

import { createRssFeed } from "../lib/rss-content.mjs";

dotenv.config({ path: ".env.production", quiet: true });

const snapshotPath = resolve("src/router/ssg-data.generated.js");
const outputPath = resolve("public/rss.xml");
const contentBaseUrl = String(process.env.VITE_BLOG_RAW || "").trim();

if (!contentBaseUrl) {
  throw new Error("无法生成博客订阅源。请在 .env.production 中设置 VITE_BLOG_RAW。");
}

try {
  await access(snapshotPath);
} catch {
  throw new Error("博客内容尚未准备完成。请先运行 pnpm generate routes，再生成订阅源。");
}

const snapshotUrl = pathToFileURL(snapshotPath);
snapshotUrl.searchParams.set("rss", String(Date.now()));
const snapshot = (await import(snapshotUrl.href)).default;
const { xml, items } = createRssFeed(snapshot?.articles, { contentBaseUrl });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, xml, "utf8");

console.log(`博客订阅源已生成：${items.length} 篇文章。文件：${outputPath}`);
