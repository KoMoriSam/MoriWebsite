import dotenv from "dotenv";
import fm from "front-matter";
import fs from "fs";
import path from "path";

dotenv.config({
  path: ".env.production",
});

const API_URL = process.env.VITE_BLOG_RAW;

if (!API_URL) {
  throw new Error("缺少 VITE_BLOG_RAW");
}

const BASE = API_URL.replace(/\/+$/, "");

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
  const { body: content } = fm(rawContent);

  generatedArticles.push({
    id: article.id,
    path: `/blog/${article.id}`,
    article,
    content,
  });
}

/*
生成数据文件
*/

const dataFile = `
// AUTO GENERATED
// DO NOT EDIT


export default ${JSON.stringify(generatedArticles, null, 2)}

`;

fs.writeFileSync(
  path.resolve("src/router/article-data.generated.js"),
  dataFile,
  "utf-8",
);

/*
路由定义保存在 src/router/article-routes.js。
该源码通过 import.meta.glob 可选读取本文件生成的数据：
- pnpm dev：生成文件可以不存在，文章使用 /blog/:articleId? 动态路由和 API。
- pnpm build：prebuild 先生成数据，ViteSSG 再据此加入文章静态路由。
*/

const legacyRouteFile = path.resolve("src/router/article-routes.generated.js");

if (fs.existsSync(legacyRouteFile)) {
  fs.unlinkSync(legacyRouteFile);
}

console.log("Generated article data:", generatedArticles.length);
