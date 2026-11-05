import { readGithubCache, writeGithubCache } from "./cache.js";

const API_ORIGIN = "https://api.github.com";
const TIMEOUT_MS = 8000;
const MIN_RETRY_MS = 60_000;
const COOLDOWN_PATHS = {
  rest: "/__cache/github-profile/v1/_cooldown",
  graphql: "/__cache/github-rate-limit/v1/graphql",
  secondary: "/__cache/github-rate-limit/v1/secondary",
};

function githubError(message, status, reason = "api", retryAt) {
  return Object.assign(new Error(message), { status, reason, retryAt });
}

export function githubErrorHeaders(error) {
  const retryAt = error?.retryAt || Date.now() + MIN_RETRY_MS;
  return {
    "Retry-After": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))),
    ...(error?.reason === "rate-limit" ? {
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(retryAt / 1000)),
    } : {}),
  };
}

function readRateLimit(response, payload, errors) {
  const primaryExhausted = response.headers.get("x-ratelimit-remaining") === "0";
  const retryAfter = response.headers.get("retry-after");
  const messages = [payload?.message, ...errors.map((error) => error?.message)];
  const secondary = messages.some((message) => /secondary rate limit|abuse detection/i.test(message || ""));
  const limited = primaryExhausted || secondary || response.status === 429 ||
    (response.status === 403 && Boolean(retryAfter)) ||
    errors.some((error) => error?.type === "RATE_LIMITED") ||
    messages.some((message) => /rate limit/i.test(message || ""));
  if (!limited) return null;

  const now = Date.now();
  const reset = primaryExhausted ? Number(response.headers.get("x-ratelimit-reset")) * 1000 : 0;
  const retry = /^\d+$/.test(retryAfter) ? now + Number(retryAfter) * 1000 : Date.parse(retryAfter);
  return {
    shared: secondary || !primaryExhausted,
    retryAt: Math.max(now + MIN_RETRY_MS, Number.isFinite(reset) ? reset : 0, Number.isFinite(retry) ? retry : 0),
  };
}

async function fetchGithub(path, options) {
  let url = new URL(path, API_ORIGIN);
  for (let redirect = 0; redirect < 3; redirect++) {
    if (url.origin !== API_ORIGIN || url.username || url.password) {
      throw new Error("Invalid GitHub API URL");
    }
    const response = await fetch(url.href, { ...options, redirect: "manual" });
    const location = response.headers.get("location");
    if (options.method !== "GET" || !location ||
        ![301, 302, 303, 307, 308].includes(response.status)) return response;

    await response.body?.cancel();
    url = new URL(location, url);
  }
  throw new Error("Too many GitHub API redirects");
}

export function createGithubClient(request, env) {
  const cooldownKey = (scope) => new Request(new URL(COOLDOWN_PATHS[scope], request.url));

  async function send(protocol, path, { method, headers, body }) {
    if (!env.GITHUB_TOKEN) {
      throw githubError("缺少 GITHUB_TOKEN", 503, "configuration");
    }

    const [primary, secondary] = await Promise.all([
      readGithubCache(cooldownKey(protocol)),
      readGithubCache(cooldownKey("secondary")),
    ]);
    const retryAt = Math.max(primary?.retryAt || 0, secondary?.retryAt || 0);
    if (retryAt > Date.now()) {
      throw githubError("GitHub API 请求受限", 429, "rate-limit", retryAt);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchGithub(path, {
        method, body, signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MoriWebsite-GitHub/1.0",
          ...headers,
        },
      });
      const etag = response.headers.get("etag") || "";
      if (protocol === "rest" && response.status === 304) return { notModified: true, etag };

      const payload = response.ok ? await response.json()
        : response.status === 403 ? await response.json().catch(() => null) : null;
      const errors = protocol === "graphql" && Array.isArray(payload?.errors) ? payload.errors : [];
      if (response.ok && !errors.length && (protocol === "rest" || payload?.data)) {
        return { data: protocol === "rest" ? payload : payload.data, etag };
      }

      const rateLimit = readRateLimit(response, payload, errors);
      if (rateLimit) {
        const { retryAt, shared } = rateLimit;
        await writeGithubCache(cooldownKey(shared ? "secondary" : protocol), { retryAt }, retryAt);
        throw githubError("GitHub API 请求受限", 429, "rate-limit", retryAt);
      }
      const forbidden = response.status === 403 || errors.some((error) => error?.type === "FORBIDDEN");
      const missing = response.status === 404 || errors.some((error) => error?.type === "NOT_FOUND");
      const status = forbidden ? 403 : missing ? 404 : response.status === 401 ? 401 : 502;
      throw githubError(`GitHub API 请求失败（${status}）`, status, forbidden ? "forbidden" : "api");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    rest(path, etag) {
      return send("rest", path, {
        method: "GET",
        headers: {
          "X-GitHub-Api-Version": "2026-03-10",
          ...(etag ? { "If-None-Match": etag } : {}),
        },
      });
    },
    async graphql(query, variables) {
      const { data } = await send("graphql", "/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      return data;
    },
  };
}
