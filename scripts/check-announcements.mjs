import assert from "node:assert/strict";

import worker from "./api-worker.js";
import {
  diffAnnouncements,
  findRevisionRollback,
  parseAnnouncementMarkdown as parseAnnouncementSource,
  parseAnnouncementsJson,
  renderAnnouncementMarkdown as renderAnnouncementSource,
  validateAnnouncement as validateAnnouncementSource,
} from "./announcement-cli.mjs";
import { normalizeAnnouncementsPayload } from "../src/services/api-announcements.js";
import {
  announcementKey,
  getPrioritizedActiveAnnouncements,
  getUnreadAnnouncements,
  getUnpromptedAnnouncements,
  isAnnouncementRead,
  withAnnouncementRead,
} from "../src/utils/announcement-state.js";
import {
  MARKDOWN_MODE_STANDARD,
  renderMarkdown,
} from "../src/utils/markdown/render-markdown.js";

const ORIGIN = "https://komori.cc";
const ENDPOINT = "https://api.komori.cc/announcements";

const createRequest = (method = "GET") =>
  new Request(ENDPOINT, {
    method,
    headers: { Origin: ORIGIN },
  });

const createEnv = (payload) => ({
  ALLOWED_ORIGIN: ORIGIN,
  ANNOUNCEMENTS_KV: {
    async get(key) {
      assert.equal(key, "announcements:v1");
      if (payload === null || typeof payload === "string") return payload;
      return JSON.stringify(payload);
    },
  },
});

const validPayload = (items = []) => ({
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  items,
});

const responseJson = async (request, env) => {
  const response = await worker.fetch(request, env);
  return { response, body: await response.json() };
};

