import { configuredDiscussionScopes } from "../../shared/discussions.js";
import { discussionGithub } from "./installation.js";
import { deleteGithubCache, readGithubCache, writeGithubCache } from "./cache.js";
import { githubErrorHeaders } from "./client.js";

const FRESH_MS = 5 * 60_000;
const RETAIN_MS = 60 * 60_000;

function getSourceConfig(env, sourceType, scope = "paragraph") {
  const novel = sourceType === "novel";
  const configuration = configuredDiscussionScopes(env)[scope === "paragraph"
    ? (novel ? "novel-paragraph" : "article-paragraph") : (novel ? "chapter" : "article")];
  const [owner, repo] = configuration.repo.name.split("/");
  const variable = novel ? "NOVEL" : "ARTICLE";
  const specific = scope === "paragraph" ? variable : `${variable}_${novel ? "CHAPTER" : "CONTENT"}`;
  return {
    owner, repo, categoryId: configuration.category.id,
    privateRepository: env.MORI_ENV === "staging", repositoryId: configuration.repo.id,
    maxPages: Number(env[`${specific}_MAX_PAGES`] || env[`${variable}_MAX_PAGES`] || env.MAX_PAGES || 20),
  };
}

async function fetchDiscussionPage({ github, owner, repo, categoryId, cursor, privateRepository, repositoryId }) {
  const query = `
    query DiscussionCountPage(
      $owner: String!,
      $repo: String!,
      $categoryId: ID!,
      $cursor: String
    ) {
      repository(owner: $owner, name: $repo) {
        id isPrivate
        discussions(
          first: 100,
          after: $cursor,
          categoryId: $categoryId,
          orderBy: {
            field: UPDATED_AT,
            direction: DESC
          }
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            comments(first: 100) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                replies {
                  totalCount
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await github.graphql(query, { owner, repo, categoryId, cursor });
  if (data.repository?.isPrivate !== privateRepository ||
      (privateRepository && data.repository.id !== repositoryId)) throw Object.assign(new Error("Discussion repository is unavailable"), { status: 403 });
  const connection = data.repository?.discussions;
  if (!connection) throw new Error("GitHub 未返回讨论计数");
  return connection;
}

async function fetchDiscussionCommentPage({ github, discussionId, cursor }) {
  const query = `
    query DiscussionCommentCountPage(
      $discussionId: ID!,
      $cursor: String
    ) {
      node(id: $discussionId) {
        ... on Discussion {
          comments(first: 100, after: $cursor) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              replies {
                totalCount
              }
            }
          }
        }
      }
    }
  `;

  const data = await github.graphql(query, { discussionId, cursor });
  const connection = data.node?.comments;
  if (!connection) throw new Error("GitHub 未返回讨论计数");
  return connection;
}

function sumReplyCounts(comments) {
  return (comments?.nodes || []).reduce((total, comment) => {
    const count = Number(comment?.replies?.totalCount ?? 0);
    return total + (Number.isFinite(count) ? Math.max(0, count) : 0);
  }, 0);
}

async function fetchDiscussionReplyCount({ github, discussionId, comments }) {
  let replyCount = sumReplyCounts(comments);
  let hasNextPage = Boolean(comments?.pageInfo?.hasNextPage);
  let cursor = comments?.pageInfo?.endCursor || null;

  while (hasNextPage && cursor) {
    const nextComments = await fetchDiscussionCommentPage({
      github,
      discussionId,
      cursor,
    });

    replyCount += sumReplyCounts(nextComments);
    hasNextPage = Boolean(nextComments?.pageInfo?.hasNextPage);
    cursor = nextComments?.pageInfo?.endCursor || null;
  }

  return replyCount;
}

async function fetchAllDiscussionCounts({
  github,
  owner,
  repo,
  categoryId,
  maxPages,
  privateRepository,
  repositoryId,
}) {
  const counts = Object.create(null);
  let cursor = null;
  let page = 0;

  while (page < maxPages) {
    page += 1;

    const discussions = await fetchDiscussionPage({
      github,
      owner,
      repo,
      categoryId,
      cursor,
      privateRepository,
      repositoryId,
    });

    const nodes = discussions?.nodes || [];

    for (const node of nodes) {
      if (!node?.title) continue;

      const commentCount = Number(node?.comments?.totalCount ?? 0);
      const replyCount = node?.id
        ? await fetchDiscussionReplyCount({
            github,
            discussionId: node.id,
            comments: node.comments,
          })
        : 0;
      const count =
        (Number.isFinite(commentCount) ? Math.max(0, commentCount) : 0) +
        replyCount;

      counts[node.title] = Number.isFinite(count) ? Math.max(0, count) : 0;
    }

    if (!discussions?.pageInfo?.hasNextPage) {
      break;
    }

    cursor = discussions.pageInfo.endCursor;

    if (!cursor) {
      break;
    }
  }

  return counts;
}

function countsCacheKey(env, sourceType, scope) {
  const { owner, repo, maxPages, categoryId, privateRepository, repositoryId } = getSourceConfig(env, sourceType, scope);
  const identifier = encodeURIComponent(JSON.stringify([owner, repo, categoryId, maxPages, privateRepository, repositoryId]));
  return new Request(`https://api.komori.cc/__cache/github-discussions/v2/${identifier}`);
}

