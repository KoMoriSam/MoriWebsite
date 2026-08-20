import CONFIG from "@/constants/config";

const { GISCUS } = CONFIG;
const { paragraphCountsApi } = GISCUS;

const normalizeEndpoint = (value = "") => String(value || "").trim();

const ENDPOINT = normalizeEndpoint(paragraphCountsApi.endpoint);
const TIMEOUT = Number(paragraphCountsApi.timeout || 8000);

export const hasParagraphCountsApi = Boolean(ENDPOINT);

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
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body(ids)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`段评批量接口请求失败：${response.status}`);
    }

    const payload = await response.json();
    const counts = payload?.counts;

    if (!counts || typeof counts !== "object") {
      return {};
    }

    const normalized = {};
    ids.forEach((id) => {
      const count = Number(counts[id] ?? 0);
      normalized[id] = Number.isFinite(count) ? Math.max(0, count) : 0;
    });

    return normalized;
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
  discussionTerms = [],
}) {
  return fetchCountsBatch({
    identifiers: discussionTerms,
    body: (terms) => ({
      sourceType,
      scope: "chapter",
      discussionTerms: terms,
    }),
  });
}
