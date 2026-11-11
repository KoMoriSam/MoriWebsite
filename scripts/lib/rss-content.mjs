import { parseFragment, serialize } from "parse5";

import { wikiLinkDependencies } from "../../src/utils/markdown/markdown-it-wikilink.js";
import { createArticleWikiLinkResolver } from "../../src/utils/blog/article-wiki-links.js";
import { createArticleAssetResolver } from "../../src/utils/resolve-article-assets.js";
import { getArticlePath, getSourceLocale } from "../../src/utils/blog/article-versions.js";
import { renderRssMarkdown } from "./rss-markdown.mjs";

export const RSS_ITEM_LIMIT = 20;
export const RSS_SITE_URL = "https://komori.cc";
export const RSS_PATH = "/rss.xml";

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

const makeHtmlUrlsAbsolute = (
  html,
  articleUrl,
  { assetResolver, bannerName } = {},
) => {
  const fragment = parseFragment(html);
  walkHtml(fragment, (node) => {
    if (!node.tagName || !Array.isArray(node.attrs)) return;
    const footnoteLink = node.attrs.some(({ name, value }) =>
      name === "class" && value.split(/\s+/u).includes("footnote-backref"),
    ) || node.parentNode?.attrs?.some(({ name, value }) =>
      name === "class" && value.split(/\s+/u).includes("footnote-ref"),
    );
    for (const attribute of node.attrs) {
      if (attribute.name !== "href" && attribute.name !== "src") continue;
      let value = normalizeText(attribute.value);
      if (!value || /^(?:data:|mailto:)/i.test(value)) continue;
      if (value.startsWith("#") && (footnoteLink || node.tagName === "use")) continue;
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
    return decodeURIComponent(
      new URL(value, RSS_SITE_URL).pathname.split("/").at(-1) || "",
    );
  } catch {
    return value.split("|")[0].split("/").at(-1) || "";
  }
};

const normalizeArticle = (
  entry,
  { assetResolver, now, siteUrl, renderContent, resolveWikiLink, mathPlugin },
) => {
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

  const identityPath = getArticlePath(id, null);
  const guidPath = article.slug ? identityPath : entry?.path || identityPath;
  const guid = new URL(guidPath, `${siteUrl}/`).href;
  const articleUrl = article.slug
    ? new URL(getArticlePath(article, getSourceLocale(article)), `${siteUrl}/`).href
    : guid;
  const resolvedBannerName = bannerFileName(article.banner);
  const dependencies = wikiLinkDependencies(content, resolveWikiLink);
  const html = renderContent([content, articleUrl, resolvedBannerName, dependencies, Boolean(mathPlugin)], () => {
    const rendered = renderRssMarkdown(content, { articleUrl, resolveWikiLink, mathPlugin });
    return makeHtmlUrlsAbsolute(rendered, articleUrl, {
      assetResolver,
      bannerName: resolvedBannerName,
    });
  });
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
    guid,
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
    `      <guid isPermaLink="${item.guid === item.url}">${escapeXml(item.guid)}</guid>`,
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
    renderContent = (_input, render) => render(),
    mathPlugin,
  } = {},
) => {
  if (!Array.isArray(entries)) throw new Error("RSS 文章数据必须是数组。");
  if (!normalizeText(contentBaseUrl))
    throw new Error("RSS 缺少博客资源基础地址。");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("RSS 生成时间无效。");
  }
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("RSS 条目上限必须是正整数。");
  }

  const normalizedSiteUrl = normalizeText(siteUrl).replace(/\/+$/, "");
  const assetResolver = createArticleAssetResolver(contentBaseUrl);
  const resolveNote = createArticleWikiLinkResolver(entries.flatMap((entry) => {
    const article = entry?.article;
    return !entry?.legacy && article?.public === true &&
      (!article.lang || article.lang === getSourceLocale(article))
      ? [article]
      : [];
  }));
  const resolveWikiLink = (note) => resolveNote(note);
  const seenIds = new Set();
  const items = [];

  for (const entry of entries) {
    // Select one source-language entry per article.
    const { article, legacy } = entry || {};
    if (article?.lang) {
      const usesSlugRoute = article.slug && article.slug !== (entry.id || article.id);
      const isSourceEntry = usesSlugRoute
        ? !legacy && article.lang === getSourceLocale(article)
        : legacy;
      if (!isSourceEntry) continue;
    }
    const item = normalizeArticle(entry, {
      assetResolver,
      now,
      siteUrl: normalizedSiteUrl,
      renderContent,
      resolveWikiLink,
      mathPlugin,
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
