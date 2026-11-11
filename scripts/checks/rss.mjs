import assert from "node:assert/strict";

import { createRssFeed, wrapCdata } from "../lib/rss-content.mjs";
import { loadMathJaxPlugin } from "../../src/utils/markdown/mathjax-svg.js";
import { createArticleAssetResolver } from "../../src/utils/resolve-article-assets.js";

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
  assert.match(xml, /在原文查看图表/);
  assert.match(xml, /保留文字/);
  assert.doesNotMatch(xml, /<script|markdown-alert/i);
  assert.doesNotMatch(xml, /\]\]> CDATA/);
  assert.equal(
    wrapCdata("before]]>after"),
    "<![CDATA[before]]]]><![CDATA[>after]]>",
  );
  assert.ok(items[0].summary.startsWith("标题 & 内容"));
}

{
  const target = makeEntry(1, {
    id: "2026-07-26",
    article: { title: "站内文章", slug: "site-notes", path: "2026-07-26.md" },
  });
  const source = makeEntry(2, {
    content: [
      "[[2026-07-26|前篇]]、[[未发布|只显示别名]]、{汉字|かんじ}、==高亮==、H~2~O、x^2^、:tada:",
      "",
      "[带说明]{.tooltip data-tip=\"这是一条提示\"} 和脚注[^note]。",
      "",
      "[^note]: 这里是脚注正文",
      "",
      "> [!IMPORTANT]- **注意事项**",
      "> 提示正文。",
      "",
      "> [!chat]",
      ">",
      "> > **Mori** 10:30",
      "> > 聊天里的 **粗体** 和 [链接](/blog)。",
      "> > <img src=\"safe.png\" onerror=\"alert(1)\">",
      "",
      "> [!moment] **Mori** · 10:45",
      ">",
      "> 动态正文",
      ">",
      "> ![配图](moment.png)",
      "> ❤️ 12",
      "",
      "- [x] 已处理",
      "- [/] 正在处理",
      "",
      "公式 $x^2$。",
      "",
      "```markdown title=\"源语法示例\"",
      "[[2026-07-26]]",
      "```",
    ].join("\n"),
  });
  const options = {
    contentBaseUrl: "https://raw.example.com/blog",
    now,
    mathPlugin: await loadMathJaxPlugin(),
  };
  const { items: [item] } = createRssFeed([source, target], options);
  assert.match(item.html, /<a href="https:\/\/komori\.cc\/blog\/site-notes\/zh-CN">前篇<\/a>、只显示别名/u);
  assert.match(item.html, /<ruby>汉字<rp>（<\/rp><rt>かんじ<\/rt>/u);
  assert.match(item.html, /<mark>高亮<\/mark>、H<sub>2<\/sub>O、x<sup>2<\/sup>、🎉/u);
  assert.match(item.html, /带说明（这是一条提示）/u);
  assert.match(item.html, /<a href="#fn1" id="fnref1">1<\/a>/u);
  assert.match(item.html, /这里是脚注正文 <a href="#fnref1"/u);
  assert.match(item.html, /<blockquote><p><strong>注意事项<\/strong>/u);
  assert.match(item.html, /<strong>Mori · 10:30<\/strong>/u);
  assert.match(item.html, /聊天里的 <strong>粗体<\/strong> 和 <a href="https:\/\/komori\.cc\/blog">链接<\/a>/u);
  assert.match(item.html, /动态正文[\s\S]*moment\.png[\s\S]*❤️ 12/u);
  assert.match(item.html, /\[已完成\] <span[^>]*>已处理/u);
  assert.match(item.html, /\[进行中\] <span[^>]*>正在处理/u);
  assert.match(item.html, /<mjx-container[^>]*data-reader-latex-source="x\^2"[^>]*><svg/u);
  assert.match(item.html, /<strong>源语法示例<\/strong>[\s\S]*<code[^>]*>\[\[2026-07-26\]\]/u);
  assert.doesNotMatch(item.html, /onerror|<markdown-|\[!|\[\^note\]/u);

  const cacheInputs = [];
  for (const slug of ["site-notes", "updated-notes"]) {
    createRssFeed([source, { ...target, article: { ...target.article, slug } }], {
      ...options,
      renderContent(input) {
        cacheInputs.push(JSON.stringify(input));
        return "";
      },
    });
  }
  assert.notEqual(cacheInputs[0], cacheInputs[2], "the referrer cache depends on the target's slug");
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

console.log("检查通过：博客 RSS 订阅内容与链接。");
