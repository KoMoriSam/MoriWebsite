import auth from "../auth/index.js";
import { hash, randomToken } from "../auth/crypto.js";
import { COOKIE, json, opaque, redirect, returnPath, sessionCookie } from "../auth/http.js";
import { issueGrant } from "../auth/session.js";

export { SiteAuth, CommentAuth } from "../auth/index.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.origin !== env.MORI_SITE_ORIGIN || url.hostname !== "localhost" ||
        url.protocol !== "http:" || request.method !== "GET") return json({}, 404);
    if (url.pathname === "/logout") return auth.fetch(request, env);
    if (request.headers.get("Sec-Fetch-Site") === "cross-site") return json({}, 403);
    if (url.pathname !== "/login/github") return json({}, 404);
    const account = url.searchParams.get("fixture") || "reader";
    const challenge = url.searchParams.get("challenge");
    if (!["reader", "restricted", "expired", "revoked"].includes(account) || !opaque(challenge))
      return json({ error: "INVALID_LOGIN" }, 400);
    const now = Date.now();
    const token = randomToken();
    const family = crypto.randomUUID();
    const id = `local-${account}`;
    const db = env.AUTH_DB;
    const invalid = account === "expired" || account === "revoked";
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO users (id, name, avatar_url, can_read_novel, created_at) VALUES (?, ?, '', ?, ?)")
        .bind(id, `Local ${account}`, Number(account !== "restricted"), now),
      db.prepare("INSERT INTO sessions (hash, user_id, family, audience, device, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, 'local', ?, ?, ?)")
        .bind(await hash(token), id, family, invalid ? "website" : "auth", now,
          now + (account === "expired" ? -1 : 3600_000), account === "revoked" ? now : null),
    ]);
    const target = returnPath(url.searchParams.get("return"));
    if (invalid)
      return redirect(new URL(target, url.origin).href, [
        sessionCookie(COOKIE.flow), sessionCookie(COOKIE.site, token, 3600),
      ]);
    const grant = await issueGrant(env, family, randomToken(), challenge, target);
    return redirect(`${url.origin}/auth/complete?grant=${grant}`, [sessionCookie(COOKIE.center, token, 3600)]);
  },
};
