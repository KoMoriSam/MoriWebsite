import { WorkerEntrypoint } from "cloudflare:workers";
import api from "../api.js";
import { json } from "../auth/http.js";

export { GameRoom } from "../api.js";

const response = (nodes) => ({
  discussion: {
    id: "local-thread", title: "本地测试讨论", locked: false, viewerCanReact: false,
    reactionGroups: [], comments: { nodes, totalCount: nodes.length, pageInfo: { hasNextPage: false, hasPreviousPage: false } },
  },
  includePermissions: true,
});

export class CommentsInternal extends WorkerEntrypoint {
  async handle(request, token, target) {
    const key = "discussion:" + target.url;
    const store = this.env.LOCAL_COMMENTS;
    const user = await this.env.MORI_COMMENT_AUTH.user(token);
    if (request.method === "GET") {
      const nodes = await store.get(key, "json") || [];
      const parent = new URL(request.url).searchParams.get("parent");
      if (parent) {
        const replies = nodes.find(({ id }) => id === parent)?.replies;
        return replies ? { status: 200, body: { replies, includePermissions: Boolean(user) } }
          : { status: 404, body: { error: "INVALID_COMMENT" } };
      }
      return { status: 200, body: { ...response(nodes), includePermissions: Boolean(user) } };
    }
    if (!user) return { status: 401, body: { error: "LOGIN_REQUIRED" } };
    const { action, body, id, requestId } = await request.json();
    if (!["post", "reply"].includes(action) || typeof body !== "string" || !body.trim() ||
        body.length > 10000 || !/^[0-9a-f-]{36}$/i.test(requestId || ""))
      return { status: 400, body: { error: "INVALID_COMMENT" } };
    const owner = crypto.randomUUID();
    const claim = await this.env.MORI_COMMENT_AUTH.claim(token, requestId, key, owner);
    if (claim !== 200) return { status: claim, body: { error: "COMMENT_WRITE_FAILED" } };
    try {
      const nodes = await store.get(key, "json") || [];
      const comment = {
        id: owner, body: body.trim(), createdAt: new Date().toISOString(),
        author: { login: user.name }, viewerCanUpdate: false, viewerCanDelete: false,
        viewerCanReact: false, reactionGroups: [],
        replies: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false } },
      };
      if (action === "post") nodes.push(comment);
      else {
        const parent = nodes.find((node) => node.id === id);
        if (!parent) return { status: 404, body: { error: "INVALID_COMMENT" } };
        parent.replies.nodes.push(comment);
        parent.replies.totalCount++;
      }
      await store.put(key, JSON.stringify(nodes));
      return { status: 200, body: response(nodes) };
    } finally {
      await this.env.MORI_COMMENT_AUTH.release(key, owner);
    }
  }
}

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/github/discussions/counts") return json({ counts: {} });
    if (pathname.startsWith("/github/") || pathname === "/random-hero") return json({}, 404);
    return api.fetch(request, env, ctx);
  },
};
