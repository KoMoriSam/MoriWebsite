import { parseFragment, serialize } from "parse5";

import {
  MARKDOWN_MODE_STANDARD,
  renderMarkdown,
} from "../src/utils/markdown/render-markdown.js";
import { sanitizeMarkdownHtml } from "../src/utils/markdown/sanitize-html.js";
import { createArticleAssetResolver } from "../src/utils/resolve-article-assets.js";

export const RSS_ITEM_LIMIT = 20;
export const RSS_SITE_URL = "https://komori.cc";
export const RSS_PATH = "/rss.xml";

const READER_COMPONENT_TAGS = new Set([
  "markdown-alert",
  "markdown-chat",
  "markdown-code",
  "markdown-link-icon",
  "markdown-mermaid",
  "markdown-moment",
]);

const normalizeText = (value) => String(value ?? "").trim();

const parseDate = (value, field, id) => {
  const text = normalizeText(value);
  const timestamp = Date.parse(text);
  if (!text || !Number.isFinite(timestamp)) {
    throw new Error(`文章 ${id} 的 ${field} 不是有效日期。`);
  }
  return new Date(timestamp);
};

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const wrapCdata = (value) =>
  `<![CDATA[${String(value ?? "").replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

const walkHtml = (node, visitor) => {
  for (const child of node.childNodes || []) {
    visitor(child);
    walkHtml(child, visitor);
  }
};

const unwrapReaderComponents = (node) => {
  if (!Array.isArray(node.childNodes)) return;

  const children = [];
  for (const child of node.childNodes) {
    unwrapReaderComponents(child);
    if (child.tagName && READER_COMPONENT_TAGS.has(child.tagName)) {
      for (const nested of child.childNodes || []) {
        nested.parentNode = node;
        children.push(nested);
      }
    } else {
      children.push(child);
    }
  }
  node.childNodes = children;
};

const makeHtmlUrlsAbsolute = (
  html,
  articleUrl,
  { assetResolver, bannerName } = {},
) => {
  const fragment = parseFragment(html);
  unwrapReaderComponents(fragment);
  walkHtml(fragment, (node) => {
    if (!node.tagName || !Array.isArray(node.attrs)) return;
    for (const attribute of node.attrs) {
      if (attribute.name !== "href" && attribute.name !== "src") continue;
      let value = normalizeText(attribute.value);
      if (!value || /^(?:data:|mailto:)/i.test(value)) continue;
      if (node.tagName === "img" && attribute.name === "src" && assetResolver) {
        value = assetResolver.normalizeImageSrc(value, { bannerName });
      }
      try {
        attribute.value = new URL(value, articleUrl).href;
      } catch {
        attribute.value = "";
      }
    }
    node.attrs = node.attrs.filter((attribute) => attribute.value !== "");
  });
  return serialize(fragment);
};

const extractPlainText = (html) => {
  const fragment = parseFragment(html);
  const chunks = [];
  walkHtml(fragment, (node) => {
    if (node.nodeName === "#text" && node.value) chunks.push(node.value);
  });
  return chunks.join(" ").replace(/\s+/g, " ").trim();
};

const truncateText = (value, limit = 320) => {
  const text = normalizeText(value).replace(/\s+/g, " ");
  return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}…`;
};

const bannerFileName = (banner) => {
  const value = normalizeText(banner);
  if (!value) return "";
  try {
    return decodeURIComponent(new URL(value, RSS_SITE_URL).pathname.split("/").at(-1) || "");
  } catch {
    return value.split("|")[0].split("/").at(-1) || "";
  }
};

const normalizeArticle = (entry, { assetResolver, now, siteUrl }) => {
  const article = entry?.article || {};
  const id = normalizeText(entry?.id || article.id);
  if (!id) throw new Error("RSS 文章缺少 id。");
  if (article.public !== true) return null;

  const title = normalizeText(article.title);
  const content = normalizeText(entry?.content);
  if (!title) throw new Error(`文章 ${id} 缺少标题。`);
  if (!content) throw new Error(`文章 ${id} 缺少正文。`);

  const publishedAt = parseDate(article.date, "date", id);
  const modifiedAt = article.modified
    ? parseDate(article.modified, "modified", id)
    : publishedAt;
  if (publishedAt.getTime() > now.getTime()) return null;

  const articleUrl = new URL(
    entry?.path || `/blog/${encodeURIComponent(id)}`,
    `${siteUrl}/`,
  ).href;
  const resolvedBannerName = bannerFileName(article.banner);
  const markdown = assetResolver.normalizeMarkdown(content, {
    bannerName: resolvedBannerName,
    output: "markdown",
  });
  const rendered = renderMarkdown(markdown, { mode: MARKDOWN_MODE_STANDARD });
  const html = makeHtmlUrlsAbsolute(
    sanitizeMarkdownHtml(rendered),
    articleUrl,
    { assetResolver, bannerName: resolvedBannerName },
  );
  const summary = truncateText(article.summary || extractPlainText(html));
  const tags = [
    ...new Set(
      (Array.isArray(article.tags) ? article.tags : [])
        .map(normalizeText)
        .filter(Boolean),
    ),
  ];

  return {
    id,
    title,
    summary,
    html,
    url: articleUrl,
    publishedAt,
    modifiedAt,
    tags,
  };
};

const renderItem = (item) => {
  const categories = item.tags
    .map((tag) => `      <category>${escapeXml(tag)}</category>`)
    .join("\n");
  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
    `      <pubDate>${item.publishedAt.toUTCString()}</pubDate>`,
    "      <dc:creator>KoMoriSam</dc:creator>",
    `      <description>${escapeXml(item.summary)}</description>`,
    categories,
    `      <content:encoded>${wrapCdata(item.html)}</content:encoded>`,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
};

export const createRssFeed = (
  entries,
  {
    contentBaseUrl,
    now = new Date(),
    siteUrl = RSS_SITE_URL,
    limit = RSS_ITEM_LIMIT,
  } = {},
) => {
  if (!Array.isArray(entries)) throw new Error("RSS 文章数据必须是数组。");
  if (!normalizeText(contentBaseUrl)) throw new Error("RSS 缺少博客资源基础地址。");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("RSS 生成时间无效。");
  }
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("RSS 条目上限必须是正整数。");
  }

  const normalizedSiteUrl = normalizeText(siteUrl).replace(/\/+$/, "");
  const assetResolver = createArticleAssetResolver(contentBaseUrl);
  const seenIds = new Set();
  const items = [];

  for (const entry of entries) {
    const item = normalizeArticle(entry, {
      assetResolver,
      now,
      siteUrl: normalizedSiteUrl,
    });
    if (!item) continue;
    if (seenIds.has(item.id)) throw new Error(`RSS 文章 id 重复：${item.id}`);
    seenIds.add(item.id);
    items.push(item);
  }

  items.sort(
    (left, right) =>
      right.publishedAt.getTime() - left.publishedAt.getTime() ||
      left.id.localeCompare(right.id, "zh-CN"),
  );
  const selectedItems = items.slice(0, limit);
  const lastBuildDate = selectedItems.length
    ? new Date(
        Math.max(...selectedItems.map((item) => item.modifiedAt.getTime())),
      )
    : now;
  const feedUrl = new URL(RSS_PATH, `${normalizedSiteUrl}/`).href;
  const blogUrl = new URL("/blog", `${normalizedSiteUrl}/`).href;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>远方之森</title>",
    `    <link>${escapeXml(blogUrl)}</link>`,
    "    <description>远方之森的博客推文更新</description>",
    "    <language>zh-CN</language>",
    `    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...selectedItems.map(renderItem),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return { xml, items: selectedItems };
};
