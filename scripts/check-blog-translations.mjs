import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getArticleLocales, getArticlePath, resolveArticleVersion, validateArticleIndex } from "../src/utils/blog/article-versions.js";
import { createArticleSnapshot } from "./lib/article-snapshot.mjs";
import { createArticleMetadata, createPageData, restorePageData } from "../src/utils/ssg/page-data.js";
import { createRssFeed } from "./rss-content.mjs";
import { createIndex } from "pagefind";

const source = {
  id: "2026-09-25", path: "2026-09-25.md", title: "中文原文", summary: "中文摘要",
  date: "2026-09-25", tags: ["科普"], banner: "cover.webp", aliases: ["原文别名"],
  translations: {
    en: { path: "en/2026-09-25.md", title: "English translation", summary: "English summary", aliases: ["English alias"], machineTranslated: true },
    si: { path: "si/2026-09-25.md", title: "සිංහල ලිපිය", machineTranslated: false },
  },
};
const legacy = { id: "old", path: "old.md", title: "旧文章" };
assert.deepEqual(getArticleLocales(source), ["zh-CN", "en", "si"]);
assert.deepEqual(getArticleLocales(legacy), ["zh-CN"]);
assert.equal(resolveArticleVersion(legacy, "en").lang, "zh-CN");
assert.equal(resolveArticleVersion(legacy, "en", { explicit: true }), null);
const englishOnly = { ...source, translations: { en: source.translations.en } };
assert.equal(resolveArticleVersion(source, "si").lang, "si", "prefer Sinhala when available");
assert.equal(resolveArticleVersion(englishOnly, "si").lang, "en", "prefer English over the Chinese source");
assert.equal(resolveArticleVersion(englishOnly, "si").title, source.translations.en.title);
assert.equal(resolveArticleVersion(englishOnly, "si").routePath, "/blog/2026-09-25/en");
assert.equal(resolveArticleVersion(englishOnly, "si", { explicit: true }), null, "do not create a fake Sinhala URL");
assert.equal(resolveArticleVersion(englishOnly, "zh-CN").lang, "zh-CN");
assert.equal(resolveArticleVersion(legacy, "si").lang, "zh-CN", "use the source when neither translation exists");
assert.equal(resolveArticleVersion(source, "en").machineTranslated, true);
assert.equal(resolveArticleVersion(source, "si").machineTranslated, false);
assert.equal(resolveArticleVersion(source, "si").summary, "");
assert.deepEqual(resolveArticleVersion(source, "si").aliases, []);
assert.equal(resolveArticleVersion(source, "en").date, source.date);
assert.deepEqual(resolveArticleVersion(source, "en").tags, source.tags);
assert.equal(getArticlePath("2026-09-25", "en"), "/blog/2026-09-25/en");
validateArticleIndex([source, legacy]);
for (const mutate of [
  (item) => { item.translations.en.machineTranslated = "false"; },
  (item) => { delete item.translations.en.machineTranslated; },
  (item) => { item.translations.en.path = "../private.md"; },
  (item) => { item.translations.en.public = false; },
  (item) => { item.translations.fr = item.translations.en; },
  (item) => { item.translations.en.translationOf = "missing"; },
]) {
  const invalid = structuredClone(source);
  mutate(invalid);
  assert.throws(() => validateArticleIndex([invalid]));
}
assert.throws(() => validateArticleIndex([source, source]));

const documents = new Map([
  [source.path, "---\npublic: true\ntitle: 中文原文\n---\n中文正文\n![[photo.webp]]"],
  [source.translations.en.path, "---\ntranslationOf: '2026-09-25'\nlang: en\npublic: true\ntitle: English translation\nmachineTranslated: true\n---\nEnglish body"],
  [source.translations.si.path, "---\ntranslationOf: '2026-09-25'\nlang: si\npublic: true\ntitle: සිංහල ලිපිය\nmachineTranslated: false\n---\nසිංහල අන්තර්ගතය"],
]);
let attempts = 0;
const fetcher = async (url) => {
  attempts++;
  const document = documents.get(new URL(url).pathname.slice(1));
  return new Response(document || "Missing", { status: document ? 200 : 404 });
};
const snapshot = { articles: await createArticleSnapshot([source], "https://example.com", fetcher) };
assert.equal(snapshot.articles.length, 4);
assert.equal(snapshot.articles.filter((entry) => !entry.legacy).length, 3);
assert.equal(snapshot.articles.filter((entry) => entry.legacy).length, 1);
assert.ok(snapshot.articles[0].content.includes("https://example.com/images/photo.webp"));
const english = snapshot.articles.find((entry) => entry.article.lang === "en");
assert.equal(english.path, "/blog/2026-09-25/en");
assert.equal(english.content, "English body");
const meta = createArticleMetadata(snapshot.articles);
assert.ok(!JSON.stringify(meta).includes("English body"));
for (const entry of snapshot.articles) {
  const route = { path: entry.path, meta: { article: entry.article } };
  const data = createPageData(snapshot, route);
  assert.equal(data.article.lang, entry.article.lang);
  assert.equal(data.article.content, entry.content);
  assert.equal(restorePageData({ ...data, article: { ...data.article, lang: "invalid" } }, route), null);
  assert.equal(restorePageData(data, { ...route, path: "/different" }), null);
}
const feed = createRssFeed(snapshot.articles, { contentBaseUrl: "https://example.com", now: new Date("2026-10-17") });
assert.equal(feed.items.length, 1);
assert.equal(feed.items[0].title, "中文原文");
assert.ok(!feed.xml.includes("English translation"));
const hashed = structuredClone(source);
hashed.translations.en.contentHash = createHash("sha256").update(documents.get(source.translations.en.path)).digest("hex");
await createArticleSnapshot([hashed], "https://example.com", fetcher);
hashed.translations.en.contentHash = "bad";
attempts = 0;
await assert.rejects(createArticleSnapshot([hashed], "https://example.com", fetcher), /snapshot changed/);
assert.equal(attempts, 4, "one source request and three failed translation retries");
attempts = 0;
const missing = async (url) => {
  if (new URL(url).pathname.startsWith("/en/")) { attempts++; return new Response("", { status: 404 }); }
  return fetcher(url);
};
await assert.rejects(createArticleSnapshot([source], "https://example.com", missing), /HTTP 404/);
assert.equal(attempts, 4);
const { index, errors } = await createIndex();
assert.deepEqual(errors, []);
try {
  for (const entry of snapshot.articles.filter((entry) => !entry.legacy)) {
    const result = await index.addCustomRecord({
      url: entry.path, language: entry.article.lang === 'zh-CN' ? 'zh' : entry.article.lang,
      content: entry.content, meta: {title:entry.article.title},
    });
    assert.deepEqual(result.errors, []);
  }
  const output = await index.getFiles();
  assert.deepEqual(output.errors, []);
  const entry = output.files.find((file) => file.path === 'pagefind-entry.json');
  const languages = JSON.parse(Buffer.from(entry.content).toString('utf8')).languages;
  assert.deepEqual(Object.keys(languages).sort(), ['en', 'si', 'zh']);
} finally { await index.deleteIndex(); }
console.log("Blog translations: version selection, metadata inheritance, validation, per-language SSG hydration, RSS identity, hashes and retries passed.");
