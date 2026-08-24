import { computed, reactive } from "vue";
import { defineStore } from "pinia";

import {
  fetchContentCommentTotalsBatch,
  hasParagraphCountsApi,
} from "@/services/api-paragraph-comments";

const COMMENT_COUNTS_BATCH_SIZE = 50;

const normalizeContents = (contents = []) => {
  const normalized = [];
  const seen = new Set();

  for (const content of contents) {
    const contentId = String(content?.contentId || "").trim();
    const discussionTerm = String(content?.discussionTerm || "").trim();
    if (!contentId || !discussionTerm || seen.has(contentId)) continue;

    seen.add(contentId);
    normalized.push({ contentId, discussionTerm });
  }

  return normalized;
};

const normalizeContentIds = (contentIds = []) => [
  ...new Set(
    contentIds.map((contentId) => String(contentId || "").trim()).filter(Boolean),
  ),
];

const getCountKey = (sourceType, contentId) => `${sourceType}:${contentId}`;

export const useCommentCountsStore = defineStore("commentCounts", () => {
  const counts = reactive({});
  const statuses = reactive({});
  const requests = new Map();
  const commentCountsAvailable = computed(() => hasParagraphCountsApi);

  const loadContentCommentTotals = async (sourceType, contents = []) => {
    if (!hasParagraphCountsApi || typeof window === "undefined") return null;

    const type = sourceType === "novel" ? "novel" : "article";
    const normalizedContents = normalizeContents(contents);
    if (normalizedContents.length === 0) return [];

    const pendingContents = normalizedContents.filter(({ contentId }) => {
      const key = getCountKey(type, contentId);
      return statuses[key] !== "ready" && statuses[key] !== "loading";
    });
    if (pendingContents.length === 0) return [];

    const chunks = [];
    for (
      let index = 0;
      index < pendingContents.length;
      index += COMMENT_COUNTS_BATCH_SIZE
    ) {
      chunks.push(
        pendingContents.slice(index, index + COMMENT_COUNTS_BATCH_SIZE),
      );
    }

    for (const { contentId } of pendingContents) {
      statuses[getCountKey(type, contentId)] = "loading";
    }

    const results = [];
    for (const chunk of chunks) {
      const requestKey = `${type}:${chunk
        .map(({ contentId }) => contentId)
        .join("\u001f")}`;
      let request = requests.get(requestKey);

      if (!request) {
        request = fetchContentCommentTotalsBatch({
          sourceType: type,
          contents: chunk,
        })
          .then((payload) => {
            if (!payload) return null;

            for (const { contentId } of chunk) {
              const key = getCountKey(type, contentId);
              counts[key] = Number(payload[contentId] ?? 0);
              statuses[key] = "ready";
            }
            return payload;
          })
          .catch((error) => {
            for (const { contentId } of chunk) {
              statuses[getCountKey(type, contentId)] = "error";
            }
            console.warn("读取内容评论统计失败：", error);
            return null;
          })
          .finally(() => {
            requests.delete(requestKey);
          });

        requests.set(requestKey, request);
      }

      results.push(await request);
    }

    return results;
  };

  const getContentCommentTotal = (sourceType, contentId) => {
    const id = String(contentId || "").trim();
    if (!id) return null;

    const key = getCountKey(sourceType, id);
    return Number.isFinite(counts[key]) ? counts[key] : null;
  };

  const getContentCommentStatus = (sourceType, contentId) => {
    const id = String(contentId || "").trim();
    return id ? statuses[getCountKey(sourceType, id)] || "idle" : "disabled";
  };

  const getContentCollectionStatus = (sourceType, contentIds = []) => {
    const ids = normalizeContentIds(contentIds);
    if (ids.length === 0) return "ready";

    const collectionStatuses = ids.map((contentId) =>
      getContentCommentStatus(sourceType, contentId),
    );
    if (collectionStatuses.some((status) => status === "error")) return "error";
    if (collectionStatuses.every((status) => status === "ready")) return "ready";
    return "loading";
  };

  const getContentCollectionTotal = (sourceType, contentIds = []) => {
    const ids = normalizeContentIds(contentIds);
    if (getContentCollectionStatus(sourceType, ids) !== "ready") {
      return null;
    }

    return ids.reduce(
      (total, contentId) =>
        total + (getContentCommentTotal(sourceType, contentId) ?? 0),
      0,
    );
  };

  return {
    commentCountsAvailable,
    loadContentCommentTotals,
    getContentCommentTotal,
    getContentCommentStatus,
    getContentCollectionStatus,
    getContentCollectionTotal,
  };
});
