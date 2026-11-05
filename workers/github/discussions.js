import { deleteGithubCache, readGithubCache, writeGithubCache } from "./cache.js";
import { createGithubClient, githubErrorHeaders } from "./client.js";

const FRESH_MS = 5 * 60_000;
const RETAIN_MS = 60 * 60_000;

function getSourceConfig(env, sourceType, scope = "paragraph") {
  if (sourceType === "novel") {
    if (scope === "chapter") {
      return {
        owner: env.NOVEL_REPO_OWNER,
        repo: env.NOVEL_REPO_NAME,
        categoryId: env.NOVEL_CHAPTER_CATEGORY_ID,
        categorySlug: env.NOVEL_CHAPTER_CATEGORY_SLUG || "general",
        maxPages: Number(env.NOVEL_CHAPTER_MAX_PAGES || env.MAX_PAGES || 20),
      };
    }

    return {
      owner: env.NOVEL_REPO_OWNER,
      repo: env.NOVEL_REPO_NAME,
      categoryId: env.NOVEL_CATEGORY_ID,
      maxPages: Number(env.NOVEL_MAX_PAGES || env.MAX_PAGES || 20),
    };
  }

  if (scope === "content") {
    return {
      owner: env.ARTICLE_REPO_OWNER,
      repo: env.ARTICLE_REPO_NAME,
      categoryId: env.ARTICLE_CONTENT_CATEGORY_ID,
      categorySlug: env.ARTICLE_CONTENT_CATEGORY_SLUG || "announcements",
      maxPages: Number(env.ARTICLE_CONTENT_MAX_PAGES || env.MAX_PAGES || 20),
    };
  }

  return {
    owner: env.ARTICLE_REPO_OWNER,
    repo: env.ARTICLE_REPO_NAME,
    categoryId: env.ARTICLE_CATEGORY_ID,
    maxPages: Number(env.ARTICLE_MAX_PAGES || env.MAX_PAGES || 20),
  };
}

async function fetchDiscussionCategoryId({ github, owner, repo, slug }) {
  const query = `
    query(
      $owner: String!,
      $repo: String!,
      $slug: String!
    ) {
      repository(owner: $owner, name: $repo) {
        discussionCategory(slug: $slug) {
          id
        }
      }
    }
  `;

  const data = await github.graphql(query, { owner, repo, slug });
  return data.repository?.discussionCategory?.id || "";
}

async function fetchDiscussionPage({ github, owner, repo, categoryId, cursor }) {
  const query = `
    query(
      $owner: String!,
      $repo: String!,
      $categoryId: ID!,
      $cursor: String
    ) {
      repository(owner: $owner, name: $repo) {
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
  const connection = data.repository?.discussions;
  if (!connection) throw new Error("GitHub 未返回讨论计数");
  return connection;
}

async function fetchDiscussionCommentPage({ github, discussionId, cursor }) {
  const query = `
    query(
      $discussionId: ID!,
      $cursor: String
    ) {
      node(id: $discussionId) {
        ... on Discussion {
          comments(first: 100, after: $cursor) {
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

async function getCountsMap(request, env, github, sourceType, scope = "paragraph") {
  const { owner, repo, categorySlug, maxPages, categoryId } = getSourceConfig(env, sourceType, scope);
  if (!owner || !repo) throw new Error("缺少仓库配置");
  if (!categoryId && !categorySlug) throw new Error("缺少讨论分类配置");

  const identifier = encodeURIComponent(JSON.stringify([owner, repo, categoryId, categorySlug, maxPages]));
  const key = new Request(new URL(`/__cache/github-discussions/v1/${identifier}`, request.url));
  const cached = await readGithubCache(key);
  if (cached?.counts && cached.refreshAt > Date.now()) return cached.counts;

  try {
    const resolvedCategoryId = categoryId ||
      await fetchDiscussionCategoryId({ github, owner, repo, slug: categorySlug });
    if (!resolvedCategoryId) {
      throw Object.assign(new Error("缺少讨论分类配置"), { status: 404 });
    }
    const counts = await fetchAllDiscussionCounts({
      github, owner, repo, categoryId: resolvedCategoryId, maxPages,
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

async function getContentCommentTotals(request, env, github, sourceType, contentItems) {
  const primaryScope = sourceType === "novel" ? "chapter" : "content";
  const [primaryCounts, paragraphCounts] = await Promise.all([
    getCountsMap(request, env, github, sourceType, primaryScope),
    getCountsMap(request, env, github, sourceType, "paragraph"),
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

export async function handleDiscussionCounts(request, env, corsHeaders) {
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

    const github = createGithubClient(request, env);
    const allCounts =
      scope === "content-total"
        ? await getContentCommentTotals(request, env, github, sourceType, contentItems)
        : await getCountsMap(request, env, github, sourceType, scope);
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
      error?.reason === "rate-limit" ? 429 : 500,
      githubErrorHeaders(error),
    );
  }
}
