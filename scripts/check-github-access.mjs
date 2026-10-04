import assert from "node:assert/strict";
import { createServer } from "vite";
import path from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createGithubSession } from "../src/composables/auth/useGithubSession.js";
import { searchPagefindBundle } from "../src/services/search-access.js";

const storage = () => ({
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  },
});
const listeners = new Map();
const local = storage();
const savedReturn = storage();
let widget = {
  id: "github-profile-probe",
  __session: "first",
  iframeRef: { contentWindow: {} },
};
globalThis.document = { querySelectorAll: () => [widget] };
globalThis.window = {
  localStorage: local,
  sessionStorage: savedReturn,
  location: {
    href: "https://komori.cc/novel/volume/chapter?c=123456&giscus=first#paragraph-2",
    assign(value) {
      this.assigned = value;
    },
  },
  history: {
    replaceState(_, __, url) {
      window.location.href = url;
    },
  },
  addEventListener(type, fn, capture) {
    if (type === "message") assert.equal(capture, true);
    listeners.set(type, fn);
  },
  removeEventListener(type) {
    listeners.delete(type);
  },
  setInterval() {
    return 1;
  },
  clearInterval() {},
  setTimeout,
  clearTimeout,
};
globalThis.localStorage = local;
globalThis.sessionStorage = savedReturn;
let profileResponse = {
  name: "Actual GitHub Name",
  avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
  email: "never@example.com",
};
let pendingProfile;
let profileCalls = 0;
globalThis.fetch = async () => {
  profileCalls++;
  if (pendingProfile) return pendingProfile;
  return { ok: true, json: async () => profileResponse };
};
const tick = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const emitViewer = (login) =>
  listeners.get("message")({
    origin: "https://giscus.app",
    source: widget.iframeRef.contentWindow,
    data: { giscus: { viewer: { login } } },
  });
savedReturn.setItem(
  "mori:github:return",
  "https://komori.cc/novel/volume/chapter?c=123456#paragraph-original",
);
const auth = createGithubSession();
const stop = auth.start({
  replace(url) {
    assert.ok(url.endsWith("#paragraph-original"));
  },
});
assert.equal(auth.state.authenticated, false);
assert.equal(new URL(window.location.href).searchParams.has("giscus"), false);
emitViewer("account");
await tick();
assert.equal(auth.state.profile.name, "Actual GitHub Name");
assert.equal(auth.state.profile.email, "never@example.com");
auth.login();
assert.equal(
  new URL(window.location.assigned).searchParams.get("redirect_uri"),
  window.location.href,
);
auth.logout();
assert.equal(auth.state.profile, null);
assert.equal(auth.state.authenticated, false);
assert.equal(local.getItem("mori:github:profile"), null);

local.setItem("giscus-session", JSON.stringify("second"));
listeners.get("storage")();
widget.__session = "second";
profileResponse = { name: null, avatar_url: null };
emitViewer("fallback-account");
await tick();
assert.equal(auth.state.profile.name, "fallback-account");
assert.equal(auth.state.profile.avatarUrl, "");
assert.equal(auth.state.profile.email, "");
let resolveProfile;
pendingProfile = new Promise((resolve) => {
  resolveProfile = resolve;
});
auth.retry();
emitViewer("fallback-account");
auth.logout();
resolveProfile({ ok: true, json: async () => ({ name: "Old account" }) });
await tick();
assert.equal(auth.state.profile, null);
pendingProfile = null;
local.setItem("giscus-session", JSON.stringify("third"));
listeners.get("storage")();
widget.__session = "third";
emitViewer("third-account");
await tick();
listeners.get("message")({
  origin: "https://giscus.app",
  source: {},
  data: { giscus: { signOut: true } },
});
assert.equal(auth.state.authenticated, true, "unrelated frame cannot sign out");
listeners.get("message")({
  origin: "https://giscus.app",
  source: widget.iframeRef.contentWindow,
  data: { giscus: { error: "Bad credentials" } },
});
assert.equal(auth.state.authenticated, false);
stop();
// 取消授权也回到原段落；公开资料接口失败保持游客资料并允许重试。
window.location.href =
  "https://komori.cc/novel/volume/chapter#github-login-fallback";
