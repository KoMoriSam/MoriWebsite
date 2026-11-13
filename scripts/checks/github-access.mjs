import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { createIndex } from "pagefind";
import { integrationAuthPrefix, integrationCallback, integrationOrigin } from "../../shared/integration-preview.js";
import { discussionScopes, discussionTarget, legacyDiscussionQuery, bookTerm, discussionRegistry } from "../../shared/discussions.js";
import { publicCovers } from "../../shared/novel-release.js";
import { assertNovelRelease, includePublicContent, sealNovelRelease } from "../build/novel-release.mjs";
import { pruneBuildAssets } from "../build/prune-assets.mjs";
import { COOKIE, returnPath } from "../../workers/auth/http.js";
import { decrypt, hash, randomToken } from "../../workers/auth/crypto.js";
import { findSession } from "../../workers/auth/session.js";
import website from "../../workers/website.js";
import raw from "../../workers/content.js";
import { MARKDOWN_MODE_COMMENT, renderMarkdown } from "../../src/utils/markdown/render-markdown.js";

registerHooks({
  resolve(specifier, context, next) {
    return specifier === "cloudflare:workers"
      ? { url: "data:text/javascript,export class WorkerEntrypoint { constructor(ctx, env) { this.env = env } }; export class DurableObject {}", shortCircuit: true }
      : next(specifier, context);
  },
});
const { default: auth, SiteAuth, CommentAuth } = await import("../../workers/auth/index.js");
const { CommentsInternal } = await import("../../workers/api-entry.js");

