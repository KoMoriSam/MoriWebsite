import dotenv from "dotenv";
import fm from "front-matter";
import fs from "fs";
import path from "path";
import { createArticleAssetResolver } from "../src/utils/article-assets.js";

dotenv.config({
  path: ".env.production",
});

const API_URL = process.env.VITE_BLOG_RAW;
const NOVEL_API_URL = process.env.VITE_NOVEL_RAW;

if (!API_URL) {
  throw new Error("缺少 VITE_BLOG_RAW");
}

if (!NOVEL_API_URL) {
  throw new Error("缺少 VITE_NOVEL_RAW");
}

const BASE = API_URL.replace(/\/+$/, "");
const NOVEL_BASE = NOVEL_API_URL.replace(/\/+$/, "");
const { normalizeBanner } = createArticleAssetResolver(BASE);

console.log("Article API:", BASE);

/**
 * 获取文章索引
 */
const indexRes = await fetch(`${BASE}/index.json`);

if (!indexRes.ok) {
  throw new Error(`获取 index.json 失败: ${indexRes.status}`);
}

const raw = await indexRes.json();

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

console.log(`Found ${articles.length} articles`);

const generatedArticles = [];

for (const article of articles) {
  if (!article.id || !article.path) {
    continue;
  }

  console.log("Fetching:", article.path);

  const mdRes = await fetch(`${BASE}/${article.path}`);

  if (!mdRes.ok) {
    console.warn("Skip:", article.path);
    continue;
  }

  const rawContent = await mdRes.text();
  const { attributes, body: content } = fm(rawContent);
  const articleData = {
    ...attributes,
    ...article,
  };

  generatedArticles.push({
    id: article.id,
    path: `/blog/${article.id}`,
    article: {
      ...articleData,
      banner: normalizeBanner(articleData.banner),
    },
    content,
  });
}

/*
生成统一的 SSG 数据快照。
这些数据会同时用于服务端渲染和客户端 hydration，避免首屏空内容。
*/

const novelIndexRes = await fetch(`${NOVEL_BASE}/index.json`);

if (!novelIndexRes.ok) {
  throw new Error(`获取小说 index.json 失败: ${novelIndexRes.status}`);
}

const novelChapters = await novelIndexRes.json();
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

console.log(
  "Generated SSG data:",
  generatedArticles.length,
  "articles,",
  Object.keys(changelog).length,
  "changelog versions, and",
  Object.keys(novelChapters || {}).length,
  "novel volumes",
);
