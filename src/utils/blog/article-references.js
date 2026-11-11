import MarkdownIt from "markdown-it";
import { wikiLinkPlugin } from "../markdown/markdown-it-wikilink.js";
import { createArticleWikiLinkResolver } from "./article-wiki-links.js";
import { getArticlePath, getArticleSlug, getSourceLocale, normalizeArticleRouteKey } from "./article-versions.js";

export function createArticleReferenceResolver(articles = []) {
  const published = articles.filter((article) => article?.id && article.public !== false);
  const ids = new Map();
  for (const article of published) {
    const id = String(article.id);
    ids.set(normalizeArticleRouteKey(id), id);
    ids.set(normalizeArticleRouteKey(getArticleSlug(article)), id);
  }
  const markdown = new MarkdownIt().use(wikiLinkPlugin, {
    resolveNote: createArticleWikiLinkResolver(published),
  });

  return (content, current) => {
    const references = new Set();
    const currentPath = current.routePath || getArticlePath(current, current.lang || getSourceLocale(current));
    for (const block of markdown.parse(String(content || ""), {})) {
      for (const token of block.children || []) {
        if (token.type !== "link_open") continue;
        try {
          const url = new URL(token.attrGet("href"), `https://komori.cc${currentPath}`);
          if (url.origin !== "https://komori.cc") continue;
          const match = url.pathname.match(/^\/blog\/([^/]+)(?:\/(?:zh-CN|en|si))?\/?$/u);
          if (!match) continue;
          const id = ids.get(normalizeArticleRouteKey(decodeURIComponent(match[1])));
          if (id && id !== String(current.id)) references.add(id);
        } catch {
          // Malformed links do not establish an article relationship.
        }
      }
    }
    return [...references];
  };
}
