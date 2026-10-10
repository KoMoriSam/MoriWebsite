export function createArticleMetadata(entries = []) {
  return entries.map((entry) => {
    const { content, body, markdown, ...article } = entry.article || {};
    return { id: entry.id, path: entry.path, article };
  });
}

const pagePath = (value) => String(value || "").replace(/\/+$/, "") || "/";

// Only the matching entry page may restore build-time data. Never put another
// page's snapshot on a reused route record or shared store.
export function restorePageData(data, route) {
  if (!data || typeof data.path !== "string" || pagePath(data.path) !== pagePath(route.path)) return null;
  let payload;
  if (route.meta?.article) {
    if (route.meta.article.id == null) return null;
    const id = String(route.meta.article.id);
    if (String(data.article?.id) !== id || typeof data.article?.content !== "string") return null;
    payload = { article: { id, content: data.article.content } };
  } else if (route.name === "changelog" && Array.isArray(data.changelog?.items)) {
    payload = { changelog: data.changelog };
  } else if (["novel", "novel-reader"].includes(route.name) && data.novelChapters && typeof data.novelChapters === "object") {
    payload = { novelChapters: data.novelChapters };
  } else {
    return null;
  }
  return structuredClone({ path: route.path, ...payload });
}

export function createPageData(snapshot, route) {
  let payload;
  if (route.meta?.article) {
    const entry = snapshot.articles?.find((entry) => pagePath(entry.path) === pagePath(route.path) && String(entry.article?.id) === String(route.meta.article.id));
    if (!entry || typeof entry.content !== "string") throw new Error(`Missing SSG article content: ${route.path}`);
    payload = { article: { id: entry.article.id, content: entry.content } };
  } else if (route.name === "changelog") {
    payload = { changelog: snapshot.changelog };
  } else if (["novel", "novel-reader"].includes(route.name)) {
    payload = { novelChapters: snapshot.novelChapters };
  } else {
    return null;
  }
  return restorePageData({ path: route.path, ...payload }, route);
}

export function installPageData(router, initialState, { snapshot, isServer }) {
  let initialNavigation = true;
  router.beforeResolve((to) => {
    const pageData = isServer
      ? createPageData(snapshot, to)
      : initialNavigation ? restorePageData(initialState.pageData, to) : null;
    to.meta.pageData = pageData;
    if (isServer) {
      if (pageData) initialState.pageData = pageData;
      else delete initialState.pageData;
    }
  });
  router.afterEach((to, from, failure) => {
    if (!failure) initialNavigation = false;
  });
}
