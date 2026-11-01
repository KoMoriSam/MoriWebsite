import assert from "node:assert/strict";
import { handleGithubProfile } from "../../workers/auth/github-profile.js";

const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;
const originalNow = Date.now;
const entries = new Map();
let now = originalNow();
let calls = 0;
let upstream;
const env = { GITHUB_TOKEN: "test-server-token" };
const cors = { "Access-Control-Allow-Origin": "https://komori.cc" };
const request = (username = "KoMoriSam", headers = {}) => new Request(
  `https://api.komori.cc/github/users/${username}`, { headers },
);
const lookup = (username, headers, bindings = env, responseCors = cors) =>
  handleGithubProfile(request(username, headers), bindings, responseCors);
const githubResponse = (body, status = 200, headers = {}) => new Response(
  body === null ? null : JSON.stringify(body), { status, headers },
);
const profile = {
  login: "KoMoriSam", name: "KoMori", avatar_url: "https://avatars.githubusercontent.com/u/58881688?v=4",
  email: "must-not-be-retained@example.com", private_gists: 10,
};

try {
  Date.now = () => now;
  globalThis.caches = { default: {
    async match(key) {
      const entry = entries.get(key.url);
      return entry && entry.expiresAt > now ? entry.response.clone() : undefined;
    },
    async put(key, response) {
      const ttl = Number(response.headers.get("cache-control").match(/max-age=(\d+)/)[1]);
      entries.set(key.url, { response: response.clone(), expiresAt: now + ttl * 1000 });
    },
    async delete(key) { return entries.delete(key.url); },
  } };
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(url, /^https:\/\/api\.github\.com\/users\/[a-z\d-]+$/);
    assert.equal(options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    assert.ok(options.headers["User-Agent"]);
    assert.ok(options.signal);
    return upstream(options);
  };

  upstream = () => githubResponse(profile, 200, { ETag: '"github-v1"' });
  let response = await lookup();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Profile-Cache"), "miss");
  const publicEtag = response.headers.get("ETag");
  assert.ok(publicEtag.startsWith('W/"'));
  assert.notEqual(publicEtag, '"github-v1"');
  assert.deepEqual(await response.json(), {
    login: "KoMoriSam", name: "KoMori", avatarUrl: profile.avatar_url,
  });
  assert.equal(calls, 1);
  for (const { response: cached } of entries.values()) {
    const body = await cached.clone().text();
    assert.ok(!body.includes(profile.email));
    assert.ok(!body.includes("private_gists"));
    assert.ok(!body.includes(env.GITHUB_TOKEN));
  }

  response = await lookup("komorisam", {}, env, { "Access-Control-Allow-Origin": "https://other.example" });
  assert.equal(response.headers.get("X-Profile-Cache"), "hit");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://other.example");
  assert.equal(calls, 1, "username case and response origins must not fragment the profile cache");
  response = await lookup("KOMORISAM", { "If-None-Match": publicEtag });
  assert.equal(response.status, 304);
  assert.equal(await response.text(), "");
  assert.equal(calls, 1);

  now += 12 * 60 * 60 * 1000 + 1;
  upstream = (options) => {
    assert.equal(options.headers["If-None-Match"], '"github-v1"');
    return githubResponse(null, 304, { ETag: '"github-v1"' });
  };
  response = await lookup();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Profile-Cache"), "revalidated");
  assert.equal(response.headers.get("ETag"), publicEtag);
  assert.equal((await response.json()).name, "KoMori");
  assert.equal(calls, 2);
  await lookup();
  assert.equal(calls, 2, "304 must renew the freshness period");

  now += 12 * 60 * 60 * 1000 + 1;
  upstream = () => githubResponse({ ...profile, name: "Updated name" }, 200, { ETag: '"github-v2"' });
  response = await lookup();
  assert.equal((await response.json()).name, "Updated name");
  assert.notEqual(response.headers.get("ETag"), publicEtag);

  now += 12 * 60 * 60 * 1000 + 1;
  upstream = () => githubResponse({ message: "API rate limit exceeded" }, 403, {
    "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.ceil(now / 1000) + 3600),
  });
  response = await lookup();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Profile-Cache"), "stale");
  assert.equal((await response.json()).name, "Updated name");
  const limitedCalls = calls;
  await lookup();
  assert.equal(calls, limitedCalls, "stale requests must respect the retry time");
  response = await lookup("another-user");
  assert.equal(response.status, 429);
  assert.equal((await response.json()).reason, "rate-limit");
  assert.ok(Number(response.headers.get("Retry-After")) >= 3599);
  assert.equal(calls, limitedCalls, "upstream cooldown must also protect cache misses");

  now += 3601 * 1000;
  upstream = () => githubResponse(null, 304);
  response = await lookup();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Profile-Cache"), "revalidated");

  const beforeValidation = calls;
  response = await lookup("missing-token", {}, {});
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes(env.GITHUB_TOKEN));
  for (const name of ["", "a_b", "-test", "a".repeat(40), "a%2Fb", "%E0%A4%A"]) {
    assert.equal((await lookup(name)).status, 400);
  }
  assert.equal(calls, beforeValidation);
  response = await handleGithubProfile(new Request(request().url, { method: "POST" }), env, cors);
  assert.equal(response.status, 405);

  now += 12 * 60 * 60 * 1000 + 1;
  upstream = () => { throw new TypeError("fetch failed"); };
  response = await lookup();
  assert.equal(response.headers.get("X-Profile-Cache"), "stale");
  now += 61000;
  upstream = () => githubResponse({ message: "Not Found" }, 404);
  response = await lookup();
  assert.equal(response.status, 404);
  assert.equal(entries.has("https://api.komori.cc/__cache/github-profile/v1/komorisam"), false);

  console.log("检查通过：GitHub 资料读取、缓存与请求失败后的恢复。");
} finally {
  globalThis.fetch = originalFetch;
  globalThis.caches = originalCaches;
  Date.now = originalNow;
}