savedReturn.setItem(
  "mori:github:return",
  "https://komori.cc/novel/volume/chapter#original-position",
);
const canceled = createGithubSession();
const stopCanceled = canceled.start({
  replace(url) {
    assert.ok(url.endsWith("#original-position"));
  },
});
assert.equal(canceled.state.authenticated, false);
stopCanceled();
const failing = createGithubSession();
local.setItem("giscus-session", JSON.stringify("profile-failure"));
widget.__session = "profile-failure";
const stopFailing = failing.start({ replace() {} });
globalThis.fetch = async () => ({ ok: false });
emitViewer("unavailable");
await tick();
assert.equal(failing.state.profile, null);
assert.equal(failing.state.error, "profile");
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ name: "Recovered", avatar_url: "" }),
});
failing.retry();
assert.equal(
  failing.state.authenticated,
  false,
  "retry must revalidate the session",
);
emitViewer("unavailable");
await tick();
assert.equal(failing.state.profile.name, "Recovered");
failing.logout();
stopFailing();

// 临时失败不能清理凭证或永久复用失败结果；普通评论也能确认同一会话。
local.setItem("giscus-session", JSON.stringify("shared"));
widget.__session = "shared";
const recovering = createGithubSession();
const stopRecovering = recovering.start({ replace() {} });
const emitMessage = (data, source = widget.iframeRef.contentWindow) => {
  let stopped = false;
  listeners.get("message")({
    origin: "https://giscus.app",
    source,
    data: { giscus: data },
    stopImmediatePropagation() {
      stopped = true;
    },
  });
  // 模拟 giscus 3.1 仅校验 origin 的内置退出监听。
  if (
    !stopped &&
    (data.signOut ||
      /Bad credentials|Invalid state value|State has expired/.test(
        data.error || "",
      ))
  ) {
    local.removeItem("giscus-session");
    widget.__session = "";
  }
  return stopped;
};
emitMessage({ error: "Failed to fetch" });
assert.equal(recovering.state.error, "network");
assert.equal(recovering.state.status, "unknown");
assert.equal(local.getItem("giscus-session"), JSON.stringify("shared"));
const failedRevision = recovering.state.revision;
recovering.retry();
assert.ok(recovering.state.revision > failedRevision);
assert.equal(recovering.state.error, "");
recovering.probeFailed(failedRevision);
assert.equal(
  recovering.state.checking,
  true,
  "old timeout cannot fail a new check",
);
recovering.probeFailed();
assert.equal(recovering.state.error, "timeout");
emitMessage({ viewer: null });
assert.equal(recovering.state.error, "session-mismatch");
assert.equal(recovering.state.hasSession, true);
widget.id = "ordinary-comment";
emitViewer("recovered-reader");
await tick();
assert.equal(recovering.state.authenticated, true);
assert.equal(recovering.state.error, "");
assert.equal(
  emitMessage({ signOut: true }, {}),
  true,
  "unknown source must not reach widget listeners",
);
assert.equal(recovering.state.authenticated, true);
const staleWidget = {
  id: "old-comment",
  __session: "old-session",
  iframeRef: { contentWindow: {} },
};
document.querySelectorAll = () => [widget, staleWidget];
assert.equal(
  emitMessage(
    { error: "Bad credentials" },
    staleWidget.iframeRef.contentWindow,
  ),
  true,
);
assert.equal(recovering.state.authenticated, true);
assert.equal(local.getItem("giscus-session"), JSON.stringify("shared"));
document.querySelectorAll = () => [widget];
widget.id = "github-profile-probe";
const originalNow = Date.now;
Date.now = () => originalNow() + 6 * 60 * 1000;
try {
  listeners.get("focus")();
} finally {
  Date.now = originalNow;
}
assert.equal(recovering.state.authenticated, false);
assert.equal(recovering.state.checking, true);
emitMessage({ error: "403 Forbidden" });
assert.equal(recovering.state.error, "forbidden");
assert.equal(recovering.state.hasSession, true);
listeners.get("online")();
assert.equal(recovering.state.checking, true);
emitMessage({ error: "API rate limit exceeded" });
assert.equal(recovering.state.error, "rate-limit");
recovering.retry();
emitMessage({ error: "Discussion not found" });
assert.equal(recovering.state.error, "discussion");
recovering.retry();
emitMessage({ error: "Service returned 503" });
assert.equal(recovering.state.error, "api");
recovering.retry();
emitMessage({ error: "State has expired." });
assert.equal(recovering.state.status, "invalid");
assert.equal(recovering.state.error, "token-expired");
assert.equal(local.getItem("giscus-session"), null);

