import { fetchGithubDiscussionCounts, hasGithubDiscussionCountsApi } from "./api-github.js";

const TIMEOUT = 8000;
export const hasParagraphCountsApi = hasGithubDiscussionCountsApi;

async function fetchCountsBatch({ body, identifiers = [] }) {
  if (!hasParagraphCountsApi) {
    return null;
  }

  const ids = [...new Set((identifiers || []).filter(Boolean))];
  if (!ids.length) {
    return {};
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT);

  try {
    const response = await fetchGithubDiscussionCounts(body(ids), controller.signal);

    if (!response.ok) {
      throw new Error(`评论批量接口请求失败：${response.status}`);
    }

    const payload = await response.json();
    const counts = payload?.counts;

    if (!counts || typeof counts !== "object") {
      return {};
    }

    return Object.fromEntries(ids.map((id) => {
      const count = Number(Object.hasOwn(counts, id) ? counts[id] : 0);
      return [id, Number.isFinite(count) ? Math.max(0, count) : 0];
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchParagraphCountsBatch({
  sourceType = "article",
  paragraphIds = [],
}) {
  return fetchCountsBatch({
    identifiers: paragraphIds,
    body: (ids) => ({ sourceType, paragraphIds: ids }),
  });
}

export function fetchDiscussionCountsBatch({
  sourceType = "novel",
  scope = sourceType === "novel" ? "chapter" : "content",
  discussionTerms = [],
}) {
  return fetchCountsBatch({
    identifiers: discussionTerms,
    body: (terms) => ({
      sourceType,
      scope,
      discussionTerms: terms,
    }),
  });
}

export function fetchContentCommentTotalsBatch({
  sourceType = "article",
  contents = [],
}) {
  const contentById = new Map();
  for (const content of contents) {
    const contentId = String(content?.contentId || "").trim();
    const discussionTerm = String(content?.discussionTerm || "").trim();
    if (!contentId || !discussionTerm || contentById.has(contentId)) continue;
    contentById.set(contentId, { contentId, discussionTerm });
  }

  return fetchCountsBatch({
    identifiers: [...contentById.keys()],
    body: (contentIds) => ({
      sourceType,
      scope: "content-total",
      contents: contentIds.map((contentId) => contentById.get(contentId)),
    }),
  });
}
