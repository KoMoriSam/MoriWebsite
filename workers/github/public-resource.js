import { deleteGithubCache, readGithubCache, writeGithubCache } from "./cache.js";
import { createGithubClient, githubErrorHeaders } from "./client.js";

const FRESH_MS = 12 * 60 * 60 * 1000;
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
export const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

function jsonResponse(body, status, corsHeaders, cacheHeader, extra = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Expose-Headers": `ETag, Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset, ${cacheHeader}`,
      ...extra,
    },
  });
}

function serveResource(request, entry, respond, { cacheField, cacheHeader }, state) {
  const etag = entry.publicEtag;
  const matches = request.headers.get("If-None-Match")?.split(",").some((value) =>
    value.trim() === "*" || value.trim().replace(/^W\//, "") === etag.replace(/^W\//, ""),
  );
  return respond(matches ? null : entry[cacheField], matches ? 304 : 200, {
    ETag: etag,
    "Cache-Control": `public, max-age=${state === "stale" ? 60 : 300}`,
    [cacheHeader]: state,
  });
}

export async function handleGithubResource(request, env, corsHeaders, resource) {
  const { endpoint, cachePath, cacheField, cacheHeader, invalidError, unavailableError } = resource;
  const respond = (body, status, headers) => jsonResponse(body, status, corsHeaders, cacheHeader, headers);
  if (request.method !== "GET") {
    return respond({ error: "METHOD_NOT_ALLOWED" }, 405, { Allow: "GET, OPTIONS" });
  }

  const prefix = `/github/${endpoint}/`;
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  let parts = [];
  try {
    if (pathname.startsWith(prefix)) {
      parts = pathname.slice(prefix.length).split("/").map(decodeURIComponent);
    }
  } catch { /* Invalid percent escape. */ }
  if (!resource.validate(parts)) return respond({ error: invalidError }, 400);

  const identifier = parts.join("/").toLowerCase();
  const key = new Request(new URL(cachePath + identifier, request.url));
  const saved = await readGithubCache(key);
  if (saved?.missingUntil > Date.now()) return respond({ error: unavailableError, reason: "api" }, 404);

  const cached = saved?.[cacheField] && typeof saved.publicEtag === "string"
    && saved.verifiedAt + RETAIN_MS > Date.now() ? saved : null;
  if (cached && cached.refreshAt > Date.now()) {
    return serveResource(request, cached, respond, resource,
      Date.now() - cached.verifiedAt < FRESH_MS ? "hit" : "stale");
  }

  try {
    const github = createGithubClient(request, env);
    const { data, notModified, etag = "" } = await resource.load(github, identifier, cached?.upstreamEtag);
    let entry;
    if (notModified && cached) {
      entry = { ...cached, upstreamEtag: etag || cached.upstreamEtag };
    } else {
      const projected = resource.project(data);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(projected)));
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      entry = { [cacheField]: projected, upstreamEtag: etag, publicEtag: `W/"${hash}"` };
    }
    entry.verifiedAt = Date.now();
    entry.refreshAt = entry.verifiedAt + FRESH_MS;
    await writeGithubCache(key, entry, entry.verifiedAt + RETAIN_MS);
    return serveResource(request, entry, respond, resource, cached ? "revalidated" : "miss");
  } catch (error) {
    const retryAt = error.retryAt || Date.now() + 60000;
    if (cached && error.status !== 404) {
      await writeGithubCache(key, { ...cached, refreshAt: retryAt }, cached.verifiedAt + RETAIN_MS);
      return serveResource(request, cached, respond, resource, "stale");
    }
    if (error.status === 404) {
      if (cached) await deleteGithubCache(key);
      if (resource.missingTtl) {
        const missingUntil = Date.now() + resource.missingTtl;
        await writeGithubCache(key, { missingUntil }, missingUntil);
      }
    }
    return respond({
      error: unavailableError,
      reason: error.name === "AbortError" ? "timeout"
        : error.reason === "configuration" ? "api" : error.reason || "api",
    }, error.status === 401 ? 502 : error.status || 502, githubErrorHeaders(error));
  }
}
