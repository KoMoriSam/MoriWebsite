const env = import.meta.env;
const apiBase = env?.DEV ? "/api/github" : "https://api.komori.cc/github";
const endpoint = (value) => String(value).trim().replace(/\/+$/, "");
const profileApi = endpoint(env?.VITE_GITHUB_PROFILE_API || `${apiBase}/users`);
const repositoryApi = endpoint(env?.VITE_GITHUB_REPOSITORY_API || `${apiBase}/repos`);
const discussionCountsPath = "/github/discussions/counts";
const defaultDiscussionCountsApi = `${apiBase}/discussions/counts`;
const configuredDiscussionCountsApi = endpoint(env?.VITE_COMMENT_COUNTS_API ?? defaultDiscussionCountsApi);
const discussionCountsApi = !configuredDiscussionCountsApi || configuredDiscussionCountsApi.endsWith(discussionCountsPath)
  ? configuredDiscussionCountsApi
  : defaultDiscussionCountsApi;

const requestGithubApi = (url, options) => fetch(url, { credentials: "omit", ...options });

export const hasGithubDiscussionCountsApi = Boolean(discussionCountsApi);

export function fetchGithubDiscussionCounts(body, signal) {
  return requestGithubApi(discussionCountsApi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export function fetchGithubProfile(login, signal) {
  return requestGithubApi(`${profileApi}/${encodeURIComponent(login)}`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-cache",
    signal,
  });
}

const previews = new Map();
const cacheDuration = 15 * 60_000;
const retryDelay = 60_000;

export function fetchGithubRepository(repository) {
  const key = repository.toLowerCase();
  const cached = previews.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;

  const entry = { expires: Date.now() + cacheDuration };
  entry.promise = requestGithubApi(`${repositoryApi}/${key}`, {
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout?.(10000),
  })
    .then((response) => response.ok ? response.json() : null)
    .catch(() => null)
    .then((preview) => {
      if (!preview) entry.expires = Date.now() + retryDelay;
      return preview;
    });

  if (previews.size >= 100) previews.delete(previews.keys().next().value);
  previews.set(key, entry);
  return entry.promise;
}
