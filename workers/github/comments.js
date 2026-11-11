import { legacyDiscussionQuery } from "../../shared/discussions.js";
import { githubErrorHeaders } from "./client.js";
import { countDiscussion, updateDiscussionCount } from "./discussions.js";
import { discussionGithub } from "./installation.js";
import { readGithubCache, writeGithubCache } from "./cache.js";

const reactions = new Set(["THUMBS_UP", "THUMBS_DOWN", "LAUGH", "HOORAY", "CONFUSED", "HEART", "ROCKET", "EYES"]);
const discussionFields = "id title url locked repository { id isPrivate } category { id }";
const reactionFields = "viewerCanReact reactionGroups { content viewerHasReacted users { totalCount } }";
const pageInfo = "pageInfo { hasNextPage hasPreviousPage startCursor endCursor }";
const commentFields = `
  id body createdAt lastEditedAt isMinimized viewerCanUpdate viewerCanDelete
  author { login avatarUrl url } ${reactionFields}
`;
const mutations = {
  post: ["addDiscussionComment", "AddDiscussionCommentInput", "comment { id }"],
  reply: ["addDiscussionComment", "AddDiscussionCommentInput", "comment { id }"],
  edit: ["updateDiscussionComment", "UpdateDiscussionCommentInput", "comment { id }"],
  delete: ["deleteDiscussionComment", "DeleteDiscussionCommentInput", "clientMutationId"],
  add: ["addReaction", "AddReactionInput", "subject { id }"],
  remove: ["removeReaction", "RemoveReactionInput", "subject { id }"],
};
const replyPageSize = 12;
const pageSize = 15;

const error = (status, code, retryAt) => Object.assign(new Error(code), { status, code, retryAt });
const nodeId = (value) => typeof value === "string" && /^[\w=+/\-]{1,120}$/.test(value);
const cursor = (value) => typeof value === "string" && /^[\w=+/-]{1,256}$/.test(value) ? value : null;
const validDiscussion = (node, target) => node?.repository?.id === target.repo.id && node.repository.isPrivate === false && node?.category?.id === target.category.id;
const targetKey = (target) => JSON.stringify([target.repo.id, target.category.id, target.term]);
const countsKey = (id) => new Request("https://api.komori.cc/__cache/thread-count/" + encodeURIComponent(id));

async function discussionNode(github, id) {
  const data = await github.graphql(`query($id: ID!) { node(id: $id) { ... on Discussion { ${discussionFields} } } }`, { id });
  return data.node;
}

export async function resolveDiscussion(github, auth, target) {
  const stored = await auth.discussion(targetKey(target));
  if (stored) {
    const node = await discussionNode(github, stored).catch((failure) => {
      if (failure.status === 404) return null;
      throw failure;
    });
    if (validDiscussion(node, target)) return node;
  }
  const data = await github.graphql(`
    query($query: String!) {
      search(type: DISCUSSION, last: 1, query: $query) {
        nodes { ... on Discussion { ${discussionFields} } }
      }
    }
  `, { query: legacyDiscussionQuery(target) });
  const node = data.search.nodes[0];
  if (node && !validDiscussion(node, target)) throw error(502, "DISCUSSION_SCOPE_MISMATCH");
  return node || null;
}

async function createDiscussion(github, env, target) {
  // Search can lag behind writes, including writes from GitHub itself.
  const [owner, name] = target.repo.name.split("/");
  let after = null;
  for (let page = 0; page < 8; page++) {
    const { repository } = await github.graphql(`
      query($owner: String!, $name: String!, $category: ID!, $after: String) {
        repository(owner: $owner, name: $name) {
          discussions(first: 100, after: $after, categoryId: $category,
            orderBy: { field: CREATED_AT, direction: DESC }) {
            ${pageInfo} nodes { ${discussionFields} }
          }
        }
      }
    `, { owner, name, category: target.category.id, after });
    const { nodes, pageInfo: pageState } = repository.discussions;
    const found = nodes.find((node) => node.title === target.term && validDiscussion(node, target));
    if (found) return found;
    if (!pageState.hasNextPage) break;
    if (page === 7) throw error(503, "DISCUSSION_LOOKUP_INCOMPLETE");
    after = pageState.endCursor;
  }
  const writer = await discussionGithub(env, target.repo.name, "write");
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(target.term));
  const sha = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { createDiscussion: created } = await writer.graphql(`
    mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) { discussion { ${discussionFields} } }
    }
  `, { input: {
    repositoryId: target.repo.id, categoryId: target.category.id, title: target.term,
    body: `# ${target.term}\n\n${target.url.split("#")[0]}\n\n<!-- sha1: ${sha} -->`,
  } });
  if (!validDiscussion(created?.discussion, target)) throw error(502, "DISCUSSION_CREATE_FAILED");
  return created.discussion;
}