export async function countDiscussion(github, discussionId) {
  const comments = await fetchDiscussionCommentPage({ github, discussionId, cursor: null });
  const commentCount = comments.totalCount;
  const replyCount = await fetchDiscussionReplyCount({ github, discussionId, comments });
  return { commentCount, replyCount, count: commentCount + replyCount };
}

export async function updateDiscussionCount(env, target, title, count) {
  const key = countsCacheKey(env, target.sourceType, target.countScope);
  const cached = await readGithubCache(key);
  if (!cached?.counts) return;
  cached.counts = { ...cached.counts, [title]: count, [target.term]: count };
  await writeGithubCache(key, cached, cached.retainUntil);
}

async function getCountsMap(env, github, sourceType, scope = "paragraph") {
  const { owner, repo, maxPages, categoryId, privateRepository, repositoryId } = getSourceConfig(env, sourceType, scope);
  const key = countsCacheKey(env, sourceType, scope);
  const cached = await readGithubCache(key);
  if (cached?.counts && cached.refreshAt > Date.now()) return cached.counts;

  try {
    const counts = await fetchAllDiscussionCounts({
      github, owner, repo, categoryId, maxPages, privateRepository, repositoryId,
    });
    const now = Date.now();
    await writeGithubCache(key, {
      counts, refreshAt: now + FRESH_MS, retainUntil: now + RETAIN_MS,
    }, now + RETAIN_MS);
    return counts;
  } catch (error) {
    if ([401, 403, 404].includes(error.status)) await deleteGithubCache(key);
    else if (cached?.retainUntil > Date.now() && error.reason !== "configuration") {
      const refreshAt = Math.min(cached.retainUntil, error.retryAt || Date.now() + 60_000);
      await writeGithubCache(key, { ...cached, refreshAt }, cached.retainUntil);
      return cached.counts;
    }
    throw error;
  }
}

function normalizeContentCommentItems(items) {
  const normalized = [];
  const seen = new Set();

  for (const item of Array.isArray(items) ? items : []) {
    const contentId = String(item?.contentId || "").trim();
    const discussionTerm = String(item?.discussionTerm || "").trim();
    if (!contentId || !discussionTerm || seen.has(contentId)) continue;

    seen.add(contentId);
    normalized.push({ contentId, discussionTerm });
  }

  return normalized;
}

function getParagraphContentId(paragraphTerm) {
  const term = String(paragraphTerm || "");
  const separatorIndex = term.lastIndexOf("-");
  if (separatorIndex <= 0) return "";

  const paragraphIndex = term.slice(separatorIndex + 1);
  if (!/^[1-9]\d*$/.test(paragraphIndex)) return "";
  return term.slice(0, separatorIndex);
}

