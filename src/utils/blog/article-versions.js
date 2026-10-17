export const ARTICLE_LOCALES = ["zh-CN", "en", "si"];

export const getSourceLocale = (article) => article?.sourceLocale || "zh-CN";

export function getArticleLocales(article) {
  if (!article) return [];
  return [getSourceLocale(article), ...ARTICLE_LOCALES.filter(
    (locale) => locale !== getSourceLocale(article) && article.translations?.[locale],
  )];
}

export function getArticlePath(id, locale = "zh-CN") {
  return `/blog/${encodeURIComponent(String(id))}/${locale}`;
}

// Explicit URLs never silently fall back. Automatic entry points and lists do.
export function resolveArticleVersion(article, locale, { explicit = false } = {}) {
  if (!article) return null;
  const sourceLocale = getSourceLocale(article);
  const requestedTranslation = article.translations?.[locale];
  if (locale !== sourceLocale && !requestedTranslation && explicit) return null;
  const fallbackLocale = locale === "si" && article.translations?.en ? "en" : sourceLocale;
  const lang = locale === sourceLocale || requestedTranslation ? locale : fallbackLocale;
  const translation = lang === sourceLocale ? null : article.translations?.[lang];
  const localized = translation ? {
    summary: "", aliases: [], length: undefined, created: undefined,
    modified: undefined, machineTranslated: false, content: "",
    frontmatter: undefined, metadata: undefined, metadataText: "",
    ...translation,
  } : {};
  return {
    ...article, ...localized,
    id: article.id, date: article.date, sourceLocale, lang,
    machineTranslated: translation ? translation.machineTranslated === true : false,
    routePath: getArticlePath(article.id, lang),
  };
}

export function validateArticleIndex(articles) {
  const ids = new Set();
  const paths = new Set();
  const safeId = (value) => typeof value === "string" && /^[\p{L}\p{N}_-]+$/u.test(value);
  const checkPath = (value, expected) => {
    if (typeof value !== "string" || value !== expected || paths.has(value)) {
      throw new Error(`Invalid or duplicate article path: ${value}`);
    }
    paths.add(value);
  };
  for (const article of articles) {
    if (!safeId(article.id) || ids.has(article.id) || !article.title ||
        !ARTICLE_LOCALES.includes(getSourceLocale(article)) || article.public === false) {
      throw new Error(`Invalid or duplicate article: ${article.id}`);
    }
    ids.add(article.id);
    checkPath(article.path, `${article.id}.md`);
    for (const [lang, translation] of Object.entries(article.translations || {})) {
      if (!ARTICLE_LOCALES.includes(lang) || lang === getSourceLocale(article) ||
          !translation?.title || typeof translation.machineTranslated !== "boolean" ||
          translation.public === false ||
          (translation.lang && translation.lang !== lang) ||
          (translation.translationOf && translation.translationOf !== article.id)) {
        throw new Error(`Invalid translation: ${article.id}/${lang}`);
      }
      checkPath(translation.path, `${lang}/${article.id}.md`);
    }
  }
  return articles;
}
