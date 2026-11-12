import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getArticleLocales, getArticlePath, getArticleSlug, getSourceLocale,
  resolveArticleVersion, validateArticleIndex } from "../../src/utils/blog/article-versions.js";
import { createArticleMetadata } from "../../src/utils/ssg/page-data.js";

export async function preparePreviewData(root) {
  const index = validateArticleIndex(JSON.parse(await readFile(resolve(root, "mock/article/index.json"), "utf8")));
  const entries = index.flatMap((source) => getArticleLocales(source).flatMap((locale) => {
    const article = resolveArticleVersion(source, locale, { explicit: true });
    const entry = { id: source.id, path: article.routePath, article };
    if (getArticleSlug(source) !== source.id || locale !== getSourceLocale(source)) return [entry];
    return [entry, { ...entry, path: getArticlePath(source.id, null), legacy: true }];
  }));
  const directory = resolve(root, "site-data");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, "articles.json"), JSON.stringify(createArticleMetadata(entries))),
    writeFile(resolve(directory, "images.json"), "[]"),
  ]);
}
