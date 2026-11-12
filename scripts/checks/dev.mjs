import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const port = Number(process.env.MORI_DEV_PORT || 5173);
const origin = `http://localhost:${port}`;
const fetchLocal = (path, options) => {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin);
  return fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000), ...options });
};

async function signIn(fixture) {
  const cookies = new Map();
  let path = "/auth/login?fixture=" + fixture;
  for (let index = 0; index < 4; index++) {
    const response = await fetchLocal(path, { headers: { Cookie: [...cookies.values()].join("; ") } });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";")[0];
      cookies.set(pair.split("=")[0], pair);
    }
    assert.equal(response.status, 303, "Local auth redirect");
    path = response.headers.get("Location");
    if (new URL(path, origin).pathname === "/") break;
  }
  return [...cookies.values()].join("; ");
}

const release = await fetchLocal("/site-data/novel-release.json").then((response) => response.json());
const book = `/api/novel/${release.version}`;
const chapter = Object.values(release.catalog)[0].chapters[0].path;
const path = book + "/chapters/" + chapter;
assert.equal((await fetchLocal(path)).status, 401);
for (const [account, expected] of [["reader", 200], ["restricted", 403], ["expired", 401], ["revoked", 401]]) {
  const cookie = await signIn(account);
  const session = await fetchLocal("/api/auth/session", { headers: { Cookie: cookie } });
  assert.equal(session.status, expected === 401 ? 401 : 200, account + " session");
  assert.equal((await fetchLocal(path, { headers: { Cookie: cookie } })).status, expected, account + " chapter");
}

const cookie = await signIn("reader");
for (const resource of ["/search/pagefind-entry.json", "/search/pagefind.js", "/assets/images/local.svg"]) {
  const response = await fetchLocal(book + resource, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200, resource);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
}
const registry = await fetchLocal("/site-data/discussion-targets.json").then((response) => response.json());
const article = Object.keys(registry.articles)[0];
const discussion = "/api/comments?scope=article&target=" + encodeURIComponent(article);
const post = (action, id) => fetchLocal(discussion, {
  method: "POST",
  headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ action, id, body: "本地联调 " + randomUUID(), requestId: randomUUID() }),
});
const posted = await post("post");
assert.equal(posted.status, 200);
const result = await posted.json();
const comment = result.discussion.comments.nodes.at(-1);
assert.equal((await post("reply", comment.id)).status, 200);
const thread = await fetchLocal(discussion).then((response) => response.json());
assert.equal(thread.discussion.comments.nodes.find(({ id }) => id === comment.id).replies.totalCount, 1);
assert.equal((await fetchLocal("/api/auth/logout", { method: "POST", headers: { Origin: origin, Cookie: cookie } })).status, 200);
assert.equal((await fetchLocal(path, { headers: { Cookie: cookie } })).status, 401);
console.log("检查通过：本地登录票据、D1 会话、评论与回复、小说 R2 与 Pagefind、权限与退出。");
