import dotenv from "dotenv";
import { publicCatalog } from "./novel-release.mjs";
import fs from "fs";
import path from "path";
import { createArticleMetadata } from "../../src/utils/ssg/page-data.js";
import { createArticleSnapshot, retryDownload } from "../lib/article-snapshot.mjs";
import { fetchContent } from "../lib/content-source.mjs";

dotenv.config({
  path: ".env.production",
  quiet: true,
});

const API_URL = process.env.VITE_BLOG_RAW;
const NOVEL_API_URL = process.env.VITE_NOVEL_RAW;

if (!API_URL) {
  throw new Error("无法读取博客内容。请在 .env.production 中设置 VITE_BLOG_RAW。");
}

if (!NOVEL_API_URL) {
  throw new Error("无法读取小说内容。请在 .env.production 中设置 VITE_NOVEL_RAW。");
}

const BASE = API_URL.replace(/\/+$/, "");
const NOVEL_BASE = NOVEL_API_URL.replace(/\/+$/, "");


/**
 * 获取文章索引
 */
const raw = await retryDownload(`${BASE}/index.json`, (response) => response.json());

let articles = [];

if (Array.isArray(raw)) {
  articles = raw;
} else if (raw && typeof raw === "object") {
  for (const group of Object.values(raw)) {
    if (Array.isArray(group.articles)) {
      articles.push(...group.articles);
    }
  }
}


const generatedArticles = await createArticleSnapshot(articles, BASE);
const finalIndex = await retryDownload(`${BASE}/index.json`, (response) => response.json());
if (JSON.stringify(finalIndex) !== JSON.stringify(raw)) throw new Error("博客正在更新。请等待内容发布完成后重新构建。");

/*
生成统一的 SSG 数据快照。
这些数据会同时用于服务端渲染和客户端 hydration，避免首屏空内容。
*/

const novelIndexRes = await fetchContent(`${NOVEL_BASE}/index.json`);

if (!novelIndexRes.ok) {
  throw new Error(`获取小说 index.json 失败: ${novelIndexRes.status}`);
}

const novelChapters = publicCatalog(await novelIndexRes.json());
const changelog = JSON.parse(
  fs.readFileSync(path.resolve("public/changelog.json"), "utf-8"),
);

const ssgDataFile = `
// AUTO GENERATED
// DO NOT EDIT

export default ${JSON.stringify(
  {
    articles: generatedArticles,
    changelog,
    novelChapters,
  },
  null,
  2,
)}
`;

fs.writeFileSync(
  path.resolve("src/router/ssg-data.generated.js"),
  ssgDataFile,
  "utf-8",
);

fs.writeFileSync(
  path.resolve("src/router/article-metadata.generated.js"),
  `// AUTO GENERATED - DO NOT EDIT\nexport default ${JSON.stringify(createArticleMetadata(generatedArticles), null, 2)};\n`,
  "utf-8",
);

console.log(`静态阅读页面已准备完成：${generatedArticles.length} 个文章页面、${changelog.items.length} 个更新版本、${Object.keys(novelChapters || {}).length} 个小说卷目。`);