function database() {
  const sqlite = new DatabaseSync(":memory:");
  return {
    sqlite,
    prepare(sql) {
      return { bind(...args) {
        const statement = sqlite.prepare(sql);
        return {
          first: async () => statement.get(...args) ?? null,
          all: async () => ({ results: statement.all(...args) }),
          run: async () => statement.run(...args),
        };
      } };
    },
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const start = "https://komori.cc";
const center = "https://auth.komori.cc";
const cookie = (response, name) => response.headers.getSetCookie().find((line) => line.startsWith(name + "="))?.split(";")[0];
const cookieToken = (header) => header.slice(header.indexOf("=") + 1);

test("Mori OAuth, credential refresh, binding authorization and logout", async () => {
  const db = database();
  db.sqlite.exec(await readFile("migrations/auth/0001_auth.sql", "utf8"));
  const secret = Buffer.alloc(32, 7).toString("base64");
  const env = { AUTH_DB: db, GITHUB_CLIENT_ID: "test-id", GITHUB_CLIENT_SECRET: "test-secret", TOKEN_ENCRYPTION_KEY: secret };
  env.MORI_AUTH = new SiteAuth(null, env);
  let pkce;
  let exchanges = 0;
  let refreshes = 0;
  let unlockRefresh;
  const waitForRefresh = new Promise((resolve) => { unlockRefresh = resolve; });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://github.com/login/oauth/access_token")) {
      if (options.body.get("grant_type") === "refresh_token") {
        refreshes++;
        assert.equal(options.body.get("refresh_token"), "mock-refresh");
        await waitForRefresh;
        return Response.json({ access_token: "refreshed-access", expires_in: 300, refresh_token: "next-refresh", refresh_token_expires_in: 12000 });
      }
      exchanges++;
      assert.equal(await hash(options.body.get("code_verifier")), pkce);
      assert.equal(options.body.get("redirect_uri"), center + "/callback/github");
      return Response.json({ access_token: "mock-access", expires_in: 120, refresh_token: "mock-refresh", refresh_token_expires_in: 10000 });
    }
    if (String(url) === "https://api.github.com/user") return Response.json({
      id: 42, login: "reader", name: "Mori Reader", avatar_url: "https://avatars.githubusercontent.com/u/42",
    });
    if (String(url) === "https://api.github.com/graphql") {
      assert.equal(options.headers.Authorization, "Bearer refreshed-access");
      return Response.json({ data: { viewer: { login: "reader" } } });
    }
    throw new Error("Unexpected fetch");
  };

  try {
    for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "/api/auth/logout", "/auth/complete", "/unknown"]) {
      assert.equal(returnPath(value), "/");
    }
    const returnTo = "/novel/chapter?c=123456#id-2";
    let response = await website.fetch(new Request(start + "/auth/login?" + new URLSearchParams({ return: returnTo })), env);
    const flow = cookie(response, COOKIE.flow);
    response = await auth.fetch(new Request(response.headers.get("Location")), env);
    const oauth = cookie(response, COOKIE.oauth);
    const github = new URL(response.headers.get("Location"));
    pkce = github.searchParams.get("code_challenge");
    assert.equal(github.searchParams.get("code_challenge_method"), "S256");
    const callback = center + "/callback/github?" + new URLSearchParams({
      state: github.searchParams.get("state"), code: "test-code",
    });
    await auth.fetch(new Request(callback, { headers: { Cookie: COOKIE.oauth + "=" + randomToken() } }), env);
    assert.equal(exchanges, 0);
    response = await auth.fetch(new Request(callback, { headers: { Cookie: oauth } }), env);
    assert.equal(exchanges, 1);
    const central = cookie(response, COOKIE.center);
    const complete = response.headers.get("Location");
    assert.match(complete, /^https:\/\/komori\.cc\/auth\/complete\?grant=/);
    await auth.fetch(new Request(callback, { headers: { Cookie: oauth } }), env);
    assert.equal(exchanges, 1);
    const wrongBrowser = await website.fetch(new Request(complete, { headers: { Cookie: COOKIE.flow + "=" + randomToken() } }), env);
    assert.equal(cookie(wrongBrowser, COOKIE.site), undefined);
    response = await website.fetch(new Request(complete, { headers: { Cookie: flow } }), env);
    const app = cookie(response, COOKIE.site);
    assert.equal(response.headers.get("Location"), start + returnTo);
    assert.match(response.headers.getSetCookie().find((line) => line.startsWith(app)), /Path=\/; Max-Age=\d+; Secure; HttpOnly; SameSite=Lax$/);
    assert.ok(!response.headers.get("Set-Cookie").includes("Domain="));
    response = await website.fetch(new Request(complete, { headers: { Cookie: flow } }), env);
    assert.equal(cookie(response, COOKIE.site), undefined);

    const token = cookieToken(app);
    const session = await findSession(env, token);
    assert.notEqual(session.id, "42");
    assert.equal(await findSession(env, cookieToken(central)), null);
    assert.equal(await findSession(env, token, "auth"), null);
    assert.equal(db.sqlite.prepare("SELECT hash FROM sessions WHERE audience='website'").get().hash, await hash(token));
    const saved = db.sqlite.prepare("SELECT encrypted FROM oauth_credentials").get().encrypted;
    assert.ok(!saved.includes("mock-access"));
    assert.deepEqual(await decrypt(secret, session.id, saved), { access: "mock-access", refresh: "mock-refresh" });
    await assert.rejects(decrypt(secret, "wrong-user", saved));

    const commentAuth = new CommentAuth(null, env);
    db.sqlite.exec("UPDATE oauth_credentials SET access_expires=0");
    const pending = commentAuth.graphql(token, "query { viewer { login } }", {});
    while (!refreshes) await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await commentAuth.graphql(token, "query { viewer { login } }", {})).status, 503);
    unlockRefresh();
    assert.equal((await pending).data.viewer.login, "reader");
    assert.equal(refreshes, 1);
    response = await website.fetch(new Request(start + "/api/auth/session", { headers: { Cookie: app } }), env);
    assert.equal((await response.json()).profile.id, session.id);

    const protectedURL = start + "/api/novel/" + "a".repeat(64) + "/chapters/book.md";
    db.sqlite.exec("UPDATE users SET can_read_novel=0");
    assert.equal((await website.fetch(new Request(protectedURL, { headers: { Cookie: app } }), env)).status, 403);
    const logoutURL = start + "/api/auth/logout";
    response = await website.fetch(new Request(logoutURL, { method: "POST", headers: { Cookie: app, Origin: center } }), env);
    assert.equal(response.status, 403);
    assert.ok(await findSession(env, token));
    response = await website.fetch(new Request(logoutURL, { method: "POST", headers: { Cookie: app, Origin: start } }), env);
    assert.equal(response.status, 200);
    assert.equal(await findSession(env, token), null);
    assert.equal(await findSession(env, cookieToken(central), "auth"), null);
    assert.equal((await website.fetch(new Request(protectedURL, { headers: { Cookie: app } }), env)).status, 401);
    response = await auth.fetch(new Request(center + "/logout", { headers: { Cookie: central } }), env);
    assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
    const broken = { MORI_AUTH: { verify() { throw new Error("auth unavailable"); } } };
    assert.equal((await website.fetch(new Request(protectedURL, { headers: { Cookie: app } }), broken)).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    db.sqlite.close();
  }
});