// 重新登录清掉旧 storage/内存，返回同一 session 字符串也强制重新确认。
local.setItem("giscus-session", JSON.stringify("shared"));
widget.__session = "shared";
listeners.get("storage")();
globalThis.fetch = async () => ({ ok: false, status: 403 });
emitViewer("recovered-reader");
await tick();
assert.equal(
  recovering.state.authenticated,
  true,
  "public profile 403 cannot invalidate giscus login",
);
assert.equal(recovering.state.errorInfo.status, 403);
assert.equal(recovering.state.errorInfo.reason, "forbidden");
for (const store of [local, savedReturn]) {
  store.setItem("mori:github:profile", '{"login":"old"}');
  store.setItem("mori:github:return", "old-return");
}
savedReturn.setItem("giscus-session", JSON.stringify("old"));
recovering.login();
assert.equal(recovering.state.authenticated, false);
assert.equal(recovering.state.profile, null);
assert.equal(local.getItem("giscus-session"), null);
assert.equal(savedReturn.getItem("giscus-session"), null);
assert.equal(local.getItem("mori:github:profile"), null);
assert.equal(savedReturn.getItem("mori:github:profile"), null);
assert.equal(local.getItem("mori:github:return"), null);
assert.equal(savedReturn.getItem("mori:github:return"), window.location.href);
stopRecovering();
const callbackUrl = new URL(window.location.href);
callbackUrl.searchParams.set("giscus", "shared");
window.location.href = callbackUrl.href;
const returnedAuth = createGithubSession();
const stopReturned = returnedAuth.start({ replace() {} });
assert.equal(returnedAuth.state.checking, true);
assert.equal(returnedAuth.state.authenticated, false);
assert.equal(returnedAuth.state.error, "");
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ name: "Fresh identity" }),
});
emitViewer("fresh-reader");
await tick();
assert.equal(returnedAuth.state.profile.name, "Fresh identity");
returnedAuth.logout();
stopReturned();

// 浏览器禁止访问 storage 的 getter 时也必须清理内存，并明确报告失败。
const savedLocalDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "localStorage",
);
Object.defineProperty(window, "localStorage", {
  configurable: true,
  get() {
    throw new Error("Storage blocked");
  },
});
try {
  const blocked = createGithubSession();
  assert.doesNotThrow(() => blocked.logout());
  assert.equal(blocked.state.authenticated, false);
  assert.equal(blocked.state.error, "storage");
  const stopBlocked = blocked.start({ replace() {} });
  assert.equal(blocked.state.status, "unknown");
  assert.equal(blocked.state.error, "storage");
  const previousRedirect = window.location.assigned;
  blocked.login();
  assert.equal(
    window.location.assigned,
    previousRedirect,
    "unremovable old credentials must not be silently reused",
  );
  stopBlocked();
} finally {
  Object.defineProperty(window, "localStorage", savedLocalDescriptor);
}

let canRead = false;
let queries = 0;
let reads = 0;
const engine = {
  async search() {
    queries++;
    return {
      results: [
        {
          data: async () => {
            reads++;
            return {};
          },
        },
      ],
    };
  },
};
assert.deepEqual(
  await searchPagefindBundle(engine, "query", {}, () => canRead),
  [],
);
assert.equal(queries, 0);
let resolveSearch;
canRead = true;
const searching = searchPagefindBundle(
  {
    search: () =>
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
  },
  "query",
  {},
  () => canRead,
);
canRead = false;
resolveSearch({
  results: [
    {
      data: () => {
        reads++;
        return {};
      },
    },
  ],
});
assert.deepEqual(await searching, []);
assert.equal(reads, 0);
canRead = true;
let resolveData;
const reading = searchPagefindBundle(
  {
    search: async () => ({
      results: [
        {
          data: () =>
            new Promise((resolve) => {
              resolveData = resolve;
            }),
        },
      ],
    }),
  },
  "query",
  {},
  () => canRead,
);
await tick();
canRead = false;
resolveData({ meta: { type: "novel" } });
assert.deepEqual(await reading, []);

