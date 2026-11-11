import { WorkerEntrypoint } from "cloudflare:workers";
import { AUTH, SITE, COOKIE, json, opaque, readCookie, redirect, returnPath, sessionCookie } from "./http.js";
import { credentials, exchange, githubClient, userGraphql } from "./github.js";
import { hash, randomToken } from "./crypto.js";
import { findSession, issueGrant, profile, redeemGrant, revokeFamily, SESSION_SECONDS } from "./session.js";

const callback = AUTH + "/callback/github";
const transactionSeconds = 600;
const failLogin = () => redirect(SITE + "/?auth_error=github", [sessionCookie(COOKIE.oauth)]);
const grantRedirect = (grant, cookies) =>
  redirect(`${SITE}/auth/complete?grant=${grant}`, cookies);

async function login(request, env, url) {
  if (env.AUTH_START_LIMIT && !(await env.AUTH_START_LIMIT.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" })).success) {
    return json({ error: "AUTH_RATE_LIMITED" }, 429, { "Retry-After": "60" });
  }
  const challenge = url.searchParams.get("challenge");
  if (!opaque(challenge)) return json({ error: "INVALID_LOGIN" }, 400);
  const target = returnPath(url.searchParams.get("return"));
  const central = await findSession(env, readCookie(request, COOKIE.center), "auth");
  if (central && url.searchParams.get("reauthorize") !== "1") {
    return grantRedirect(await issueGrant(env, central.family, randomToken(), challenge, target));
  }
  const state = randomToken();
  const verifier = randomToken();
  const browser = randomToken();
  await env.AUTH_DB.prepare(`
    INSERT INTO oauth_transactions
      (state_hash, browser_hash, website_challenge, return_to, verifier, audience, expires_at)
    VALUES (?, ?, ?, ?, ?, 'website', ?)
  `).bind(await hash(state), await hash(browser), challenge, target, verifier,
    Date.now() + transactionSeconds * 1000).run();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: callback,
    state,
    code_challenge: await hash(verifier),
    code_challenge_method: "S256",
  });
  return redirect(authorize.href, [sessionCookie(COOKIE.oauth, browser, transactionSeconds)]);
}

async function complete(request, env, url) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const browser = readCookie(request, COOKIE.oauth);
  if (!opaque(state) || !browser) return failLogin();
  const db = env.AUTH_DB;
  const stateHash = await hash(state);
  const transaction = await db.prepare(`
    DELETE FROM oauth_transactions WHERE state_hash = ? AND browser_hash = ?
      AND audience = 'website' AND expires_at > ?
    RETURNING verifier, website_challenge, return_to
  `).bind(stateHash, await hash(browser), Date.now()).first();
  if (!transaction) return failLogin();
  const target = new URL(transaction.return_to, SITE);
  target.searchParams.set("auth_error", "github");
  const fail = () => redirect(target.href, [sessionCookie(COOKIE.oauth)]);
  if (!code || code.length > 256 || url.searchParams.has("error")) return fail();

  try {
    const access = await exchange(env, { code, redirect_uri: callback, code_verifier: transaction.verifier });
    const { data: user } = await githubClient(access.access_token).rest("/user");
    if (!Number.isSafeInteger(user.id) || !user.login) return fail();
    const userId = crypto.randomUUID();
    const name = String(user.name || user.login).slice(0, 160);
    const avatar = new URL(user.avatar_url);
    if (avatar.protocol !== "https:" || avatar.hostname !== "avatars.githubusercontent.com") return fail();
    const now = Date.now();
    const identityId = String(user.id);
    const [, , identity] = await db.batch([
      db.prepare(`
        INSERT INTO users (id, name, avatar_url, created_at)
        SELECT ?, ?, ?, ? WHERE NOT EXISTS (
          SELECT 1 FROM identities WHERE provider = 'github' AND provider_user_id = ?
        )
      `).bind(userId, name, avatar.href, now, identityId),
      db.prepare(`
        INSERT INTO identities (provider, provider_user_id, user_id, login)
        SELECT 'github', ?, id, ? FROM users WHERE id = ?
        ON CONFLICT (provider, provider_user_id) DO NOTHING
      `).bind(identityId, user.login, userId),
      db.prepare("SELECT user_id FROM identities WHERE provider = 'github' AND provider_user_id = ?").bind(identityId),
    ]);
    const id = identity.results[0].user_id;
    const encrypted = await credentials(env, id, access);
    const token = randomToken();
    const family = crypto.randomUUID();
    const old = await findSession(env, readCookie(request, COOKIE.center), "auth");
    const [, , session] = await db.batch([
      db.prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?").bind(name, avatar.href, id),
      db.prepare("UPDATE identities SET login = ? WHERE provider = 'github' AND user_id = ?").bind(user.login, id),
      db.prepare(`
        INSERT INTO sessions (hash, user_id, family, audience, device, created_at, expires_at)
        SELECT ?, id, ?, 'auth', ?, ?, ? FROM users WHERE id = ? AND status = 'active'
        RETURNING hash
      `).bind(await hash(token), family, request.headers.get("User-Agent")?.slice(0, 200) || "",
        now, now + SESSION_SECONDS * 1000, id),
      db.prepare(`
        INSERT INTO oauth_credentials (user_id, provider, encrypted, access_expires, refresh_expires, generation)
        SELECT id, 'github', ?, ?, ?, ? FROM users WHERE id = ? AND status = 'active'
        ON CONFLICT (user_id, provider) DO UPDATE SET encrypted = excluded.encrypted,
          access_expires = excluded.access_expires, refresh_expires = excluded.refresh_expires,
          generation = excluded.generation, refresh_lock_until = 0
      `).bind(...encrypted, id),
    ]);
    if (!session.results.length) return fail();
    await revokeFamily(env, old);
    const grant = await issueGrant(env, family, stateHash, transaction.website_challenge, transaction.return_to);
    return grantRedirect(grant, [
      sessionCookie(COOKIE.center, token, SESSION_SECONDS), sessionCookie(COOKIE.oauth),
    ]);
  } catch {
    return fail();
  }
}

