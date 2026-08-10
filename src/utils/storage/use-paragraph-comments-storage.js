const PARAGRAPH_COMMENTS = {
  article: {},
  novel: {},
};

const PARAGRAPH_COMMENTS_FETCHED = {
  article: {},
  novel: {},
};

const ensureBucket = (state, sourceType = "article") => {
  if (!state[sourceType]) {
    state[sourceType] = {};
  }

  return state[sourceType];
};

export function useParagraphCommentsStorage() {
  const ensureSourceBucket = (sourceType = "article") => {
    return ensureBucket(PARAGRAPH_COMMENTS, sourceType);
  };

  const getCount = (paragraphId, sourceType = "article") => {
    if (!paragraphId) return 0;
    const bucket = ensureSourceBucket(sourceType);
    const count = Number(bucket[paragraphId] ?? 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  };

  const hasFetched = (paragraphId, sourceType = "article") => {
    if (!paragraphId) return false;
    const bucket = ensureBucket(PARAGRAPH_COMMENTS_FETCHED, sourceType);
    return Boolean(bucket[paragraphId]);
  };

  const markFetched = (paragraphId, sourceType = "article") => {
    if (!paragraphId) return;
    const bucket = ensureBucket(PARAGRAPH_COMMENTS_FETCHED, sourceType);
    bucket[paragraphId] = true;
  };

  const setCount = (paragraphId, count, sourceType = "article") => {
    if (!paragraphId) return;
    const bucket = ensureSourceBucket(sourceType);
    const normalized = Number.isFinite(Number(count))
      ? Math.max(0, Number(count))
      : 0;
    bucket[paragraphId] = normalized;
    markFetched(paragraphId, sourceType);
  };

  return {
    PARAGRAPH_COMMENTS,
    PARAGRAPH_COMMENTS_FETCHED,
    getCount,
    setCount,
    hasFetched,
    markFetched,
  };
}