// 与实际服务共用代码；无 Pagefind 的本地回退也必须拒绝未登录小说请求。
window.fetch = (...args) => globalThis.fetch(...args);
const server = await createServer({
  configFile: false,
  cacheDir: "node_modules/.cache/github-access",
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { "@": path.resolve("src") } },
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
try {
  const {
    fetchNovelSearchIndex,
    fetchGlobalSearchIndex,
    fetchNovelSearchCatalog,
  } = await server.ssrLoadModule("/src/services/search-content.js");
  let requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    throw new Error("offline");
  };
  await assert.rejects(fetchNovelSearchIndex(), /LOGIN_REQUIRED/);
  assert.equal(requests.length, 0);
  await fetchGlobalSearchIndex().catch(() => {});
  assert.equal(
    requests.some((url) => /theHorizon|\/chapters\//i.test(url)),
    false,
  );
  // 登录后目录统计无需请求正文；退出期间正在读取的正文不能进入本地缓存。
  const { useGithubSession } = await server.ssrLoadModule(
    "/src/composables/auth/useGithubSession.js",
  );
  const serviceAuth = useGithubSession();
  globalThis.window = {
    localStorage: local,
    sessionStorage: savedReturn,
    location: { href: "https://komori.cc/novel" },
    history: { replaceState() {} },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout,
    clearTimeout,
  };
  globalThis.document = { querySelectorAll: () => [widget] };
  widget.__session = "local-search";
  local.setItem("giscus-session", JSON.stringify(widget.__session));
  let contentReads = 0;
  let resolveContent;
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.github.com/users/"))
      return new Response(JSON.stringify({ name: "Search reader" }));
    if (String(url).endsWith("/index.json"))
      return new Response(
        JSON.stringify({
          first: {
            volumeInfo: { title: "Volume" },
            chapters: [
              {
                uuid: "chapter-id",
                path: "first.md",
                title: "Chapter",
                uploadDate: "2026-09-30",
              },
            ],
          },
        }),
      );
    contentReads++;
    return new Promise((resolve) => {
      resolveContent = resolve;
    });
  };
  const stopService = serviceAuth.start({ replace() {} });
  emitViewer("reader");
  await tick();
  const catalog = await fetchNovelSearchCatalog();
  assert.equal(catalog.length, 1);
  assert.equal(contentReads, 0);
  const pending = fetchNovelSearchIndex();
  for (let i = 0; i < 20 && !resolveContent; i++) await tick();
  assert.ok(resolveContent, "novel fallback started its content request");
  serviceAuth.logout();
  resolveContent(new Response("Secret text"));
  await assert.rejects(pending, /LOGIN_REQUIRED/);
  await assert.rejects(fetchNovelSearchIndex(), /LOGIN_REQUIRED/);
  stopService();
  delete globalThis.window;
  delete globalThis.document;
} finally {
  await server.close();
}
console.log(
  "GitHub access: reauthentication, cleanup, stale iframe isolation, transient errors, retry, cross-tab, profile races, Pagefind and local fallback checks passed (" +
    profileCalls +
    " initial profile requests).",
);

if (process.argv.includes("--indexes")) {
  globalThis.fetch = async (url) => {
    let file = String(url).split("?")[0];
    if (file.startsWith("/pagefind")) file = path.resolve("dist" + file);
    else if (file.startsWith("file:")) file = new URL(file);
    return new Response(readFileSync(file));
  };
  for (const bundle of ["pagefind", "pagefind-novel"]) {
    const module = await import(
      pathToFileURL(path.resolve("dist", bundle, "pagefind.js")).href
    );
    const engine = module.createInstance({
      basePath: `/${bundle}/`,
      language: "zh",
    });
    try {
      await engine.init();
      const types = Object.keys((await engine.filters()).type || {});
      assert.ok(types.length);
      assert.ok(
        types.every((type) =>
          bundle === "pagefind-novel"
            ? type === "novel"
            : ["blog", "changelog", "licenses"].includes(type),
        ),
        `${bundle}: mixed content types`,
      );
      const result = await engine.search(
        bundle === "pagefind-novel" ? "z009ad8008003" : "JavaScript",
      );
      for (const item of result.results) {
        const data = await item.data();
        assert.equal(data.meta.type === "novel", bundle === "pagefind-novel");
      }
    } finally {
      await engine.destroy();
    }
  }
  console.log("Pagefind runtime: public and novel bundles are isolated.");
}