test("integration Preview keeps OAuth on its own origin and uses staging permissions", async () => {
  const db = database();
  db.sqlite.exec(await readFile("migrations/auth/0001_auth.sql", "utf8"));
  const authEnv = {
    AUTH_DB: db, MORI_ENV: "staging", MORI_STAGING_READER_IDS: "42",
    MORI_SITE_ORIGIN: "https://staging.komori.cc", MORI_AUTH_ORIGIN: "https://auth-staging.komori.cc",
    GITHUB_CLIENT_ID: "test-id", GITHUB_CLIENT_SECRET: "test-secret",
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  const env = {
    MORI_ENV: "staging", MORI_SITE_ORIGIN: integrationOrigin,
    INTEGRATION_AUTH: { fetch: (request) => auth.fetch(request, authEnv) },
    MORI_AUTH: new SiteAuth(null, authEnv),
  };
  const send = (path, options) => website.fetch(new Request(new URL(path, integrationOrigin), options), env);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url) === "https://api.github.com/user") return Response.json({
      id: 42, login: "reader", name: "Mori Reader", avatar_url: "https://avatars.githubusercontent.com/u/42",
    });
    assert.equal(String(url), "https://github.com/login/oauth/access_token");
    assert.equal(options.body.get("redirect_uri"), integrationOrigin + integrationCallback);
    return Response.json({ access_token: "mock-access", refresh_token: "mock-refresh", expires_in: 120, refresh_token_expires_in: 10000 });
  };
  try {
    const login = await send("/auth/login?return=/novel");
    const begin = new URL(login.headers.get("Location"));
    assert.equal(begin.origin, integrationOrigin);
    assert.equal(begin.pathname, integrationAuthPrefix + "/start");
    const flow = cookie(login, COOKIE.flow);
    const authorization = await send(begin);
    const github = new URL(authorization.headers.get("Location"));
    assert.equal(github.searchParams.get("redirect_uri"), integrationOrigin + integrationCallback);
    const oauth = cookie(authorization, COOKIE.oauth);
    const query = new URLSearchParams({ state: github.searchParams.get("state"), code: "test-code" });
    const wrongHost = await auth.fetch(new Request(authEnv.MORI_AUTH_ORIGIN + "/callback/github?" + query, {
      headers: { Cookie: oauth },
    }), authEnv);
    assert.equal(cookie(wrongHost, COOKIE.center), undefined);
    const callback = await send(integrationCallback + "?" + query, { headers: { Cookie: oauth } });
    const complete = new URL(callback.headers.get("Location"));
    assert.equal(complete.origin, integrationOrigin);
    assert.equal(complete.pathname, "/auth/complete");
    const session = await send(complete, { headers: { Cookie: flow } });
    assert.equal(session.headers.get("Location"), integrationOrigin + "/novel");
    const token = cookieToken(cookie(session, COOKIE.site));
    assert.equal((await env.MORI_AUTH.verify(token)).canReadNovel, true);
    assert.equal((await send("https://another.dev.komori.cc" + integrationCallback)).status, 404);
  } finally {
    globalThis.fetch = originalFetch;
    db.sqlite.close();
  }
});

