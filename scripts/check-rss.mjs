import assert from "node:assert/strict";

import { createRssFeed, wrapCdata } from "./rss-content.mjs";
import { createArticleAssetResolver } from "../src/utils/resolve-article-assets.js";

const now = new Date("2026-09-13T12:00:00+08:00");
const makeEntry = (index, overrides = {}) => {
  const { article: articleOverrides = {}, ...entryOverrides } = overrides;
  const id = overrides.id || `article-${String(index).padStart(2, "0")}`;
  return {
    id,
    path: `/blog/${id}`,
    content: `正文 ${index}`,
    article: {
      id,
      title: `文章 ${index}`,
      date: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
      modified: new Date(Date.UTC(2026, 7, index + 1, 1)).toISOString(),
      public: true,
      tags: ["测试", index % 2 ? "奇数" : "偶数"],
      ...articleOverrides,
    },
    ...entryOverrides,
  };
};

{
  const resolver = createArticleAssetResolver("https://raw.example.com/blog");
  assert.equal(
    resolver.normalizeMarkdown("![[photo.png|说明]]"),
    "![[https://raw.example.com/blog/images/photo.png|说明]]",
  );
  assert.equal(
    resolver.normalizeMarkdown("![说明](photo.png)"),
    "![说明](https://raw.example.com/blog/images/photo.png)",
  );
}

{
  const entries = Array.from({ length: 25 }, (_, index) => makeEntry(index));
  entries.push(makeEntry(30, { id: "private", article: { public: false } }));
  entries.push(
    makeEntry(31, {
      id: "future",
      article: { date: "2026-10-01T00:00:00+08:00" },
    }),
  );
  const { xml, items } = createRssFeed(entries, {
    contentBaseUrl: "https://raw.example.com/blog",
    now,
  });
  assert.equal(items.length, 20);
  assert.equal(items[0].id, "article-24");
  assert.equal(items.at(-1).id, "article-05");
  assert.doesNotMatch(xml, /private|future/);
  assert.equal((xml.match(/<item>/g) || []).length, 20);
  assert.equal(new Set(items.map((item) => item.url)).size, 20);
}

{
  const special = makeEntry(1, {
    id: "special",
    content: [
      "## 标题 & 内容",
      "",
      "![[photo.png|图片说明]]",
      "",
      "![普通图片](other.png)",
      "",
      '<img src="raw-html.png" alt="HTML 图片">',
      "",
      "[站内链接](/blog)",
      "",
      "[同页锚点](#标题)",
      "",
      "<script>alert('xss')</script>",
      "",
      "<markdown-alert><strong>保留文字</strong></markdown-alert>",
      "",
      "```mermaid",
      "graph TD",
      "```",
      "",
      "]]> CDATA",
    ].join("\n"),
    article: {
      title: "特殊 <标题> & 测试",
      summary: "",
      banner: "https://raw.example.com/blog/images/banners/banner.png",
    },
  });
  const { xml, items } = createRssFeed([special], {
    contentBaseUrl: "https://raw.example.com/blog",
    now,
  });
  assert.equal(items.length, 1);
  assert.match(xml, /特殊 &lt;标题&gt; &amp; 测试/);
  assert.match(xml, /https:\/\/raw\.example\.com\/blog\/images\/photo\.png/);
  assert.match(xml, /https:\/\/raw\.example\.com\/blog\/images\/other\.png/);
  assert.match(xml, /https:\/\/raw\.example\.com\/blog\/images\/raw-html\.png/);
  assert.match(xml, /https:\/\/komori\.cc\/blog/);
  assert.match(xml, /https:\/\/komori\.cc\/blog\/special#%E6%A0%87%E9%A2%98/);
  assert.match(xml, /language-mermaid/);
  assert.match(xml, /保留文字/);
  assert.doesNotMatch(xml, /<script|markdown-alert/i);
  assert.doesNotMatch(xml, /\]\]> CDATA/);
  assert.equal(
    wrapCdata("before]]>after"),
    "<![CDATA[before]]]]><![CDATA[>after]]>",
  );
  assert.ok(items[0].summary.startsWith("标题 & 内容"));
}

for (const entry of [
  makeEntry(1, { id: "bad-date", article: { date: "not-a-date" } }),
  makeEntry(1, { id: "missing-title", article: { title: "" } }),
  makeEntry(1, { id: "missing-content", content: "" }),
]) {
  assert.throws(() =>
    createRssFeed([entry], {
      contentBaseUrl: "https://raw.example.com/blog",
      now,
    }),
  );
}

assert.throws(() =>
  createRssFeed(
    [makeEntry(1, { id: "duplicate" }), makeEntry(2, { id: "duplicate" })],
    { contentBaseUrl: "https://raw.example.com/blog", now },
  ),
);

console.log("RSS checks passed.");
