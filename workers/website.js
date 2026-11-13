import { testAuthPrefix, testCallback, testOrigin } from "../shared/test-preview.js";
import { discussionRegistry, discussionTarget } from "../shared/discussions.js";
import { AUTH, SITE, COOKIE, json, privateHeaders, readCookie, redirect, returnPath, sessionCookie } from "./auth/http.js";
import { hash, randomToken } from "./auth/crypto.js";
import { serveNovel } from "./novel.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const siteOrigin = env.MORI_SITE_ORIGIN || SITE;
    const authOrigin = env.MORI_AUTH_ORIGIN || AUTH;
    const testPreview = env.MORI_ENV === "staging" && siteOrigin === testOrigin && env.TEST_AUTH;
    const override = request.headers.get("Cloudflare-Workers-Version-Overrides");
    const preview = url.origin !== siteOrigin || override !== null;
    if (/^\/(?:pagefind-novel|archive\/article)(?:\/|$)/i.test(path)) return json({ error: "NOT_FOUND" }, 404);
    const publicContent = /^\/content(?:\/|$)/.test(path);
    if (publicContent && !["GET", "HEAD"].includes(request.method))
      return json({ error: "NOT_FOUND" }, 404);
    if (!/^\/(?:api|auth)(?:\/|$)/.test(path)) {
      const response = await env.ASSETS.fetch(request);
      if (!publicContent && !preview && env.MORI_ENV !== "staging") return response;
      const headers = new Headers(response.headers);
      if (publicContent) {
        // Public attachments now share the site's origin. A direct navigation must not execute them as site code.
        headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
        headers.set("X-Content-Type-Options", "nosniff");
      }
      if (preview || env.MORI_ENV === "staging") headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(response.body, { status: response.status, headers });
    }
    if (path === "/api/version" && request.method === "GET") {
      const version = env.WEBSITE_VERSION?.id;
      if (version && (!preview || url.origin !== siteOrigin || override === `website="${version}"`))
        return json({ version });
    }
    if (preview) return json({ error: "NOT_FOUND" }, 404);
    const token = readCookie(request, COOKIE.site);
    if (env.PUBLIC_API && /^\/api\/(?:github|games|analytics|announcements|changelog|random-hero)(?:\/|$)/.test(path)) {
      url.pathname = path.slice(4);
      return env.PUBLIC_API.fetch(new Request(url, request));
    }
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("Origin") !== siteOrigin) {
      return json({ error: "INVALID_ORIGIN" }, 403);
    }
    try {
      if (testPreview && request.method === "GET" && [
        testAuthPrefix + "/start", testCallback, testAuthPrefix + "/logout",
      ].includes(path)) return await env.TEST_AUTH.fetch(request);
      if (path === "/auth/login" && request.method === "GET") {
        const flow = randomToken();
        const target = testPreview
          ? new URL(testAuthPrefix + "/start", siteOrigin)
          : new URL(env.LOCAL_AUTH ? "/auth/local/login" : "/login/github", authOrigin);
        target.search = new URLSearchParams({ challenge: await hash(flow), return: returnPath(url.searchParams.get("return")) });
        if (env.LOCAL_AUTH && url.searchParams.has("fixture")) target.searchParams.set("fixture", url.searchParams.get("fixture"));
        if (url.searchParams.get("reauthorize") === "1") target.searchParams.set("reauthorize", "1");
        return redirect(target.href, [sessionCookie(COOKIE.flow, flow, 660)]);
      }
      if (path === "/auth/complete" && request.method === "GET") {
        const result = await env.MORI_AUTH.redeem(url.searchParams.get("grant"),
          readCookie(request, COOKIE.flow), request.headers.get("User-Agent"), token);
        const cookies = [sessionCookie(COOKIE.flow)];
        if (result) cookies.push(sessionCookie(COOKIE.site, result.token, result.maxAge));
        return redirect(new URL(result ? returnPath(result.returnTo) : "/?auth_error=grant", siteOrigin).href, cookies);
      }
      if (path === "/api/auth/session" && request.method === "GET") {
        const session = await env.MORI_AUTH.verify(token);
        if (session) return json(session);
        return json({ profile: null }, token ? 401 : 200);
      }
      if (path === "/api/auth/logout" && request.method === "POST") {
        await env.MORI_AUTH.logout(token);
        const flowClear = new Headers(privateHeaders);
        flowClear.append("Set-Cookie", sessionCookie(COOKIE.site));
        flowClear.append("Set-Cookie", sessionCookie(COOKIE.flow));
        const logoutUrl = testPreview
          ? siteOrigin + testAuthPrefix + "/logout"
          : authOrigin + (env.LOCAL_AUTH ? "/auth/local/logout" : "/logout");
        return Response.json({ logoutUrl }, { headers: flowClear });
      }
      if (path.startsWith("/api/novel/") && ["GET", "HEAD"].includes(request.method)) {
        const session = await env.MORI_AUTH.verify(token);
        if (!session) return json({ error: "LOGIN_REQUIRED" }, 401);
        if (!session.canReadNovel) return json({ error: "READING_FORBIDDEN" }, 403);
        return await serveNovel(request, env, path.slice("/api/novel/".length));
      }
      if (path === "/api/comments" && ["GET", "POST"].includes(request.method)) {
        const index = await env.ASSETS.fetch(new Request(`${siteOrigin}/${discussionRegistry}`));
        if (!index.ok) return json({ error: "COMMENTS_UNAVAILABLE" }, 503);
        const target = discussionTarget(await index.json(), url.searchParams.get("scope"), url.searchParams.get("target"), env);
        if (!target) return json({ error: "DISCUSSION_NOT_FOUND" }, 404);
        const result = await env.COMMENTS.handle(request, token, target);
        return json(result.body, result.status, result.headers);
      }
      return json({ error: "NOT_FOUND" }, 404);
    } catch {
      const requestId = crypto.randomUUID();
      console.error(JSON.stringify({ event: "website_request_failed", requestId, route: path.startsWith("/auth/") ? "auth" : "api" }));
      if (path === "/auth/complete" || path === "/auth/login")
        return redirect(new URL(`/?auth_error=unavailable&auth_request=${requestId}`, siteOrigin).href);
      return json({ error: "SERVICE_UNAVAILABLE", requestId }, 503);
    }
  },
};