async function totals(github, id, force = false) {
  const key = countsKey(id);
  const cached = force ? null : await readGithubCache(key);
  if (cached) return cached.count;
  const count = await countDiscussion(github, id);
  await writeGithubCache(key, { count }, Date.now() + 300_000);
  return count;
}

function hideMinimized(comments) {
  for (const comment of comments) {
    if (comment.isMinimized) comment.body = "";
    if (comment.replies?.nodes) hideMinimized(comment.replies.nodes);
  }
}

async function getThread(github, discussion, input, includePermissions) {
  const id = discussion.id;
  const after = cursor(input.cursor);
  const newest = input.sort === "newest";
  if (input.parent) {
    if (!nodeId(input.parent)) throw error(400, "INVALID_COMMENT");
    const { node } = await github.graphql(`
      query($id: ID!, $after: String) {
        node(id: $id) { ... on DiscussionComment {
          discussion { id } replyTo { id }
          replies(first: ${replyPageSize}, after: $after) { ${pageInfo} nodes { ${commentFields} } }
        } }
      }
    `, { id: input.parent, after });
    if (node?.discussion?.id !== id || node.replyTo) throw error(404, "INVALID_COMMENT");
    hideMinimized(node.replies.nodes);
    return { replies: node.replies, includePermissions };
  }
  const pagination = newest ? `last: ${pageSize}, before: $after` : `first: ${pageSize}, after: $after`;
  const { node } = await github.graphql(`
    query($id: ID!, $after: String) {
      node(id: $id) { ... on Discussion {
        ${discussionFields} ${reactionFields}
        comments(${pagination}) {
          ${pageInfo} totalCount
          nodes {
            ${commentFields}
            replies(first: ${replyPageSize}) { ${pageInfo} totalCount nodes { ${commentFields} } }
          }
        }
      } }
    }
  `, { id, after });
  if (!node || node.id !== id || node.category.id !== discussion.category.id ||
      node.repository.id !== discussion.repository.id || node.repository.isPrivate !== false) throw error(404, "DISCUSSION_NOT_FOUND");
  hideMinimized(node.comments.nodes);
  if (newest) node.comments.nodes.reverse();
  return { discussion: node, includePermissions };
}

