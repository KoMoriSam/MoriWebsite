import {
  getArticleLocales,
  getArticleSlug,
  getSourceLocale,
  resolveArticleVersion,
} from "./article-versions.js";

function normalizeNote(value) {
  return String(value || "")
    .trim()
    .normalize("NFC")
    .toLowerCase();
}

export function createArticleWikiLinkResolver(articles = []) {
  const paths = new Map();
  const names = new Map();
  const previews = new Map();
  const add = (index, value, route) => {
    const key = normalizeNote(value);
    if (!key) return;
    if (!index.has(key)) index.set(key, route);
    else if (index.get(key) !== route) index.set(key, null);
  };

  for (const article of articles) {
    if (!article?.id || article.public === false) continue;
    for (const locale of getArticleLocales(article)) {
      if (article.translations?.[locale]?.public === false) continue;
      const version = resolveArticleVersion(article, locale, { explicit: true });
      const { routePath, title, aliases, path, summary, banner, lang, date, length } = version;
      previews.set(routePath, { title, summary, banner, lang, date, length });
      if (path) add(paths, path.replace(/\.md$/iu, ""), routePath);
      if (locale === getSourceLocale(article)) add(paths, getArticleSlug(article), routePath);
      const allAliases = Array.isArray(aliases) ? aliases : [aliases];
      for (const name of [title, ...allAliases])
        add(names, name, routePath);
    }
  }

  const resolve = (target) => {
    const name = normalizeNote(target);
    const path = name
      .replace(/^(?:\.\/|\/)?(?:notes\/)?/u, "")
      .replace(/\.md$/u, "");
    if (paths.has(path)) return paths.get(path);
    return name.includes("/") ? null : names.get(path);
  };
  resolve.articleForPath = (path) => previews.get(path);
  return resolve;
}
