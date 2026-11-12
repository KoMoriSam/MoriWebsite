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
const thread = async (session = cookie) => fetchLocal(discussion + "&sort=newest", {
  headers: { Cookie: session },
}).then((response) => response.json());
const write = (action, fields = {}, session = cookie) => fetchLocal(discussion, {
  method: "POST", headers: { Origin: origin, Cookie: session, "Content-Type": "application/json" },
  body: JSON.stringify({ action, requestId: randomUUID(), ...fields }),
});
const counts = async () => {
  const response = await fetchLocal("/api/github/discussions/counts", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ sourceType: "article", scope: "content-total", contents: [{ contentId: article, discussionTerm: article }] }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).counts[article];
};
const initialCount = await counts();
const body = "本地联调 " + randomUUID();
assert.equal((await write("post", { body }, "")).status, 401);
const posted = await write("post", { body });
assert.equal(posted.status, 200);
const comment = (await thread()).discussion.comments.nodes.find((node) => node.body === body);
assert.equal(comment.viewerCanUpdate, true);
const { id } = comment;
assert.equal((await write("edit", { id, body }, await signIn("restricted"))).status, 403);
assert.equal((await write("edit", { id, body: body + " 编辑" })).status, 200);
assert.equal((await write("reply", { id, body })).status, 200);
assert.equal((await write("add", { id, reaction: "HEART" })).status, 200);
const updated = (await thread()).discussion.comments.nodes.find((node) => node.id === id);
assert.equal(updated.body, body + " 编辑");
assert.equal(updated.replies.totalCount, 1);
assert.equal(updated.reactionGroups.find(({ content }) => content === "HEART").viewerHasReacted, true);
assert.equal(await counts(), initialCount + 2);
assert.equal((await write("remove", { id, reaction: "HEART" })).status, 200);
assert.equal((await write("delete", { id })).status, 200);
assert.equal(await counts(), initialCount);
for (const endpoint of ["announcements", "changelog"]) {
  const response = await fetchLocal("/api/" + endpoint);
  assert.equal(response.status, 200, endpoint);
  const data = await response.json();
  assert.equal(data.schemaVersion, 1, endpoint);
  assert.ok(Array.isArray(data.items), endpoint);
}
assert.equal((await fetchLocal("/api/auth/logout", { method: "POST", headers: { Origin: origin, Cookie: cookie } })).status, 200);
assert.equal((await fetchLocal(path, { headers: { Cookie: cookie } })).status, 401);
console.log("检查通过：本地登录、评论读写与计数、公告和更新日志、小说权限与退出。");
