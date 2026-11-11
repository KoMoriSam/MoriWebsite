import { createPrivateKey, sign } from "node:crypto";
import { createGithubClient } from "./client.js";

const tokens = new Map();

export async function discussionGithub(env, repository, permission = "read") {
  const id = env.GITHUB_APP_ID;
  const installation = env.GITHUB_INSTALLATION_ID;
  const cacheKey = `${id}:${installation}:${repository}:${permission}`;
  const saved = tokens.get(cacheKey);
  if (saved?.expires > Date.now() + 60_000) return client(saved.token);
  if (!/^\d+$/.test(id || "") || !/^\d+$/.test(installation || "") || !env.GITHUB_APP_PRIVATE_KEY) {
    throw Object.assign(new Error("GitHub App installation is unavailable"), { status: 503 });
  }
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 60, exp: now + 480, iss: id })}`;
  const key = createPrivateKey(env.GITHUB_APP_PRIVATE_KEY.replaceAll("\\n", "\n"));
  const jwt = unsigned + "." + sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url");
  const response = await fetch(`https://api.github.com/app/installations/${installation}/access_tokens`, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/vnd.github+json", Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json", "User-Agent": "MoriWebsite-GitHub/1.0",
    },
    body: JSON.stringify({ repositories: [repository.split("/")[1]], permissions: { discussions: permission } }),
  });
  if (response.status >= 300 && response.status < 400) {
    throw Object.assign(new Error("Unexpected GitHub installation token redirect"), { status: 502 });
  }
  const data = await response.json();
  if (!response.ok || !data.token) throw Object.assign(new Error("GitHub App installation authorization failed"), {
    status: response.status === 429 || response.headers.has("Retry-After") ? 429 : 503,
  });
  tokens.set(cacheKey, { token: data.token, expires: Date.parse(data.expires_at) });
  return client(data.token);

  function client(token) {
    return createGithubClient(new Request("https://api.komori.cc"), { GITHUB_TOKEN: token }, { account: cacheKey });
  }
}
