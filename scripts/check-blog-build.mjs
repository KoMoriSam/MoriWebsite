import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "parse5";
import snapshot from "../src/router/ssg-data.generated.js";
import metadata from "../src/router/article-metadata.generated.js";
import { getArticleLocales, getArticlePath } from "../src/utils/blog/article-versions.js";

const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
const search = JSON.parse(fs.readFileSync("dist/pagefind/pagefind-entry.json", "utf8"));
const visit = (node, nodes = []) => {
  nodes.push(node);
  for (const child of node.childNodes || []) visit(child, nodes);
  return nodes;
};
const attr = (node, key) => node?.attrs?.find((item) => item.name === key)?.value;
for (const entry of snapshot.articles) {
  const lang = entry.article.lang || "zh-CN";
  const canonical = `https://komori.cc${getArticlePath(entry.id, lang)}`;
  const file = path.join("dist", `${entry.path}.html`);
  const raw = fs.readFileSync(file, "utf8");
  const nodes = visit(parse(raw));
  const find = (tag, key, value) => nodes.find((node) => node.tagName === tag && attr(node, key) === value);
  assert.equal(attr(nodes.find((node) => node.tagName === "html"), "lang"), lang, file);
  assert.equal(attr(find("article", "id", "markdown"), "lang"), lang, file);
  assert.equal(attr(find("link", "rel", "canonical"), "href"), canonical, file);
  const data = find("script", "type", "application/ld+json");
  const schema = JSON.parse(data.childNodes.map((node) => node.value || "").join(""));
  assert.equal(schema.inLanguage, lang, file);
  assert.equal(schema.headline, entry.article.title, file);
  assert.equal(schema.url, canonical, file);
  assert.ok(find("h1", "id", `article-title-${entry.id}`), `missing static title: ${file}`);
  for (const locale of getArticleLocales(entry.article)) {
    assert.equal(attr(find("link", "hreflang", locale), "href"), `https://komori.cc${getArticlePath(entry.id, locale)}`);
  }
  if (entry.legacy) assert.ok(!sitemap.includes(`<loc>https://komori.cc${entry.path}</loc>`));
  else {
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), file);
    assert.ok(search.languages[lang === "zh-CN" ? "zh" : lang], `missing Pagefind language: ${lang}`);
  }
  assert.ok(!JSON.stringify(metadata).includes(entry.content), "client route metadata must not contain Markdown bodies");
}
const sourceCount = new Set(snapshot.articles.map((entry) => entry.id)).size;
const feedCount = (fs.readFileSync("dist/rss.xml", "utf8").match(/<item>/g) || []).length;
assert.ok(feedCount <= sourceCount, "translations must not duplicate RSS entries");
console.log(`Blog build: ${snapshot.articles.length} static article pages, ${sourceCount} source identities, canonical/hreflang/schema/language, sitemap, Pagefind and body isolation passed.`);
