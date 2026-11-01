const FRESH_MS = 12 * 60 * 60 * 1000;
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
const USERNAME = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const CACHE_PATH = "/__cache/github-profile/v1/";

async function readCache(key) {
  try {
    return await (await caches.default.match(key))?.json() || null;
  } catch {
    return null;
  }
}

async function writeCache(key, value, expiresAt) {
  const ttl = Math.ceil((expiresAt - Date.now()) / 1000);
  if (ttl <= 0) return;
  try {
    await caches.default.put(key, new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    }));
  } catch {
    console.warn("github-profile-cache-write-failed");
  }
}

function jsonResponse(body, status, corsHeaders, extra = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Expose-Headers": "ETag, Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset, X-Profile-Cache",
      ...extra,
    },
  });
}

function serveProfile(request, entry, corsHeaders, state) {
  const etag = entry.publicEtag;
  const matches = request.headers.get("If-None-Match")?.split(",").some((value) =>
    value.trim() === "*" || value.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""),
  );
  return jsonResponse(matches ? null : entry.profile, matches ? 304 : 200, corsHeaders, {
    ETag: etag,
    "Cache-Control": `public, max-age=${state === "stale" ? 60 : 300}`,
    "X-Profile-Cache": state,
  });
}

function upstreamFailure(response) {
  const now = Date.now();
  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
  const retry = response.headers.get("retry-after");
  const retryAt = retry
    ? /^\d+$/.test(retry) ? now + Number(retry) * 1000 : Date.parse(retry)
    : 0;
  const limited = response.status === 429 || remaining === "0" || Boolean(retry);
  const error = new Error("GitHub public profile request failed");
  error.reason = limited ? "rate-limit" : response.status === 403 ? "forbidden" : "api";
  error.status = limited ? 429 : [403, 404].includes(response.status) ? response.status : 502;
  error.retryAt = Math.max(now + 60000,
    Number.isFinite(retryAt) ? retryAt : 0,
    remaining === "0" && Number.isFinite(reset) ? reset : 0);
  return error;
}

export async function handleGithubProfile(request, env, corsHeaders = {}) {
  if (request.method !== "GET") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, corsHeaders, { Allow: "GET, OPTIONS" });
  }
  let username;
  try {
    username = decodeURIComponent(new URL(request.url).pathname.replace(/\/+$/, "").slice("/github/users/".length));
  } catch {
    username = "";
  }
  if (!USERNAME.test(username)) {
    return jsonResponse({ error: "INVALID_GITHUB_USERNAME" }, 400, corsHeaders);
  }
  username = username.toLowerCase();
  const key = new Request(new URL(`${CACHE_PATH}${username}`, request.url));
  const cooldownKey = new Request(new URL(`${CACHE_PATH}_cooldown`, request.url));
  const saved = await readCache(key);
  const cached = saved?.profile && typeof saved.publicEtag === "string"
    && saved.verifiedAt + RETAIN_MS > Date.now() ? saved : null;
  if (cached && cached.refreshAt > Date.now()) {
    return serveProfile(request, cached, corsHeaders,
      Date.now() - cached.verifiedAt < FRESH_MS ? "hit" : "stale");
  }

  try {
    if (!env.GITHUB_TOKEN) {
      const error = new Error("GitHub public profile service is not configured");
      error.status = 503;
      error.reason = "api";
      throw error;
    }
    const cooldown = await readCache(cooldownKey);
    if (cooldown?.retryAt > Date.now()) {
      const error = new Error("GitHub public profile service is rate limited");
      Object.assign(error, { status: 429, reason: "rate-limit", retryAt: cooldown.retryAt });
      throw error;
    }
    const headers = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "MoriWebsite-PublicProfile/1.0",
      "X-GitHub-Api-Version": "2026-03-10",
    };
    if (cached?.upstreamEtag) headers["If-None-Match"] = cached.upstreamEtag;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let entry;
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers, signal: controller.signal,
      });
      if (response.status === 304 && cached) {
        entry = { ...cached, upstreamEtag: response.headers.get("etag") || cached.upstreamEtag };
      } else {
        if (!response.ok) throw upstreamFailure(response);
        const data = await response.json();
        if (!data || typeof data.login !== "string" || !USERNAME.test(data.login) || !Object.hasOwn(data, "name")) {
          throw new Error("Invalid GitHub public profile response");
        }
        // Whitelist public presentation fields. Never retain the upstream body.
        const profile = {
          login: data.login,
          name: typeof data.name === "string" ? data.name.trim() || data.login : data.login,
          avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : "",
        };
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(profile)));
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        entry = { profile, upstreamEtag: response.headers.get("etag") || "", publicEtag: `W/"${hash}"` };
      }
    } finally {
      clearTimeout(timeout);
    }
    entry.verifiedAt = Date.now();
    entry.refreshAt = entry.verifiedAt + FRESH_MS;
    await writeCache(key, entry, entry.verifiedAt + RETAIN_MS);
    return serveProfile(request, entry, corsHeaders, cached ? "revalidated" : "miss");
  } catch (error) {
    const retryAt = error.retryAt || Date.now() + 60000;
    if (error.reason === "rate-limit") {
      await writeCache(cooldownKey, { retryAt }, retryAt);
    }
    if (cached && error.status !== 404) {
      await writeCache(key, { ...cached, refreshAt: retryAt }, cached.verifiedAt + RETAIN_MS);
      return serveProfile(request, cached, corsHeaders, "stale");
    }
    if (cached && error.status === 404) {
      try { await caches.default.delete(key); } catch { /* Cache is best effort. */ }
    }
    return jsonResponse({
      error: "GITHUB_PROFILE_UNAVAILABLE",
      reason: error.name === "AbortError" ? "timeout" : error.reason || "api",
    }, error.status || 502, corsHeaders, {
      "Retry-After": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))),
      ...(error.reason === "rate-limit" ? {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(retryAt / 1000)),
      } : {}),
    });
  }
}