{
  const { response, body } = await responseJson(createRequest(), {
    ALLOWED_ORIGIN: ORIGIN,
  });
  assert.equal(response.status, 503);
  assert.equal(body.error, "ANNOUNCEMENTS_UNAVAILABLE");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

{
  const { response, body } = await responseJson(
    createRequest(),
    createEnv(null),
  );
  assert.equal(response.status, 503);
  assert.equal(body.error, "ANNOUNCEMENTS_UNAVAILABLE");
}

{
  const { response, body } = await responseJson(
    createRequest(),
    createEnv("not-json"),
  );
  assert.equal(response.status, 503);
  assert.equal(body.error, "INVALID_ANNOUNCEMENTS");
}

{
  const { response, body } = await responseJson(
    createRequest(),
    createEnv(`\uFEFF${JSON.stringify(validPayload())}`),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(body.items, []);
}

{
  const { response, body } = await responseJson(
    createRequest(),
    createEnv({ schemaVersion: 2, updatedAt: "invalid", items: [] }),
  );
  assert.equal(response.status, 503);
  assert.equal(body.error, "INVALID_ANNOUNCEMENTS");
}

{
  const { response, body } = await responseJson(
    createRequest(),
    createEnv(validPayload()),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(body.items, []);
  assert.equal(body.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(body.serverTime)));
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.match(response.headers.get("Cache-Control"), /s-maxage=300/);
}

{
  const now = Date.now();
  const base = {
    revision: 1,
    summary: "摘要",
    body: "正文",
    tone: "info",
    priority: "normal",
  };
  const items = [
    {
      ...base,
      id: "active",
      title: "当前公告",
      pinned: true,
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 60_000).toISOString(),
    },
    {
      ...base,
      id: "expired",
      title: "过期公告",
      startsAt: new Date(now - 120_000).toISOString(),
      endsAt: new Date(now - 60_000).toISOString(),
    },
    {
      ...base,
      id: "future",
      title: "未来公告",
      startsAt: new Date(now + 60_000).toISOString(),
    },
    {
      ...base,
      id: "active",
      title: "重复公告",
      startsAt: new Date(now - 30_000).toISOString(),
    },
    {
      ...base,
      id: "invalid",
      title: "无效公告",
      tone: "success",
      startsAt: new Date(now - 30_000).toISOString(),
    },
    {
      ...base,
      id: "invalid-pinned",
      title: "置顶字段类型错误",
      pinned: "true",
      startsAt: new Date(now - 30_000).toISOString(),
    },
    {
      ...base,
      id: "string-revision",
      revision: "1",
      title: "修订号类型错误",
      startsAt: new Date(now - 30_000).toISOString(),
    },
  ];

  const { response, body } = await responseJson(
    createRequest(),
    createEnv(validPayload(items)),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(
    body.items.map(({ id, active, pinned }) => ({ id, active, pinned })),
    [
      { id: "active", active: true, pinned: true },
      { id: "expired", active: false, pinned: false },
    ],
  );
}

{
  const { response } = await responseJson(
    createRequest("POST"),
    createEnv(validPayload()),
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
}

{
  const response = await worker.fetch(createRequest("OPTIONS"), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
}

{
  const html = renderMarkdown(
    "# 标题\n\n**强调**、[链接](https://example.com)、`代码`、~~删除~~ 和 <b>HTML</b>\n\n- 列表\n\n```mermaid\ngraph TD\n```",
    { mode: MARKDOWN_MODE_STANDARD },
  );
  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<strong>强调<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">链接<\/a>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<code>代码<\/code>/);
  assert.match(html, /<s>删除<\/s>/);
  assert.match(html, /language-mermaid/);
  assert.match(html, /<b>HTML<\/b>/);
  assert.doesNotMatch(html, /<markdown-/);
}

{
  const payload = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    items: [
      {
        id: "revision-test",
        revision: 2,
        title: "修订测试",
        summary: "摘要",
        body: "正文",
        tone: "warning",
        priority: "important",
        pinned: true,
        startsAt: new Date().toISOString(),
        endsAt: null,
        active: true,
      },
      {
        id: "revision-test",
        revision: 3,
        title: "重复项",
        summary: "摘要",
        body: "正文",
        tone: "info",
        priority: "normal",
        startsAt: new Date().toISOString(),
        endsAt: null,
        active: true,
      },
      {
        id: "legacy-item",
        revision: 1,
        title: "兼容旧公告",
        summary: "摘要",
        body: "正文",
        tone: "info",
        priority: "normal",
        startsAt: new Date().toISOString(),
        endsAt: null,
        active: true,
      },
      {
        id: "invalid-pinned-client",
        revision: 1,
        title: "错误置顶字段",
        summary: "摘要",
        body: "正文",
        tone: "info",
        priority: "normal",
        pinned: "true",
        startsAt: new Date().toISOString(),
        endsAt: null,
        active: true,
      },
    ],
  };
  const normalized = normalizeAnnouncementsPayload(payload);
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.items[0].revision, 2);
  assert.equal(normalized.items[0].pinned, true);
  assert.equal(normalized.items[1].pinned, false);
  assert.throws(
    () => normalizeAnnouncementsPayload({ ...payload, serverTime: "invalid" }),
    /无效的数据结构/,
  );
}

{
  const revisionOne = { id: "revision", revision: 1, active: true };
  const revisionTwo = { id: "revision", revision: 2, active: true };
  const expired = { id: "expired", revision: 1, active: false };
  const readRevisions = withAnnouncementRead({}, revisionOne);

  assert.equal(isAnnouncementRead(readRevisions, revisionOne), true);
  assert.equal(isAnnouncementRead(readRevisions, revisionTwo), false);
  assert.deepEqual(getUnreadAnnouncements([revisionOne, revisionTwo, expired], readRevisions), [
    revisionTwo,
  ]);

  const promptedKeys = new Set([announcementKey(revisionTwo)]);
  assert.deepEqual(
    getUnpromptedAnnouncements([revisionTwo], promptedKeys),
    [],
  );

  const anotherRead = { id: "another-read", revision: 1, active: true };
  const anotherUnread = { id: "another-unread", revision: 1, active: true };
  const pinnedRead = {
    id: "pinned-read",
    revision: 1,
    active: true,
    pinned: true,
  };
  const pinnedUnread = {
    id: "pinned-unread",
    revision: 1,
    active: true,
    pinned: true,
  };
  const mixedAnnouncements = [
    revisionOne,
    anotherUnread,
    pinnedRead,
    expired,
    anotherRead,
    revisionTwo,
    pinnedUnread,
  ];
  assert.deepEqual(
    getPrioritizedActiveAnnouncements(mixedAnnouncements, {
      ...readRevisions,
      [anotherRead.id]: anotherRead.revision,
      [pinnedRead.id]: pinnedRead.revision,
    }).map((announcement) => announcement.id),
    [
      "pinned-unread",
      "pinned-read",
      "another-unread",
      "revision",
      "revision",
      "another-read",
    ],
  );
  assert.deepEqual(
    mixedAnnouncements.map((announcement) => announcement.id),
    [
      "revision",
      "another-unread",
      "pinned-read",
      "expired",
      "another-read",
      "revision",
      "pinned-unread",
    ],
  );
}

{
  const sourceAnnouncement = {
    id: "cli-test",
    revision: 1,
    title: "CLI 测试",
    summary: "测试 Markdown 公告的解析和生成。",
    body: "正文包含 **强调**。",
    tone: "info",
    priority: "normal",
    pinned: true,
    startsAt: "2026-09-12T16:00:00+08:00",
  };
  const markdown = renderAnnouncementSource(sourceAnnouncement);
  const parsed = parseAnnouncementSource(markdown, "cli-test.md");
  assert.equal(parsed.id, sourceAnnouncement.id);
  assert.equal(parsed.revision, 1);
  assert.equal(parsed.pinned, true);
  assert.equal(parsed.body, sourceAnnouncement.body);
  assert.match(markdown, /pinned: true/);
  const legacyAnnouncement = { ...sourceAnnouncement };
  delete legacyAnnouncement.pinned;
  assert.equal(validateAnnouncementSource(legacyAnnouncement).pinned, false);
  assert.equal(
    Date.parse(parsed.startsAt),
    Date.parse(sourceAnnouncement.startsAt),
  );
  assert.throws(
    () =>
      validateAnnouncementSource({
        ...sourceAnnouncement,
        endsAt: "2026-09-12T15:00:00+08:00",
      }),
    /endsAt 必须晚于 startsAt/,
  );

  const changed = { ...sourceAnnouncement, revision: 2 };
  const diff = diffAnnouncements(
    [changed, { ...sourceAnnouncement, id: "added" }],
    [sourceAnnouncement, { ...sourceAnnouncement, id: "removed" }],
  );
  assert.deepEqual(diff.added.map((item) => item.id), ["added"]);
  assert.deepEqual(diff.changed.map((item) => item.id), ["cli-test"]);
  assert.deepEqual(diff.removed.map((item) => item.id), ["removed"]);
  assert.equal(
    findRevisionRollback([sourceAnnouncement], [changed])?.id,
    "cli-test",
  );
  assert.deepEqual(parseAnnouncementsJson(`\uFEFF${JSON.stringify({ ok: true })}`), {
    ok: true,
  });
}

console.log("Announcement checks passed.");
