import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import fm from "front-matter";
import { ARTICLE_LOCALES, validateArticleIndex } from "../src/utils/blog/article-versions.js";

const root = path.resolve("mock/article");
const isPublic = (attributes) => [attributes.public, attributes.publish].some((value) => value === true || value === "true");
const countWords = (body) => [...body.matchAll(/\p{Script=Han}|[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu)].length;

if (fs.existsSync(root)) {
  const indexPath = path.join(root, "index.json");
  const previous = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : [];
  const previousById = new Map(previous.map((article) => [article.id, article]));
  const readDocument = (file) => {
    const raw = fs.readFileSync(path.join(root, file), "utf8");
    return { ...fm(raw), contentHash: createHash("sha256").update(raw).digest("hex") };
  };
  const index = fs.readdirSync(root).filter((file) => file.endsWith(".md")).flatMap((file) => {
    const { attributes, body, contentHash } = readDocument(file);
    if (!isPublic(attributes)) return [];
    const id = path.basename(file, ".md");
    return [{
      ...previousById.get(id), ...attributes, id, path: file,
      title: attributes.title || id, date: attributes.date || id,
      tags: Array.isArray(attributes.tags) ? attributes.tags : [],
      summary: attributes.summary || previousById.get(id)?.summary || body.trim().slice(0, 100),
      length: countWords(body), contentHash, sourceLocale: attributes.lang || "zh-CN", translations: {},
    }];
  });
  const byId = new Map(index.map((article) => [article.id, article]));
  for (const lang of ARTICLE_LOCALES) {
    const directory = path.join(root, lang);
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory).filter((file) => file.endsWith(".md"))) {
      const relativePath = `${lang}/${file}`;
      const { attributes, body, contentHash } = readDocument(relativePath);
      if (!isPublic(attributes)) continue;
      const source = byId.get(attributes.translationOf);
      if (!source || attributes.lang !== lang || file !== `${source.id}.md` ||
          !attributes.title || typeof attributes.machineTranslated !== "boolean") {
        throw new Error(`Invalid mock translation: ${relativePath}`);
      }
      const { date, public: published, publish, ...metadata } = attributes;
      source.translations[lang] = {
        ...metadata, path: relativePath, contentHash, length: countWords(body),
        summary: attributes.summary || body.trim().slice(0, 100),
      };
    }
  }
  validateArticleIndex(index);
  index.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || b.id.localeCompare(a.id));
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const translations = index.reduce((count, article) => count + Object.keys(article.translations).length, 0);
  console.log(`Mock blog index: ${index.length} articles, ${translations} translations`);
}
