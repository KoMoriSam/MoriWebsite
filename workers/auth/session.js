import { hash, randomToken } from "./crypto.js";
import { opaque, returnPath } from "./http.js";

export const SESSION_SECONDS = 30 * 86400;
export const GRANT_SECONDS = 60;

export async function findSession(env, token, audience = "website") {
  if (!opaque(token)) return null;
  return env.AUTH_DB.prepare(`
    SELECT s.family, s.expires_at, u.id, u.name, u.avatar_url AS avatarUrl,
      u.can_read_novel AS canReadNovel, i.login
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN identities i ON i.user_id = u.id AND i.provider = 'github'
    WHERE s.hash = ? AND s.audience = ? AND s.revoked_at IS NULL
      AND s.expires_at > ? AND u.status = 'active'
  `).bind(await hash(token), audience, Date.now()).first();
}

export function profile(session) {
  return {
    id: session.id, login: session.login, name: session.name,
    avatarUrl: session.avatarUrl, expiresAt: session.expires_at,
  };
}

export async function revokeFamily(env, session) {
  if (!session) return;
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare("UPDATE sessions SET revoked_at = ? WHERE family = ? AND revoked_at IS NULL")
      .bind(Date.now(), session.family),
    env.AUTH_DB.prepare("DELETE FROM login_grants WHERE family = ?").bind(session.family),
  ]);
}

export async function issueGrant(env, family, transaction, challenge, target) {
  const token = randomToken();
  await env.AUTH_DB.prepare(`
    INSERT INTO login_grants (hash, transaction_hash, website_challenge, family, return_to, audience, expires_at)
    VALUES (?, ?, ?, ?, ?, 'website', ?)
  `).bind(await hash(token), transaction, challenge, family, returnPath(target), Date.now() + GRANT_SECONDS * 1000).run();
  return token;
}

export async function redeemGrant(env, grant, browser, device, previous) {
  if (!opaque(grant) || !opaque(browser)) return null;
  const db = env.AUTH_DB;
  const now = Date.now();
  const match = await db.prepare(`
    DELETE FROM login_grants
    WHERE hash = ? AND website_challenge = ? AND audience = 'website' AND expires_at > ?
    RETURNING family, return_to
  `).bind(await hash(grant), await hash(browser), now).first();
  if (!match) return null;

  const token = randomToken();
  const result = await db.prepare(`
    INSERT INTO sessions (hash, user_id, family, audience, device, created_at, expires_at)
    SELECT ?, s.user_id, s.family, 'website', ?, ?, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.family = ? AND s.audience = 'auth' AND s.revoked_at IS NULL
      AND s.expires_at > ? AND u.status = 'active'
    RETURNING expires_at
  `).bind(await hash(token), String(device || "").slice(0, 200), now, match.family, now).first();
  if (!result) return null;

  const old = await findSession(env, previous);
  if (old && old.family !== match.family) await revokeFamily(env, old);
  else if (old) {
    await db.prepare("UPDATE sessions SET revoked_at = ? WHERE hash = ?")
      .bind(now, await hash(previous)).run();
  }
  return { token, returnTo: match.return_to, maxAge: Math.floor((result.expires_at - now) / 1000) };
}
