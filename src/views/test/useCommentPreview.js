import { reactive, watch } from "vue";
import { siteOwnerLogin } from "@/../shared/discussions.js";
import { COMMENT_SAMPLES } from "./comment-samples";

const discussionUrl = "https://github.com/example/comment-preview/discussions/1";
const pageSize = 3;
const replyPageSize = 2;

function reactions(likes = 12) {
  return [
    { content: "THUMBS_UP", count: likes, viewers: new Set() },
    { content: "THUMBS_DOWN", count: 2, viewers: new Set() },
    { content: "HEART", count: 3, viewers: new Set() },
  ];
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = Number.isFinite(ms)
      ? setTimeout(() => {
          signal?.removeEventListener("abort", abort);
          resolve();
        }, ms)
      : undefined;
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export function useCommentPreview() {
  const settings = reactive({
    status: "ready",
    identity: "owner",
    locked: false,
    minimized: false,
    edited: true,
    showReactions: true,
    showReplies: true,
    showMore: false,
    delay: 0,
    body: COMMENT_SAMPLES[0].body,
  });

  let comments;
  let threadReactions;
  let edits;
  let sequence;
  let extraComments;
  let firstCommentId;
  const authState = reactive({
    get authenticated() { return settings.identity !== "guest"; },
    checking: false,
    revision: 0,
  });
  const preview = reactive({
    revision: 0,
    draft: null,
    auth: {
      state: authState,
      login() { settings.identity = "member"; },
    },
    request,
  });

  function entry(login, body, age = 0) {
    const id = String(++sequence);
    return {
      id,
      body,
      createdAt: new Date(Date.now() - age * 3_600_000).toISOString(),
      url: `${discussionUrl}#discussioncomment-${id}`,
      author: login ? { login, url: `https://github.com/${login}` } : null,
      reactionGroups: age ? reactions(age % 15 + 1) : [],
      replies: [],
    };
  }

  function reset() {
    sequence = 100;
    edits = new Map();
    threadReactions = reactions();
    const first = entry(siteOwnerLogin, settings.body, 48);
    firstCommentId = first.id;
    const firstReply = entry("preview-reader", "我也注意到了。回头再读一遍，感觉会不一样。", 30);
    first.replies = [
      firstReply,
      entry(siteOwnerLogin, "> 回头再读一遍\n\n确实，前面的伏笔很轻。", 24),
      entry(null, "这条用于查看已删除账号的显示。", 20),
    ];
    first.lastEditedAt = new Date(Date.now() - 60_000).toISOString();
    edits.set(first.id, [
      { id: "current", editor: siteOwnerLogin, editedAt: first.lastEditedAt },
      { id: "previous", editor: siteOwnerLogin, editedAt: first.createdAt },
    ]);
    comments = [
      first,
      entry("a-reader-with-a-very-long-github-name", "这条评论用来检查长用户名和时间是否自然换行。", 18),
      entry(null, "这条评论没有可显示的作者资料。", 10),
      entry("preview-reader", "翻页后看到的评论。", 4),
      entry(siteOwnerLogin, "这是讨论串的最后一条示例。", 1),
    ];
    extraComments = new Set(comments.slice(pageSize).map(({ id }) => id));
    preview.draft = null;
    preview.revision++;
  }

  reset();
  watch(() => settings.identity, () => authState.revision++, { flush: "sync" });
  watch(
    () => [
      settings.status,
      settings.locked,
      settings.minimized,
      settings.edited,
      settings.showReactions,
      settings.showReplies,
      settings.showMore,
      settings.delay,
    ],
    () => preview.revision++,
  );

  const viewer = () => settings.identity === "owner" ? siteOwnerLogin : "preview-reader";
  const signedIn = () => preview.auth.state.authenticated;
  function formatReactions(groups) {
    return groups
      .filter(({ viewers }) => settings.showReactions || viewers.size)
      .map(({ content, count, viewers }) => ({
        content,
        users: { totalCount: (settings.showReactions ? count : 0) + viewers.size },
        viewerHasReacted: signedIn() && viewers.has(viewer()),
      }));
  }
  const visibleComments = () => {
    if (settings.status === "empty") return [];
    return comments.filter(({ id }) => settings.showMore || !extraComments.has(id));
  };
  const visibleReplies = (comment) => settings.showReplies ? comment.replies : [];
  function counts() {
    const items = visibleComments();
    const replyCount = items.reduce((sum, item) => sum + visibleReplies(item).length, 0);
    return { commentCount: items.length, replyCount, count: items.length + replyCount };
  }

  function formatEntry(item, reply = false) {
    const canManage = signedIn() && item.author?.login === viewer();
    const first = item.id === firstCommentId;
    return {
      ...item,
      get body() { return first ? settings.body : item.body; },
      isMinimized: first && settings.minimized,
      lastEditedAt: settings.edited ? item.lastEditedAt : null,
      viewerCanUpdate: canManage,
      viewerCanDelete: canManage,
      viewerCanReact: !settings.locked,
      reactionGroups: formatReactions(item.reactionGroups),
      replies: reply ? undefined : { totalCount: visibleReplies(item).length },
    };
  }

  function mutate({ action, id, reaction, body }) {
    const before = counts().count;
    const parent = comments.find((item) => item.replies.some((reply) => reply.id === id));
    const items = parent?.replies ?? comments;
    const item = items.find((comment) => comment.id === id);
    if (id && !item) throw new Error("COMMENT_PREVIEW_MISSING");
    if (action === "post") {
      if (settings.status === "empty") {
        comments = [];
        settings.status = "ready";
      }
      comments.push(entry(viewer(), body));
    } else if (action === "reply") {
      item.replies.push(entry(viewer(), body));
    } else if (action === "edit") {
      item.body = body;
      if (id === firstCommentId) settings.body = body;
      item.lastEditedAt = new Date().toISOString();
      edits.set(id, [
        { id: String(++sequence), editor: viewer(), editedAt: item.lastEditedAt },
        ...(edits.get(id) || []),
      ]);
    } else if (action === "delete") {
      items.splice(items.indexOf(item), 1);
      edits.delete(id);
    } else {
      const groups = item?.reactionGroups ?? threadReactions;
      let group = groups.find(({ content }) => content === reaction);
      if (!group) {
        group = { content: reaction, count: 0, viewers: new Set() };
        groups.push(group);
      }
      if (action === "add") group.viewers.add(viewer());
      else group.viewers.delete(viewer());
    }
    return { ...counts(), delta: counts().count - before };
  }

  async function request(parameters, { signal, body } = {}) {
    const { status, delay, identity } = settings;
    const thread = comments;
    await wait(status === "loading" && signal ? Infinity : delay, signal);
    if (thread !== comments || status === "error")
      throw Object.assign(new Error("COMMENT_PREVIEW_ERROR"), { status: 500 });
    if (body) {
      if (identity !== settings.identity || settings.locked)
        throw new Error("COMMENT_PREVIEW_UNAVAILABLE");
      return mutate(JSON.parse(body));
    }

    const offset = Number(parameters.cursor || 0);
    const includePermissions = signedIn();
    if (parameters.history) {
      const revisions = edits.get(parameters.history) || [];
      return {
        edits: revisions.slice(offset, offset + 1),
        nextCursor: offset + 1 < revisions.length ? String(offset + 1) : null,
      };
    }
    if (parameters.parent) {
      const parent = comments.find(({ id }) => id === parameters.parent);
      const replies = parent ? visibleReplies(parent) : [];
      const end = offset + replyPageSize;
      return {
        includePermissions,
        replies: {
          totalCount: replies.length,
          nodes: replies.slice(offset, end).map((reply) => formatEntry(reply, true)),
          pageInfo: { hasNextPage: end < replies.length, endCursor: String(end) },
        },
      };
    }

    const items = visibleComments();
    const newest = parameters.sort === "newest";
    if (newest) items.reverse();
    if (parameters.sort === "top") {
      const votes = (item) => formatReactions(item.reactionGroups)
        .find(({ content }) => content === "THUMBS_UP")?.users.totalCount ?? 0;
      items.sort((a, b) => votes(b) - votes(a));
    }
    const end = offset + pageSize;
    const more = end < items.length;
    return {
      ...counts(),
      includePermissions,
      discussion: {
        url: discussionUrl,
        locked: settings.locked,
        viewerCanReact: !settings.locked,
        reactionGroups: formatReactions(threadReactions),
        comments: {
          totalCount: items.length,
          nodes: items.slice(offset, end).map((item) => formatEntry(item)),
          pageInfo: {
            hasPreviousPage: newest && more,
            hasNextPage: !newest && more,
            startCursor: String(end),
            endCursor: String(end),
          },
        },
      },
    };
  }

  return { settings, preview, reset };
}
