import { decrypt, encrypt } from "./crypto.js";
import { createGithubClient } from "../github/client.js";

const provider = "github";

export async function exchange(env, params) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      ...params,
    }),
  });
  if (response.status >= 300 && response.status < 400) {
    throw Object.assign(new Error("Unexpected GitHub OAuth token redirect"), { status: 502 });
  }
  const data = await response.json();
  if (!response.ok || !data.access_token || !data.refresh_token ||
      !Number.isFinite(data.expires_in) || !Number.isFinite(data.refresh_token_expires_in)) {
    throw Object.assign(new Error("GitHub authorization failed"), {
      rejected: ["bad_refresh_token", "expired_token", "incorrect_client_credentials"].includes(data.error),
    });
  }
  return data;
}

export async function credentials(env, userId, data) {
  const now = Date.now();
  return [
    await encrypt(env.TOKEN_ENCRYPTION_KEY, userId, { access: data.access_token, refresh: data.refresh_token }),
    now + data.expires_in * 1000,
    now + data.refresh_token_expires_in * 1000,
    crypto.randomUUID(),
  ];
}

export function githubClient(token) {
  return createGithubClient(new Request("https://auth.komori.cc"), { GITHUB_TOKEN: token }, { account: token });
}

async function getAccess(env, userId) {
  const db = env.AUTH_DB;
  const now = Date.now();
  const current = await db.prepare(
    "SELECT * FROM oauth_credentials WHERE user_id = ? AND provider = ?",
  ).bind(userId, provider).first();
  if (!current || current.refresh_expires <= now) return null;
  if (current.access_expires > now + 60_000) {
    const { access } = await decrypt(env.TOKEN_ENCRYPTION_KEY, userId, current.encrypted);
    return { access, generation: current.generation };
  }

  const lock = await db.prepare(`
    UPDATE oauth_credentials SET refresh_lock_until = ?
    WHERE user_id = ? AND provider = ? AND generation = ? AND refresh_lock_until <= ?
    RETURNING generation
  `).bind(now + 30_000, userId, provider, current.generation, now).first();
  if (!lock) throw Object.assign(new Error("GitHub credentials are refreshing"), { status: 503, retryAt: now + 2000 });
  try {
    const { refresh } = await decrypt(env.TOKEN_ENCRYPTION_KEY, userId, current.encrypted);
    const next = await exchange(env, { grant_type: "refresh_token", refresh_token: refresh });
    const [encrypted, accessExpires, refreshExpires, generation] = await credentials(env, userId, next);
    const saved = await db.prepare(`
      UPDATE oauth_credentials SET encrypted = ?, access_expires = ?, refresh_expires = ?,
        generation = ?, refresh_lock_until = 0
      WHERE user_id = ? AND provider = ? AND generation = ?
      RETURNING generation
    `).bind(encrypted, accessExpires, refreshExpires, generation, userId, provider, current.generation).first();
    if (!saved) throw Object.assign(new Error("GitHub credentials changed"), { status: 503 });
    return { access: next.access_token, generation };
  } catch (error) {
    if (!error.rejected) throw error;
    await revokeCredentials(env, userId, current.generation);
    return null;
  }
}

async function revokeCredentials(env, userId, generation) {
  await env.AUTH_DB.prepare(
    "DELETE FROM oauth_credentials WHERE user_id = ? AND provider = ? AND generation = ?",
  ).bind(userId, provider, generation).run();
}

export async function userGraphql(env, userId, query, variables) {
  try {
    const credential = await getAccess(env, userId);
    if (!credential) return { status: 409, error: "GITHUB_REAUTHORIZE" };
    try {
      return { data: await githubClient(credential.access).graphql(query, variables) };
    } catch (error) {
      if (error.status !== 401) throw error;
      await revokeCredentials(env, userId, credential.generation);
      return { status: 409, error: "GITHUB_REAUTHORIZE" };
    }
  } catch (error) {
    return { status: error.status || 502, retryAt: error.retryAt || null };
  }
}