async function getContentCommentTotals(env, github, sourceType, contentItems) {
  const primaryScope = sourceType === "novel" ? "chapter" : "content";
  const [primaryCounts, paragraphCounts] = await Promise.all([
    getCountsMap(env, github, sourceType, primaryScope),
    getCountsMap(env, github, sourceType, "paragraph"),
  ]);
  const targetContentIds = new Set(
    contentItems.map(({ contentId }) => contentId),
  );
  const paragraphTotals = Object.fromEntries(
    contentItems.map(({ contentId }) => [contentId, 0]),
  );

  for (const [paragraphTerm, count] of Object.entries(paragraphCounts)) {
    const contentId = getParagraphContentId(paragraphTerm);
    if (!targetContentIds.has(contentId)) continue;

    const normalizedCount = Number(count);
    if (Number.isFinite(normalizedCount) && normalizedCount > 0) {
      paragraphTotals[contentId] += normalizedCount;
    }
  }

  return Object.fromEntries(
    contentItems.map(({ contentId, discussionTerm }) => {
      const primaryCount = Number(Object.hasOwn(primaryCounts, discussionTerm) ? primaryCounts[discussionTerm] : 0);
      const normalizedPrimaryCount = Number.isFinite(primaryCount)
        ? Math.max(0, primaryCount)
        : 0;
      return [
        contentId,
        normalizedPrimaryCount + paragraphTotals[contentId],
      ];
    }),
  );
}

export async function handleDiscussionCounts(request, env, corsHeaders, createClient = discussionGithub) {
  const respond = (body, status = 200, headers = {}) => Response.json(body, {
    status, headers: { ...corsHeaders, ...headers },
  });
  if (request.method !== "POST") {
    return respond(
      {
        error: "Method Not Allowed",
        message: "该接口仅接受 POST 请求。",
      },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  try {
    const body = await request.json();

    const sourceType = body?.sourceType === "novel" ? "novel" : "article";
    const scope =
      body?.scope === "content-total"
        ? "content-total"
        : sourceType === "novel" && body?.scope === "chapter"
          ? "chapter"
          : sourceType === "article" && body?.scope === "content"
            ? "content"
            : "paragraph";
    const contentItems =
      scope === "content-total"
        ? normalizeContentCommentItems(body?.contents)
        : [];

    const requestedIds = scope === "content-total"
      ? contentItems.map(({ contentId }) => contentId)
      : scope === "paragraph" ? body?.paragraphIds : body?.discussionTerms;
    const identifiers = [...new Set(
      (Array.isArray(requestedIds) ? requestedIds : [])
        .filter((id) => typeof id === "string" && id.trim()),
    )];

    if (!identifiers.length) {
      return respond({ sourceType, scope, counts: {}, cachedAt: Date.now() });
    }

    const { owner, repo } = getSourceConfig(env, sourceType, scope);
    let client;
    const github = {
      async graphql(query, variables) {
        client ||= createClient(env, `${owner}/${repo}`);
        return (await client).graphql(query, variables);
      },
    };
    const allCounts =
      scope === "content-total"
        ? await getContentCommentTotals(env, github, sourceType, contentItems)
        : await getCountsMap(env, github, sourceType, scope);
    const counts = Object.fromEntries(identifiers.map((id) => {
      const value = Number(Object.hasOwn(allCounts, id) ? allCounts[id] : 0);
      return [id, Number.isFinite(value) ? Math.max(0, value) : 0];
    }));

    return respond({ sourceType, scope, counts, cachedAt: Date.now() });
  } catch (error) {
    return respond(
      {
        error: "评论批量接口执行失败",
        message: String(error?.message || error),
      },
      error?.status === 429 || error?.reason === "rate-limit" ? 429 : error?.status || 500,
      githubErrorHeaders(error),
    );
  }
}
