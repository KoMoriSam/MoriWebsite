import { normalizeContentLicense } from "../content-license.js";
import { getLocaleFallbacks } from "../../i18n/locale.js";

export const ARTICLE_LOCALES = ["zh-CN", "en", "si"];

export const getSourceLocale = (article) => article?.sourceLocale || "zh-CN";

export function getArticleLocales(article) {
  if (!article) return [];
  return [getSourceLocale(article), ...ARTICLE_LOCALES.filter(
    (locale) => locale !== getSourceLocale(article) && article.translations?.[locale],
  )];
}

export const getArticleSlug = (article) => article.slug || article.id;

export const normalizeArticleRouteKey = (key) =>
  String(key || "").normalize("NFC").toLowerCase();

export function getArticlePath(articleOrId, locale = "zh-CN") {
  const key = typeof articleOrId === "object" ? getArticleSlug(articleOrId) : articleOrId;
  const base = `/blog/${encodeURIComponent(String(key))}`;
  return locale ? `${base}/${locale}` : base;
}

export function getArticleRedirects(articles) {
  const redirects = new Map();
  for (const article of articles) {
    if (getArticleSlug(article) === article.id) continue;
    const sourcePath = getArticlePath(article, getSourceLocale(article));
    redirects.set(getArticlePath(article.id, null), sourcePath);
    redirects.set(getArticlePath(article, null), sourcePath);
    for (const locale of getArticleLocales(article)) {
      redirects.set(getArticlePath(article.id, locale), getArticlePath(article, locale));
    }
  }
  return redirects;
}

// Explicit URLs never silently fall back. Automatic entry points and lists do.
export function resolveArticleVersion(article, locale, { explicit = false } = {}) {
  if (!article) return null;
  const sourceLocale = getSourceLocale(article);
  const requestedTranslation = article.translations?.[locale];
  if (locale !== sourceLocale && !requestedTranslation && explicit) return null;
  const lang = [...getLocaleFallbacks(locale), sourceLocale].find(
    (language) => language === sourceLocale || article.translations?.[language],
  );
  const translation = lang === sourceLocale ? null : article.translations?.[lang];
  const localized = translation ? {
    summary: "", aliases: [], length: undefined, created: undefined,
    modified: undefined, machineTranslated: false, content: "",
    frontmatter: undefined, metadata: undefined, metadataText: "",
    ...translation,
  } : {};
  const license = translation?.license ?? article.license;
  return {
    ...article, ...localized,
    ...(license != null ? { license } : {}),
    id: article.id, slug: article.slug, date: article.date, sourceLocale, lang,
    machineTranslated: translation ? translation.machineTranslated === true : false,
    routePath: getArticlePath(article, lang),
  };
}

export function validateArticleIndex(articles) {
  const ids = new Set();
  const paths = new Set();
  const routeKeys = new Set();
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
    if (article.slug != null && !safeId(article.slug)) {
      throw new Error(`Invalid article slug: ${article.slug}`);
    }
    for (const key of new Set([article.id, getArticleSlug(article)].map(normalizeArticleRouteKey))) {
      if (routeKeys.has(key)) throw new Error(`Duplicate article URL key: ${key}`);
      routeKeys.add(key);
    }
    normalizeContentLicense(article.license);
    checkPath(article.path, `${article.id}.md`);
    for (const [lang, translation] of Object.entries(article.translations || {})) {
      if (!ARTICLE_LOCALES.includes(lang) || lang === getSourceLocale(article) ||
          !translation?.title || typeof translation.machineTranslated !== "boolean" ||
          translation.public === false || translation.slug != null ||
          (translation.lang && translation.lang !== lang) ||
          (translation.translationOf && translation.translationOf !== article.id)) {
        throw new Error(`Invalid translation: ${article.id}/${lang}`);
      }
      checkPath(translation.path, `${lang}/${article.id}.md`);
      normalizeContentLicense(translation.license);
    }
  }
  return articles;
}
