const NOTICE_AFTER_DAYS = Object.freeze({
  technical: 180,
  reference: 365,
  evergreen: null,
});

// Reviewed by content rather than broad tags; IDs keep translations consistent.
const REVIEWED_ARTICLE_TYPES = Object.freeze({
  "2026-11-04": "technical", // SSG incremental build implementation
  "2026-09-25": "reference", // Sinhala legacy encoding explanation
  "2026-09-09": "evergreen", // Poetry essay
  "2026-08-26": "evergreen", // Summer development retrospective
  "2026-08-23": "technical", // Reader 2.0 implementation
  "2026-08-11": "technical", // Web pagination implementation
  "2026-07-26": "technical", // SPA to SSG implementation
  "2026-06-25": "reference", // Blog introduction and site information
  "2025-09-09": "evergreen", // Poetry essay
  "2024-07-07": "evergreen", // Sri Lankan colonial history reading notes
  "2024-04-24": "evergreen", // Historical Sino-Sri Lankan exchange reading notes
  "2023-12-04": "evergreen", // Personal essay
  "2023-11-30": "evergreen", // Personal account
  "2023-09-07": "evergreen", // Personal account
  "2020-10-03": "evergreen", // Personal account
});

const EVERGREEN_TAGS = new Set([
  "随笔", "诗词", "赏析", "文学", "历史", "日记", "回忆", "个人经历",
  "essay", "poetry", "literature", "history", "journal", "memoir",
]);
const TECHNICAL_TAGS = new Set([
  "开发", "编程", "技术", "教程", "软件", "工具", "配置",
  "development", "programming", "technical", "tutorial", "software", "tools", "configuration",
]);

export function getArticleTimelinessDays(article = {}) {
  // Authors can classify future articles explicitly in frontmatter.
  const explicitType = article.type ?? article.timelinessType ??
    article.frontmatter?.type ?? article.frontmatter?.timelinessType;
  if (Object.hasOwn(NOTICE_AFTER_DAYS, explicitType)) {
    return NOTICE_AFTER_DAYS[explicitType];
  }
  if (Object.hasOwn(REVIEWED_ARTICLE_TYPES, article.id)) {
    return NOTICE_AFTER_DAYS[REVIEWED_ARTICLE_TYPES[article.id]];
  }
  const tags = (Array.isArray(article.tags) ? article.tags : [])
    .flatMap((tag) => String(tag).normalize("NFKC").toLowerCase().split("/").map((part) => part.trim()));
  if (tags.some((tag) => EVERGREEN_TAGS.has(tag))) return NOTICE_AFTER_DAYS.evergreen;
  if (tags.some((tag) => TECHNICAL_TAGS.has(tag))) return NOTICE_AFTER_DAYS.technical;
  return NOTICE_AFTER_DAYS.reference;
}
