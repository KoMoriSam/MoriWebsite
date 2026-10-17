import fm from "front-matter";
import { createHash } from "node:crypto";
import { getArticleLocales, getSourceLocale, resolveArticleVersion, validateArticleIndex } from "../../src/utils/blog/article-versions.js";
import { createArticleAssetResolver } from "../../src/utils/resolve-article-assets.js";

export async function retryDownload(url, parse = (response) => response.text(), fetcher = fetch) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await parse(response);
    } catch (cause) {
      error = cause;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw error;
}

export async function createArticleSnapshot(articles, baseUrl, fetcher = fetch) {
  validateArticleIndex(articles);
  const resolver = createArticleAssetResolver(baseUrl);
  const entries = [];
  for (const source of articles) {
    for (const lang of getArticleLocales(source)) {
      const version = resolveArticleVersion(source, lang, { explicit: true });
      const url = new URL(`${baseUrl}/${version.path}`);
      if (version.contentHash) url.searchParams.set("v", version.contentHash);
      const document = await retryDownload(url, async (response) => {
        const raw = await response.text();
        if (version.contentHash && createHash("sha256").update(raw).digest("hex") !== version.contentHash) {
          throw new Error(`Article snapshot changed: ${version.path}`);
        }
        const parsed = fm(raw);
        if (lang !== getSourceLocale(source) && (
          parsed.attributes.lang !== lang || parsed.attributes.translationOf !== source.id ||
          typeof parsed.attributes.machineTranslated !== "boolean" ||
          !parsed.attributes.title || parsed.attributes.public !== true ||
          parsed.attributes.machineTranslated !== version.machineTranslated
        )) throw new Error(`Invalid published translation frontmatter: ${version.path}`);
        return parsed;
      }, fetcher);
      const article = { ...document.attributes, ...version, banner: resolver.normalizeBanner(version.banner) };
      const content = resolver.normalizeMarkdown(document.body, {
        bannerName: String(document.attributes.banner || source.banner || "").split("|")[0],
      });
      const entry = { id: source.id, path: version.routePath, article, content };
      entries.push(entry);
      if (lang === getSourceLocale(source)) entries.push({ ...entry, path: `/blog/${encodeURIComponent(source.id)}`, legacy: true });
    }
  }
  return entries;
}
