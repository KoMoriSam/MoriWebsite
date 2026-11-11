import { createArticleReferenceResolver } from "./article-references.js";
import { getSourceLocale, resolveArticleVersion } from "./article-versions.js";

const RELATED_ARTICLE_TARGET = 5;

const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().trim();
const stopWords = new Set([
  "the", "and", "for", "with", "from", "this", "that", "how", "about", "of", "to", "in", "an", "is",
  "les", "des", "une", "dans", "pour", "avec", "sur", "关于", "一种", "方式", "本站", "文章", "如何", "以及",
]);
const segmenter = new Intl.Segmenter("und", { granularity: "word" });

function textTerms(value) {
  const text = normalize(value);
  const terms = new Set();
  for (const { segment, isWordLike } of segmenter.segment(text)) {
    if (isWordLike && segment.length > 1 && !/^\p{N}+$/u.test(segment) && !stopWords.has(segment)) {
      terms.add(segment);
    }
  }
  // Han bigrams also match compounds split differently by the word segmenter.
  for (const [word] of text.matchAll(/\p{Script=Han}{2,}/gu)) {
    for (let index = 0; index < word.length - 1; index++) {
      const term = word.slice(index, index + 2);
      if (!stopWords.has(term)) terms.add(term);
    }
  }
  return terms;
}

function articleTerms(source, localized) {
  const terms = new Map();
  for (const version of [source, localized]) {
    for (const term of textTerms(version.title)) terms.set(term, 1);
    const aliases = Array.isArray(version.aliases) ? version.aliases : [version.aliases];
    for (const alias of aliases) {
      for (const term of textTerms(alias)) {
        if (!terms.has(term)) terms.set(term, 0.65);
      }
    }
  }
  return terms;
}

function tagPaths(article) {
  const tags = Array.isArray(article.tags) ? article.tags : [];
  return [...new Set(tags.map((tag) => String(tag).split("/").map(normalize).filter(Boolean).join("/")).filter(Boolean))]
    .map((tag) => tag.split("/"));
}

function sharedTagDepth(left, right) {
  let depth = 0;
  for (const a of left) {
    for (const b of right) {
      let common = 0;
      while (common < Math.min(a.length, b.length) && a[common] === b[common]) common++;
      depth = Math.max(depth, common);
    }
  }
  return depth;
}

function similarity(left, right, frequency, count) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  let matches = 0;
  const weight = (term) => 1 + Math.log((count + 1) / ((frequency.get(term) || 0) + 1));
  for (const [term, value] of left) {
    const weighted = value * weight(term);
    leftNorm += weighted ** 2;
    if (right.has(term)) {
      dot += weighted * right.get(term) * weight(term);
      matches++;
    }
  }
  for (const [term, value] of right) rightNorm += (value * weight(term)) ** 2;
  return { score: leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0, matches };
}

export function getRelatedArticles(current, articles = [], content = "") {
  if (!current?.id) return [];
  const unique = new Map(articles.filter((article) => article?.id && article.public !== false)
    .map((article) => [String(article.id), article]));
  const locale = current.lang || getSourceLocale(current);
  const indexed = [...unique.values()].map((source) => {
    const article = resolveArticleVersion(source, locale);
    return { source, article, terms: articleTerms(source, article), tags: tagPaths(source) };
  });
  const own = indexed.find(({ article }) => String(article.id) === String(current.id));
  if (!own) return [];
  const frequencies = new Map();
  for (const entry of indexed) {
    for (const term of entry.terms.keys()) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }
  const resolveReferences = createArticleReferenceResolver([...unique.values()]);
  const references = new Set(resolveReferences(content, current));
  return indexed.filter((entry) => entry !== own).map((entry) => {
    const text = similarity(own.terms, entry.terms, frequencies, indexed.length);
    const tagDepth = sharedTagDepth(own.tags, entry.tags);
    const mentioned = references.has(String(entry.article.id));
    const backlink = [entry.source, entry.article].some((version) => {
      const targets = Array.isArray(version.references)
        ? version.references
        : resolveReferences(version.content, version);
      return targets.includes(String(current.id));
    });
    const tier = mentioned ? (backlink ? 0 : 1) : backlink ? 2 : tagDepth >= 2 ? 3 : tagDepth ? 4 : 5;
    return { ...entry, text, tier };
  }).filter(({ tier, text }) => tier < 5 || (text.score >= 0.24 && text.matches >= 2))
    .sort((a, b) => a.tier - b.tier ||
      (Date.parse(b.article.date) || 0) - (Date.parse(a.article.date) || 0) ||
      String(a.article.id).localeCompare(String(b.article.id), "en"))
    .filter(({ tier }, index) => tier <= 2 || index < RELATED_ARTICLE_TARGET)
    .map(({ article, tier }) => ({
      ...article,
      relatedReason: tier === 0 ? "mutual" : tier === 1 ? "mentioned" : tier === 2 ? "backlink" : tier === 5 ? "similar" : "tag",
    }));
}