export class SiteAuth extends WorkerEntrypoint {
  async verify(token) {
    const session = await findSession(this.env, token);
    return session && { profile: profile(session), canReadNovel: Boolean(session.canReadNovel) };
  }

  redeem(grant, browser, device, previous) {
    return redeemGrant(this.env, grant, browser, device, previous);
  }

  async logout(token) {
    if (!opaque(token)) return;
    const session = await this.env.AUTH_DB.prepare(
      "SELECT family FROM sessions WHERE hash = ? AND audience = 'website'",
    ).bind(await hash(token)).first();
    await revokeFamily(this.env, session);
  }
}

export class CommentAuth extends WorkerEntrypoint {
  async user(token) {
    const session = await findSession(this.env, token);
    return session && profile(session);
  }

  async graphql(token, query, variables) {
    const session = await findSession(this.env, token);
    if (!session) return { status: 401 };
    return userGraphql(this.env, session.id, query, variables);
  }

  async claim(token, requestId, target, owner) {
    const session = await findSession(this.env, token);
    if (!session) return 401;
    const db = this.env.AUTH_DB;
    const now = Date.now();
    const lock = await db.prepare(`
      INSERT INTO comment_locks (target, owner, expires_at) VALUES (?, ?, ?)
      ON CONFLICT (target) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
        WHERE comment_locks.expires_at <= ?
      RETURNING owner
    `).bind(target, owner, now + 180_000, now).first();
    if (!lock) return 429;
    const claimed = await db.prepare(`
      INSERT INTO comment_requests (user_id, id, created_at)
      SELECT ?, ?, ? WHERE (
        SELECT count(*) FROM comment_requests WHERE user_id = ? AND created_at > ?
      ) < 12
      ON CONFLICT DO NOTHING RETURNING id
    `).bind(session.id, requestId, now, session.id, now - 60_000).first();
    if (claimed) return 200;
    await this.release(target, owner);
    const prior = await db.prepare("SELECT id FROM comment_requests WHERE user_id = ? AND id = ?")
      .bind(session.id, requestId).first();
    return prior ? 409 : 429;
  }

  async release(target, owner) {
    await this.env.AUTH_DB.prepare("DELETE FROM comment_locks WHERE target = ? AND owner = ?").bind(target, owner).run();
  }

  async discussion(target) {
    const link = await this.env.AUTH_DB.prepare("SELECT discussion_id FROM discussion_links WHERE target = ?").bind(target).first();
    return link?.discussion_id || null;
  }

  async remember(target, id) {
    await this.env.AUTH_DB.prepare(`
      INSERT INTO discussion_links (target, discussion_id) VALUES (?, ?)
      ON CONFLICT (target) DO UPDATE SET discussion_id = excluded.discussion_id
    `).bind(target, id).run();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.origin !== AUTH || request.method !== "GET") return json({ error: "NOT_FOUND" }, 404);
    try {
      if (url.pathname === "/login/github") return await login(request, env, url);
      if (url.pathname === "/callback/github") return await complete(request, env, url);
      if (url.pathname === "/logout") {
        const current = await findSession(env, readCookie(request, COOKIE.center), "auth");
        return redirect(new URL(returnPath(url.searchParams.get("return")), SITE).href, current ? [] : [sessionCookie(COOKIE.center)]);
      }
      if (url.pathname === "/") return redirect(SITE + "/auth/login");
      return json({ error: "NOT_FOUND" }, 404);
    } catch {
      return json({ error: "AUTH_UNAVAILABLE" }, 503);
    }
  },
  async scheduled(_event, env) {
    const db = env.AUTH_DB;
    const now = Date.now();
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
      db.prepare("DELETE FROM oauth_transactions WHERE expires_at <= ?").bind(now),
      db.prepare("DELETE FROM login_grants WHERE expires_at <= ?").bind(now),
      db.prepare("DELETE FROM comment_requests WHERE created_at <= ?").bind(now - 86400_000),
      db.prepare("DELETE FROM comment_locks WHERE expires_at <= ?").bind(now),
    ]);
  },
};