test("legacy discussion mapping, user permissions, reply counts and idempotent mutations", async () => {
  const registry = {
    articles: { 123: { path: "/blog/123" }, 124: { path: "/blog/124" } },
    chapters: { chapter: { path: "/novel/chapter", term: "起点 | 《向远方》第一卷" } },
  };
  const cases = [
    ["article", "123", "123", "Announcements"],
    ["book", bookTerm, bookTerm, "General"],
    ["chapter", "chapter", registry.chapters.chapter.term, "General"],
    ["article-paragraph", "123-2", "123-2", "Ideas"],
    ["novel-paragraph", "chapter-8", "chapter-8", "Ideas"],
  ];
  for (const [scope, id, term, category] of cases) {
    const target = discussionTarget(registry, scope, id);
    assert.equal(target.term, term);
    assert.equal(legacyDiscussionQuery(target), `repo:${target.repo.name.toLowerCase()} category:"${category}" in:title "${term}"`);
  }
  assert.equal(discussionTarget(registry, "article", "other"), null);
  assert.equal(discussionTarget(registry, "novel-paragraph", "123-2"), null);
  assert.equal(discussionTarget(registry, "constructor", "123"), null);

  const target = discussionScopes.article;
  const node = { id: "D_1", title: "123 historical title", locked: false, repository: { id: target.repo.id, isPrivate: false }, category: { id: target.category.id } };
  const comment = { id: "DC_1", body: "before", viewerCanUpdate: true, viewerCanDelete: true, viewerCanReact: true };
  let total = 1;
  let replyCount = 2;
  const actions = [];
  let writes = 0;
  let installations = 0;
  let newPosts = 0;
  let creations = 0;
  const links = new Map();
  let categoryMismatch = false;
  const seen = new Set();
  const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs1" });
  const limiter = { limit: async () => ({ success: true }) };
  const env = {
    GITHUB_APP_ID: "101", GITHUB_INSTALLATION_ID: "102", GITHUB_APP_PRIVATE_KEY: key,
    COMMENT_READ_LIMIT: limiter, COMMENT_WRITE_LIMIT: limiter,
    MORI_COMMENT_AUTH: {
      user: async () => ({ id: "authenticated-user" }),
      discussion: async (key) => links.get(key) || null,
      remember: async (key, id) => links.set(key, id),
      release: async () => {},
      claim: async (_token, id) => {
        if (seen.has(id)) return 409;
        seen.add(id);
        return 200;
      },
      graphql: async (_token, query, variables) => {
        if (query.includes("hasDiscussionsEnabled")) return { data: { repository: { id: target.repo.id, hasDiscussionsEnabled: true } } };
        if (query.includes("addDiscussionComment")) {
          if (variables.input.discussionId === "D_124") {
            newPosts++;
            return { data: { addDiscussionComment: { comment: { id: "DC_124" } } } };
          }
          assert.equal(variables.input.discussionId, "D_1");
          if (variables.input.replyToId) {
            assert.equal(variables.input.replyToId, "DC_1");
            replyCount++;
            actions.push("reply");
          } else {
            assert.equal(variables.input.body, "new comment");
            total++;
            writes++;
          }
          return { data: { addDiscussionComment: { comment: { id: "DC_2" } } } };
        }
        if (query.includes("viewerCanUpdate viewerCanDelete viewerCanReact")) return { data: { node: {
          ...comment, id: variables.id, discussion: { id: variables.id === "DC_other" ? "D_other" : "D_1" },
          replies: { totalCount: 0 },
        } } };
        if (query.includes("updateDiscussionComment")) {
          actions.push("edit");
          return { data: { updateDiscussionComment: { comment: { id: variables.input.commentId } } } };
        }
        if (query.includes("addReaction") || query.includes("removeReaction")) {
          const name = query.includes("addReaction") ? "addReaction" : "removeReaction";
          actions.push(name);
          assert.equal(variables.input.content, "HEART");
          return { data: { [name]: { subject: { id: variables.input.subjectId } } } };
        }
        if (query.includes("deleteDiscussionComment")) {
          actions.push("delete");
          replyCount--;
          return { data: { deleteDiscussionComment: { clientMutationId: variables.input.clientMutationId } } };
        }
        throw new Error("Unexpected user query");
      },
    },
    ASSETS: { fetch: async (request) => {
      assert.ok(request.url.endsWith(discussionRegistry));
      return Response.json(registry);
    } },
  };
  env.COMMENTS = new CommentsInternal(null, env);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith("/access_tokens")) {
      installations++;
      const { repositories, permissions } = JSON.parse(options.body);
      assert.deepEqual(repositories, ["theWake"]);
      assert.ok(["read", "write"].includes(permissions.discussions));
      return Response.json({ token: "test-installation-" + permissions.discussions, expires_at: new Date(Date.now() + 3600_000).toISOString() });
    }
    const { query, variables } = JSON.parse(options.body);
    if (query.includes("createDiscussion")) {
      assert.equal(options.headers.Authorization, "Bearer test-installation-write");
      assert.equal(variables.input.repositoryId, target.repo.id);
      assert.equal(variables.input.categoryId, target.category.id);
      assert.equal(variables.input.title, "124");
      assert.match(variables.input.body, /^# 124\n\nhttps:\/\/komori\.cc\/blog\/124\n\n<!-- sha1: [a-f0-9]+ -->$/);
      creations++;
      return Response.json({ data: { createDiscussion: { discussion: { ...node, id: "D_124", title: "124" } } } });
    }
    assert.equal(options.headers.Authorization, "Bearer test-installation-read");
    if (query.includes("discussions(first: 100")) {
      assert.equal(variables.category, target.category.id);
      return Response.json({ data: { repository: { discussions: { nodes: [], pageInfo: { hasNextPage: false } } } } });
    }
    if (query.includes("search(type: DISCUSSION")) {
      if (variables.query.endsWith('in:title "124"')) return Response.json({ data: { search: { nodes: [] } } });
      assert.equal(variables.query, 'repo:komorisam/thewake category:"Announcements" in:title "123"');
      return Response.json({ data: { search: { nodes: [categoryMismatch ? { ...node, category: { id: "other" } } : node] } } });
    }
    if (query.includes("comments(first: 100")) return Response.json({ data: { node: {
      comments: variables.discussionId === "D_124"
        ? { totalCount: newPosts, nodes: [], pageInfo: { hasNextPage: false } }
        : { totalCount: total, nodes: [{ replies: { totalCount: replyCount } }], pageInfo: { hasNextPage: false } },
    } } });
    if (query.includes("comments(first: 15")) return Response.json({ data: { node: {
      ...node, reactionGroups: [], comments: {
        totalCount: total, nodes: [comment], pageInfo: { hasNextPage: false, hasPreviousPage: false },
      },
    } } });
    throw new Error("Unexpected installation query");
  };
  try {
    const url = start + "/api/comments?scope=article&target=123";
    const req = (data, token = randomToken()) => new Request(url, {
      method: "POST", headers: { Origin: start, ...(token && { Cookie: COOKIE.site + "=" + token }) },
      body: JSON.stringify(data),
    });
    const read = await website.fetch(new Request(url), env);
    assert.equal(read.status, 200);
    const data = await read.json();
    assert.equal(data.count, 3);
    assert.equal(data.includePermissions, false);
    assert.equal(data.discussion.title, "123 historical title");
    const input = { action: "post", requestId: crypto.randomUUID(), body: "new comment" };
    assert.equal((await website.fetch(req(input, null), env)).status, 401);
    const result = await website.fetch(req(input), env);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true, delta: 1, count: 4 });
    assert.equal((await website.fetch(req(input), env)).status, 409);
    assert.equal((await website.fetch(req({ action: "edit", id: "DC_other", body: "wrong thread", requestId: crypto.randomUUID() }), env)).status, 404);
    const mutation = async (action, fields) => {
      const response = await website.fetch(req({ action, requestId: crypto.randomUUID(), ...fields }), env);
      assert.equal(response.status, 200, action);
      return response.json();
    };
    assert.equal((await mutation("reply", { id: "DC_1", body: "a reply" })).count, 5);
    await mutation("edit", { id: "DC_2", body: "edited" });
    await mutation("add", { id: "DC_2", reaction: "HEART" });
    await mutation("remove", { id: "DC_2", reaction: "HEART" });
    assert.equal((await mutation("delete", { id: "DC_2" })).count, 4);
    assert.deepEqual(actions, ["reply", "edit", "addReaction", "removeReaction", "delete"]);
    assert.equal(writes, 1);
    assert.equal(installations, 1);
    const creationRequest = new Request(start + "/api/comments?scope=article&target=124", {
      method: "POST", headers: { Origin: start, Cookie: COOKIE.site + "=" + randomToken() },
      body: JSON.stringify({ action: "post", body: "first comment", requestId: crypto.randomUUID() }),
    });
    assert.equal((await website.fetch(creationRequest, env)).status, 200);
    assert.equal(creations, 1);
    assert.equal(newPosts, 1);
    assert.equal(installations, 2);
    assert.deepEqual([...links.values()], ["D_124"]);
    categoryMismatch = true;
    assert.equal((await website.fetch(new Request(url), env)).status, 502);
    const safe = renderMarkdown(
      "<img src=x onerror=alert(1)> [x](javascript:alert%281%29) **bold**",
      { mode: MARKDOWN_MODE_COMMENT },
    );
    assert.ok(!safe.includes("<img"));
    assert.ok(!safe.includes('href="javascript:'));
    assert.ok(safe.includes("<strong>bold</strong>"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("separate public and private release files, authenticated Pagefind and old path rejection", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mori-vault-"));
  const secret = "vaultsentinelchaptertext";
  const write = async (file, data) => {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, typeof data === "string" ? data : JSON.stringify(data));
  };
  const dir = ".output/content-build";
  const novel = dir + "/novel";
  const search = path.join(root, ".output/novel-search");
  const objects = new Map();
  const orig = globalThis.fetch;
  try {
    await write(novel + "/index.json", { "1": { volumeInfo: { title: "Volume", uuid: "v" }, chapters: [
      { path: "1/chap.md", title: "Chapter", uuid: "chapter", summary: secret, markdown: secret },
    ] } });
    await write(novel + "/1/chap.md", secret);
    await write(novel + "/images/private.webp", "private-image");
    await write(novel + "/images/shared.webp", "already published blog image");
    await write(dir + "/post/images/shared.webp", "already published blog image");
    await write(novel + "/images/_optimized/manifest.json", { version: 1, images: {
      [publicCovers[0]]: { width: 640, height: 480, variants: [{ src: "_optimized/abc-640.webp", width: 640 }] },
      "private.webp": { width: 50, height: 50, variants: [{ src: "_optimized/dead-50.webp", width: 50 }] },
    } });
    await write(novel + "/images/_optimized/abc-640.webp", "cover-variant");
    await write(novel + "/images/_optimized/dead-50.webp", "private-variant");
    for (const cover of publicCovers) await write(novel + "/images/" + cover, cover);
    for (const file of ["post/index.json", "kaiming/index.css", "_headers", "_redirects", "404.html"]) await write(dir + "/" + file, "public");
    await write("dist/site-data/articles.json", []);
    await write("dist/novel/chapter.html", "<main>Chapter</main>");

    for (const [outputPath, content, type] of [
      [search, secret, "novel"], [path.join(root, "dist/pagefind"), "publicsentinelblogtext", "blog"],
    ]) {
      const { index, errors } = await createIndex();
      assert.deepEqual(errors, []);
      assert.deepEqual((await index.addCustomRecord({ url: "/" + type, content, language: "en", meta: { type }, filters: { type: [type] } })).errors, []);
      assert.deepEqual((await index.writeFiles({ outputPath })).errors, []);
      await index.deleteIndex();
    }
    await pruneBuildAssets(path.join(root, "dist"));
    const version = await sealNovelRelease(root);
    assert.equal(await includePublicContent(root), version);
    assert.equal(await assertNovelRelease(root), version);
    assert.equal(await readFile(path.join(root, "dist/content/post/index.json"), "utf8"), "public");
    await assert.rejects(readFile(path.join(root, "dist/content/novel/1/chap.md")), { code: "ENOENT" });
    assert.equal(await readFile(path.join(root, "dist/content/post/images/shared.webp"), "utf8"), "already published blog image");
    await assert.rejects(readFile(path.join(root, "dist/content/novel/images/shared.webp")), { code: "ENOENT" });
    await write("dist/content/novel/index.json", "invalid");
    await assert.rejects(assertNovelRelease(root), /Unverified bundled content/);
    await includePublicContent(root);
    const base = "/api/novel/" + version;
    const manifest = await readFile(path.join(root, ".output/novel-vault.json"));
    objects.set("v1/versions/" + version + ".json", manifest);
    for (const [key, value] of Object.entries(JSON.parse(manifest))) {
      const [kind, ...rest] = key.split("/");
      objects.set("v1/objects/" + value, await readFile(path.join(kind === "search" ? search : path.join(root, novel), ...rest)));
    }
    const publicRoot = path.join(root, ".output/content");
    const rawEnv = { ASSETS: { async fetch(req) {
      const value = await readFile(path.join(publicRoot, new URL(req.url).pathname)).catch(() => null);
      return new Response(value, { status: value ? 200 : 404 });
    } } };
    const contents = await readdir(path.join(publicRoot, "novel"));
    assert.deepEqual(contents.sort(), ["images", "index.json"]);
    assert.ok(!(await readFile(path.join(publicRoot, "novel/index.json"), "utf8")).includes(secret));
    for (const url of ["/novel/1/chap.md", "/novel/images/private.webp", "/novel/images/_optimized/dead-50.webp"]) {
      assert.equal((await raw.fetch(new Request("https://raw.komori.cc" + url), rawEnv)).status, 404);
    }
    assert.equal((await raw.fetch(new Request("https://raw.komori.cc/novel/images/_optimized/abc-640.webp"), rawEnv)).status, 200);
    for (const legacy of ["/pagefind-novel/pagefind.js", "/archive/article/legacy.md"]) {
      assert.equal((await website.fetch(new Request(start + legacy), {})).status, 404);
    }

    const session = randomToken();
    let signedIn = true;
    const env = {
      MORI_AUTH: { verify: async (token) => token === session && signedIn ? { canReadNovel: true } : null },
      NOVEL_VAULT: {
        get: async (key) => objects.has(key) ? { ...new Response(objects.get(key)), body: new Response(objects.get(key)).body,
          size: objects.get(key).length, json: async () => JSON.parse(objects.get(key)) } : null,
        head: async (key) => objects.has(key) ? { size: objects.get(key).length } : null,
      },
    };
    for (const url of ["/chapters/1/chap.md", "/assets/images/private.webp", "/search/pagefind.js", "/search/pagefind-worker.js"]) {
      const response = await website.fetch(new Request(start + base + url), env);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
    const request = (resource, method = "GET") => website.fetch(new Request(start + base + resource, {
      method, headers: { Cookie: COOKIE.site + "=" + session },
    }), env);
    assert.equal(await (await request("/chapters/1/chap.md")).text(), secret);
    assert.equal(await (await request("/assets/images/private.webp")).text(), "private-image");
    assert.equal(await (await request("/assets/images/_optimized/dead-50.webp")).text(), "private-variant");
    assert.equal((await request("/assets/images/%2fprivate.webp")).status, 404);
    assert.equal((await request("/assets/images/%252e%252e/1/chap.md")).status, 404);
    assert.equal((await request("/search/pagefind-worker.js")).headers.get("Content-Type"), "text/javascript; charset=utf-8");
    assert.equal((await request("/search/pagefind-entry.json", "HEAD")).body, null);
    assert.equal((await request("/search/wasm.unknown.pagefind")).status, 200);

    const resources = new Set();
    globalThis.fetch = async (url) => {
      const pathname = new URL(String(url), start).pathname;
      resources.add(pathname);
      if (pathname.startsWith(base)) return request(pathname.slice(base.length));
      if (pathname.startsWith("/pagefind/")) return new Response(await readFile(path.join(root, "dist", pathname)));
      throw new Error("Unexpected Pagefind path");
    };
    for (const [dir, basePath, type] of [[search, base + "/search/", "novel"], [path.join(root, "dist/pagefind"), "/pagefind/", "blog"]]) {
      const pagefind = await import(pathToFileURL(path.join(dir, "pagefind.js")));
      const engine = pagefind.createInstance({ basePath });
      try {
        await engine.init();
        assert.deepEqual(Object.keys((await engine.filters()).type), [type]);
        const result = await engine.search(secret);
        assert.equal(result.results.length, type === "novel" ? 1 : 0);
        if (type === "novel") assert.equal((await result.results[0].data()).meta.type, "novel");
      } finally {
        await engine.destroy();
      }
    }
    assert.ok([...resources].some((url) => url.startsWith(base + "/search/fragment/")));
    signedIn = false;
    assert.equal((await request("/search/pagefind-entry.json")).status, 401);
    await write("dist/pagefind-novel/pagefind.js", "stale");
    await assert.rejects(assertNovelRelease(root), /Unexpected public archive, search/);
    await rm(path.join(root, "dist/pagefind-novel"), { recursive: true });
    await write("dist/novel/leak.txt", secret);
    await assert.rejects(assertNovelRelease(root), /Private novel file/);
    await rm(path.join(root, "dist/novel/leak.txt"));
    await write(".output/content/post/leak.md", secret);
    await assert.rejects(assertNovelRelease(root), /Private novel document/);
  } finally {
    globalThis.fetch = orig;
    await rm(root, { recursive: true, force: true });
  }
});


test("native website version previews only serve public assets", async () => {
  const env = {
    WEBSITE_VERSION: { id: "version-id" },
    ASSETS: { fetch: async () => new Response("version content") },
    PUBLIC_API: { fetch: async () => { throw new Error("Preview forwarded to production API"); } },
    MORI_AUTH: { verify: async () => { throw new Error("Preview used production auth"); } },
  };
  const production = await website.fetch(new Request(start + "/api/version"), env);
  assert.deepEqual(await production.json(), { version: "version-id" });
  assert.match(production.headers.get("Cache-Control"), /no-store/);
  const mismatch = await website.fetch(new Request(start + "/api/version", {
    headers: { "Cloudflare-Workers-Version-Overrides": 'website="another-version"' },
  }), env);
  assert.equal(mismatch.status, 404);
  for (const [origin, headers] of [
    ["https://version-website.example.workers.dev", {}],
    [start, { "Cloudflare-Workers-Version-Overrides": 'website="version-id"' }],
  ]) {
    const response = await website.fetch(new Request(origin + "/content/post/index.json", { headers }), env);
    assert.equal(await response.text(), "version content");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.match(response.headers.get("Content-Security-Policy"), /^sandbox/);
    const version = await website.fetch(new Request(origin + "/api/version", { headers }), env);
    assert.deepEqual(await version.json(), { version: "version-id" });
    for (const path of ["/auth/login", "/api/auth/session", "/api/github/discussions/counts", "/api/novel/version/search/pagefind.js"])
      assert.equal((await website.fetch(new Request(origin + path, { headers }), env)).status, 404);
    assert.equal((await website.fetch(new Request(origin + "/api/comments", { method: "POST", headers }), env)).status, 404);
  }
});
