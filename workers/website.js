import { discussionRegistry, discussionTarget } from "../shared/discussions.js";
import { AUTH, SITE, COOKIE, json, privateHeaders, readCookie, redirect, returnPath, sessionCookie } from "./auth/http.js";
import { hash, randomToken } from "./auth/crypto.js";
import { serveNovel } from "./novel.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (/^\/(?:pagefind-novel|archive\/article)(?:\/|$)/i.test(path)) return json({ error: "NOT_FOUND" }, 404);
    if (!/^\/(?:api|auth)(?:\/|$)/.test(path)) return env.ASSETS.fetch(request);
    if (url.origin !== SITE) return json({ error: "NOT_FOUND" }, 404);
    const token = readCookie(request, COOKIE.site);
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("Origin") !== SITE) {
      return json({ error: "INVALID_ORIGIN" }, 403);
    }
    try {
      if (path === "/auth/login" && request.method === "GET") {
        const flow = randomToken();
        const target = new URL("/login/github", AUTH);
        target.search = new URLSearchParams({ challenge: await hash(flow), return: returnPath(url.searchParams.get("return")) });
        if (url.searchParams.get("reauthorize") === "1") target.searchParams.set("reauthorize", "1");
        return redirect(target.href, [sessionCookie(COOKIE.flow, flow, 660)]);
      }
      if (path === "/auth/complete" && request.method === "GET") {
        const result = await env.MORI_AUTH.redeem(url.searchParams.get("grant"),
          readCookie(request, COOKIE.flow), request.headers.get("User-Agent"), token);
        const cookies = [sessionCookie(COOKIE.flow)];
        if (result) cookies.push(sessionCookie(COOKIE.site, result.token, result.maxAge));
        return redirect(new URL(result ? returnPath(result.returnTo) : "/?auth_error=github", SITE).href, cookies);
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
        return Response.json({ logoutUrl: AUTH + "/logout" }, { headers: flowClear });
      }
      if (path.startsWith("/api/novel/") && ["GET", "HEAD"].includes(request.method)) {
        const session = await env.MORI_AUTH.verify(token);
        if (!session) return json({ error: "LOGIN_REQUIRED" }, 401);
        if (!session.canReadNovel) return json({ error: "READING_FORBIDDEN" }, 403);
        return await serveNovel(request, env, path.slice("/api/novel/".length));
      }
      if (path === "/api/comments" && ["GET", "POST"].includes(request.method)) {
        const index = await env.ASSETS.fetch(new Request(`${SITE}/${discussionRegistry}`));
        if (!index.ok) return json({ error: "COMMENTS_UNAVAILABLE" }, 503);
        const target = discussionTarget(await index.json(), url.searchParams.get("scope"), url.searchParams.get("target"));
        if (!target) return json({ error: "DISCUSSION_NOT_FOUND" }, 404);
        const result = await env.COMMENTS.handle(request, token, target);
        return json(result.body, result.status, result.headers);
      }
      return json({ error: "NOT_FOUND" }, 404);
    } catch {
      return json({ error: "SERVICE_UNAVAILABLE" }, 503);
    }
  },
};