async function writeComment(github, user, auth, env, target, input) {
  const { action, requestId } = input;
  if (!Object.hasOwn(mutations, action) || !(typeof requestId === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId))) throw error(400, "INVALID_COMMENT");
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (["post", "reply", "edit"].includes(action) && (!body || body.length > 10000))
    throw error(400, "INVALID_COMMENT_BODY");
  if (["add", "remove"].includes(action) && !reactions.has(input.reaction)) throw error(400, "INVALID_REACTION");
  const key = targetKey(target);
  const owner = crypto.randomUUID();
  const claim = await auth.claim(user.token, requestId, key, owner);
  if (claim !== 200) throw error(claim, claim === 409 ? "COMMENT_ALREADY_SUBMITTED" : "COMMENT_RATE_LIMITED");
  try {
    // Verify GitHub authorization before creating a discussion as the installation.
    const [ownerName, repoName] = target.repo.name.split("/");
    const { repository } = await user.graphql(
      "query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id hasDiscussionsEnabled } }",
      { owner: ownerName, name: repoName },
    );
    if (repository?.id !== target.repo.id || !repository.hasDiscussionsEnabled) throw error(403, "COMMENT_FORBIDDEN");
    let discussion = await resolveDiscussion(github, auth, target);
    if (!discussion) {
      if (action !== "post" && !(action === "add" && !input.id)) throw error(404, "DISCUSSION_NOT_FOUND");
      discussion = await createDiscussion(github, env, target);
      await auth.remember(key, discussion.id);
    }
    const id = discussion.id;
    let subject = null;
    if (input.id) {
      if (!nodeId(input.id)) throw error(400, "INVALID_COMMENT");
      const { node } = await user.graphql(`
        query($id: ID!) {
          node(id: $id) { ... on DiscussionComment {
            id discussion { id } replyTo { id } isMinimized
            viewerCanUpdate viewerCanDelete viewerCanReact replies { totalCount }
          } }
        }
      `, { id: input.id });
      if (node?.discussion?.id !== id || node.isMinimized) throw error(404, "INVALID_COMMENT");
      subject = node;
    }
    const mutation = { clientMutationId: requestId };
    let delta = 0;
    if (action === "post" || action === "reply") {
      if (discussion.locked || (action === "reply" && (!subject || subject.replyTo))) throw error(403, "COMMENT_FORBIDDEN");
      Object.assign(mutation, { discussionId: id, body, ...(action === "reply" && { replyToId: subject.id }) });
      delta = 1;
    } else if (action === "edit" || action === "delete") {
      if (!(action === "edit" ? subject?.viewerCanUpdate : subject?.viewerCanDelete)) throw error(403, "COMMENT_FORBIDDEN");
      Object.assign(mutation, { commentId: subject.id, ...(action === "edit" && { body }) });
      if (action === "delete") delta = -1 - (subject.replies?.totalCount || 0);
    } else {
      const permitted = subject ? subject.viewerCanReact : (await user.graphql(
        "query($id: ID!) { node(id: $id) { ... on Discussion { viewerCanReact } } }", { id },
      )).node?.viewerCanReact;
      if (!permitted) throw error(403, "COMMENT_FORBIDDEN");
      Object.assign(mutation, { subjectId: subject?.id || id, content: input.reaction });
    }
    const [name, type, fields] = mutations[action];
    const previousCount = delta ? await totals(github, id).catch(() => null) : null;
    await user.graphql(`mutation($input: ${type}!) { ${name}(input: $input) { ${fields} } }`, { input: mutation });
    let count = null;
    if (delta) {
      try {
        count = await totals(github, id, true);
        if (previousCount !== null) delta = count - previousCount;
        await updateDiscussionCount(env, target, discussion.title, count);
      } catch { /* The GitHub mutation has already succeeded. */ }
    }
    return { ok: true, delta, count };
  } finally {
    await auth.release(key, owner).catch(() => {});
  }
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw error(400, "INVALID_COMMENT");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 64_000) {
      await reader.cancel();
      throw error(413, "INVALID_COMMENT_BODY");
    }
    text += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(text + decoder.decode()); }
  catch { throw error(400, "INVALID_COMMENT"); }
}

export async function handleComments(request, env, token, target) {
  const write = request.method === "POST";
  const limiter = write ? env.COMMENT_WRITE_LIMIT : env.COMMENT_READ_LIMIT;
  const auth = env.MORI_COMMENT_AUTH;
  try {
    if (!limiter || !(await limiter.limit({ key: request.headers.get("CF-Connecting-IP") || "unknown" })).success)
      throw error(429, "COMMENT_RATE_LIMITED");
    const signedIn = token && await auth.user(token);
    if (write && !signedIn) throw error(401, "LOGIN_REQUIRED");
    const input = write ? await readJson(request) : Object.fromEntries(new URL(request.url).searchParams);
    if (!input || typeof input !== "object") throw error(400, "INVALID_COMMENT");
    const github = await discussionGithub(env, target.repo.name);
    const user = signedIn && { token, async graphql(query, variables) {
      const result = await auth.graphql(token, query, variables);
      if (!result.data) throw error(result.status, result.error || "GITHUB_REQUEST_FAILED", result.retryAt);
      return result.data;
    } };
    let body;
    if (write) {
      body = await writeComment(github, user, auth, env, target, input);
    } else {
      const discussion = await resolveDiscussion(github, auth, target);
      if (!discussion) return { status: 200, body: { discussion: null, count: 0 } };
      let thread;
      try {
        thread = await getThread(user || github, discussion, input, Boolean(user));
      } catch (failure) {
        if (!user || ![401, 403, 409].includes(failure.status)) throw failure;
        thread = await getThread(github, discussion, input, false);
      }
      body = input.parent ? thread : { ...thread, count: await totals(github, discussion.id) };
    }
    return { status: 200, body };
  } catch (failure) {
    const status = failure.status || 503;
    return {
      status, body: { error: failure.code || "COMMENTS_UNAVAILABLE" },
      headers: status === 429 || failure.retryAt ? githubErrorHeaders(failure) : {},
    };
  }
}
