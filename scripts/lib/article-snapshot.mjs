import fm from "front-matter";
import {
  getArticleLocales,
  getArticlePath,
  getArticleSlug,
  getSourceLocale,
  resolveArticleVersion,
  validateArticleIndex,
} from "../../src/utils/blog/article-versions.js";
import { createArticleAssetResolver } from "../../src/utils/resolve-article-assets.js";
import { createArticleReferenceResolver } from "../../src/utils/blog/article-references.js";
import { fetchContent } from "./content-source.mjs";
import { buildCache, digest } from "./build-cache.mjs";

export async function retryDownload(
  url,
  parse = (response) => response.text(),
  fetcher = fetchContent,
) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await parse(response);
    } catch (cause) {
      error = cause;
      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 300 * (attempt + 1)),
        );
    }
  }
  throw error;
}

export async function createArticleSnapshot(
  articles,
  baseUrl,
  fetcher = fetchContent,
) {
  validateArticleIndex(articles);
  const resolver = createArticleAssetResolver(baseUrl);
  const cacheVersion = process.env.SSG_CONTENT_CACHE_VERSION;
  const cache = cacheVersion && (await buildCache(".tmp/site-search-cache"));
  const entries = [];
  for (const source of articles) {
    for (const lang of getArticleLocales(source)) {
      const version = resolveArticleVersion(source, lang, { explicit: true });
      const url = new URL(`${baseUrl}/${version.path}`, "https://komori.cc");
      if (version.contentHash) url.searchParams.set("v", version.contentHash);
      const entry = await retryDownload(
        url,
        async (response) => {
          const raw = await response.text();
          const sourceHash = digest(raw);
          if (version.contentHash && sourceHash !== version.contentHash) {
            throw new Error(`Article snapshot changed: ${version.path}`);
          }
          const parsed = cache
            ? (
                await cache(
                  ["article-frontmatter", cacheVersion, sourceHash],
                  () => fm(raw),
                )
              ).value
            : fm(raw);
          if (
            lang !== getSourceLocale(source) &&
            (parsed.attributes.lang !== lang ||
              parsed.attributes.translationOf !== source.id ||
              typeof parsed.attributes.machineTranslated !== "boolean" ||
              !parsed.attributes.title ||
              parsed.attributes.public !== true ||
              parsed.attributes.machineTranslated !== version.machineTranslated)
          )
            throw new Error(
              `Invalid published translation frontmatter: ${version.path}`,
            );
          const article = {
            ...parsed.attributes,
            ...version,
            banner: resolver.normalizeBanner(version.banner),
          };
          const bannerName = String(
            parsed.attributes.banner || source.banner || "",
          ).split("|")[0];
          const normalize = () =>
            resolver.normalizeMarkdown(parsed.body, { bannerName });
          const content = cache
            ? (
                await cache(
                  [
                    "article-markdown",
                    cacheVersion,
                    baseUrl,
                    bannerName,
                    digest(parsed.body),
                  ],
                  normalize,
                )
              ).value
            : normalize();
          return { id: source.id, path: version.routePath, article, content };
        },
        fetcher,
      );
      entries.push(entry);
      if (getArticleSlug(source) === source.id && lang === getSourceLocale(source)) {
        entries.push({ ...entry, path: getArticlePath(source.id, null), legacy: true });
      }
    }
  }
  const resolveReferences = createArticleReferenceResolver(articles);
  const references = new Map(entries.filter((entry) => !entry.legacy).map((entry) => [
    entry.path, resolveReferences(entry.content, entry.article),
  ]));
  return entries.map((entry) => ({
    ...entry,
    article: {
      ...entry.article,
      references: references.get(entry.article.routePath) || [],
      translations: Object.fromEntries(Object.entries(entry.article.translations || {}).map(([lang, translation]) => [
        lang, { ...translation, references: references.get(getArticlePath(entry.article, lang)) || [] },
      ])),
    },
  }));
}
