const HERO_CACHE_TTL_SECONDS = 60 * 60;

const PIXABAY_RATE_LIMIT = 20;
const PIXABAY_RATE_WINDOW = 60;

const CACHE_TTL_MS = 5 * 60 * 1000;

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_USER_AGENT = "komorisam-paragraph-counts-worker/1.0";
const PIXABAY_API_ENDPOINT = "https://pixabay.com/api/";

const ANALYTICS_MAX_BODY_BYTES = 2048;
const ANALYTICS_CONTENT_ID_MAX_LENGTH = 128;
const ANALYTICS_CONTENT_BATCH_MAX = 50;
const ANALYTICS_EVENT_RETENTION_MS = 48 * 60 * 60 * 1000;
const ANALYTICS_CLEANUP_LIMIT = 5000;
const ANALYTICS_CONTENT_TYPES = new Set(["article", "novel"]);
const ANALYTICS_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const memoryCache = new Map();

function buildCorsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function normalizeOrigin(value = "") {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

async function checkPixabayRateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) {
    return true;
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const key = `pixabay:${ip}`;

  const count = Number(await env.RATE_LIMIT_KV.get(key)) || 0;

  if (count >= PIXABAY_RATE_LIMIT) {
    return false;
  }

  await env.RATE_LIMIT_KV.put(key, String(count + 1), {
    expirationTtl: PIXABAY_RATE_WINDOW,
  });

  return true;
}

async function getHeroCache(request) {
  const cache = caches.default;

  return cache.match(new Request(request.url, request));
}

async function setHeroCache(request, response) {
  const cache = caches.default;

  await cache.put(new Request(request.url, request), response.clone());
}

function resolveCorsOrigin(request, env) {
  const allowed = String(env.ALLOWED_ORIGIN || "*").trim();

  if (!allowed || allowed === "*") {
    return "*";
  }

  const requestOrigin = normalizeOrigin(request.headers.get("Origin") || "");

  const allowedOrigins = allowed
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);

  if (!allowedOrigins.length) {
    return "*";
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  /*
   * 保留你原来的行为：
   * 来源不匹配时返回第一个允许来源。
   *
   * 浏览器会因为响应头不匹配而拦截读取。
   */
  return allowedOrigins[0];
}

function jsonResponse(
  body,
  status = 200,
  corsOrigin = "*",
  additionalHeaders = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(corsOrigin),
      ...additionalHeaders,
    },
  });
}

function createAnalyticsError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function isAnalyticsOriginAllowed(request, env) {
  const configured = String(env.ALLOWED_ORIGIN || "*").trim();
  if (!configured || configured === "*") return true;

  const requestOrigin = normalizeOrigin(request.headers.get("Origin") || "");
  if (!requestOrigin) return false;

  return configured
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean)
    .includes(requestOrigin);
}

function analyticsJsonResponse(body, status, corsOrigin) {
  return jsonResponse(body, status, corsOrigin, {
    "Cache-Control": "no-store",
  });
}

async function readAnalyticsJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > ANALYTICS_MAX_BODY_BYTES
  ) {
    throw createAnalyticsError(
      "PAYLOAD_TOO_LARGE",
      "请求体不能超过 2 KB。",
      413,
    );
  }

  if (!request.body) {
    throw createAnalyticsError("INVALID_JSON", "缺少 JSON 请求体。");
  }

  const reader = request.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > ANALYTICS_MAX_BODY_BYTES) {
      await reader.cancel("analytics payload too large");
      throw createAnalyticsError(
        "PAYLOAD_TOO_LARGE",
        "请求体不能超过 2 KB。",
        413,
      );
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new TypeError("body must be an object");
    }
    return body;
  } catch {
    throw createAnalyticsError("INVALID_JSON", "请求体必须是 JSON 对象。");
  }
}

function getAnalyticsDateKey(env, date = new Date()) {
  const timeZone = String(env.ANALYTICS_TIME_ZONE || "Asia/Shanghai").trim();
  let formatter;

  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeAnalyticsContent(contentType, contentId, required = false) {
  const type = String(contentType || "").trim();
  const id = String(contentId || "").trim();

  if (!type && !id && !required) {
    return { contentType: "", contentId: "" };
  }

  if (!ANALYTICS_CONTENT_TYPES.has(type)) {
    throw createAnalyticsError(
      "INVALID_CONTENT_TYPE",
      "contentType 仅支持 article 或 novel。",
    );
  }

  if (
    !id ||
    id.length > ANALYTICS_CONTENT_ID_MAX_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(id)
  ) {
    throw createAnalyticsError(
      "INVALID_CONTENT_ID",
      "contentId 不能为空、包含控制字符或超过 128 个字符。",
    );
  }

  return { contentType: type, contentId: id };
}

function normalizeAnalyticsCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
}

function normalizeAnalyticsStatsQuery(url) {
  const contentType = String(url.searchParams.get("contentType") || "").trim();
  const requestedIds = url.searchParams.getAll("contentId");

  if (!contentType && requestedIds.length === 0) {
    return { contentType: "", contentIds: [] };
  }

  if (!ANALYTICS_CONTENT_TYPES.has(contentType)) {
    throw createAnalyticsError(
      "INVALID_CONTENT_TYPE",
      "contentType 仅支持 article 或 novel。",
    );
  }

  if (requestedIds.length > ANALYTICS_CONTENT_BATCH_MAX) {
    throw createAnalyticsError(
      "TOO_MANY_CONTENT_IDS",
      `单次最多查询 ${ANALYTICS_CONTENT_BATCH_MAX} 个 contentId。`,
    );
  }

  const contentIds = [];
  const seen = new Set();
  for (const requestedId of requestedIds) {
    const { contentId } = normalizeAnalyticsContent(
      contentType,
      requestedId,
      true,
    );
    if (seen.has(contentId)) continue;
    seen.add(contentId);
    contentIds.push(contentId);
  }

  return { contentType, contentIds };
}

function createAnalyticsSnapshot(
  results,
  { contentType = "", contentIds = [] } = {},
) {
  const totals = results[0]?.results?.[0] || {};
  const daily = results[1]?.results?.[0] || {};
  const snapshot = {
    todayVisits: normalizeAnalyticsCount(daily.visits),
    totalVisits: normalizeAnalyticsCount(totals.total_visits),
    totalReads: normalizeAnalyticsCount(totals.total_reads),
    startedAt: String(totals.started_at || ""),
  };

  let resultIndex = 2;

  if (contentType) {
    snapshot.contentTypeReads = normalizeAnalyticsCount(
      results[resultIndex]?.results?.[0]?.reads,
    );
    resultIndex += 1;
  }

  if (contentType && contentIds.length > 0) {
    const contentReadsById = Object.fromEntries(
      contentIds.map((contentId) => [contentId, 0]),
    );

    for (const row of results[resultIndex]?.results || []) {
      const contentId = String(row?.content_id || "");
      if (Object.hasOwn(contentReadsById, contentId)) {
        contentReadsById[contentId] = normalizeAnalyticsCount(row.reads);
      }
    }

    snapshot.contentReadsById = contentReadsById;
    if (contentIds.length === 1) {
      snapshot.contentReads = contentReadsById[contentIds[0]];
    }
  }

  return snapshot;
}

function createAnalyticsSnapshotStatements(
  env,
  statDate,
  contentType = "",
  contentIds = [],
) {
  const statements = [
    env.ANALYTICS_DB.prepare(
      `SELECT total_visits, total_reads, started_at
       FROM analytics_totals
       WHERE id = 1`,
    ),
    env.ANALYTICS_DB.prepare(
      `SELECT visits, reads
       FROM analytics_daily
       WHERE stat_date = ?1`,
    ).bind(statDate),
  ];

  if (contentType) {
    statements.push(
      env.ANALYTICS_DB.prepare(
        `SELECT COALESCE(SUM(reads), 0) AS reads
         FROM analytics_content
         WHERE content_type = ?1`,
      ).bind(contentType),
    );
  }

  if (contentType && contentIds.length > 0) {
    const placeholders = contentIds.map(() => "?").join(", ");
    statements.push(
      env.ANALYTICS_DB.prepare(
        `SELECT content_id, reads
         FROM analytics_content
         WHERE content_type = ? AND content_id IN (${placeholders})`,
      ).bind(contentType, ...contentIds),
    );
  }

  return statements;
}

async function handleAnalyticsStats(request, env, corsOrigin) {
  if (request.method !== "GET") {
    return analyticsJsonResponse(
      { error: "METHOD_NOT_ALLOWED", message: "该接口仅接受 GET 请求。" },
      405,
      corsOrigin,
    );
  }

  if (!isAnalyticsOriginAllowed(request, env)) {
    return analyticsJsonResponse(
      { error: "ORIGIN_NOT_ALLOWED", message: "请求来源不在允许列表中。" },
      403,
      corsOrigin,
    );
  }

  if (!env.ANALYTICS_DB) {
    return analyticsJsonResponse(
      { error: "ANALYTICS_UNAVAILABLE", message: "缺少 ANALYTICS_DB 绑定。" },
      503,
      corsOrigin,
    );
  }

  try {
    const url = new URL(request.url);
    const { contentType, contentIds } = normalizeAnalyticsStatsQuery(url);
    const statDate = getAnalyticsDateKey(env);
    const results = await env.ANALYTICS_DB.batch(
      createAnalyticsSnapshotStatements(
        env,
        statDate,
        contentType,
        contentIds,
      ),
    );

    return analyticsJsonResponse(
      createAnalyticsSnapshot(results, { contentType, contentIds }),
      200,
      corsOrigin,
    );
  } catch (error) {
    const status = Number(error?.status) || 500;
    console.error(
      JSON.stringify({
        message: "analytics stats failed",
        path: new URL(request.url).pathname,
        error: String(error?.message || error),
      }),
    );
    return analyticsJsonResponse(
      {
        error: error?.code || "ANALYTICS_STATS_FAILED",
        message:
          status >= 500 ? "暂时无法读取访问统计。" : String(error.message),
      },
      status,
      corsOrigin,
    );
  }
}

async function handleAnalyticsEvents(request, env, corsOrigin) {
  if (request.method !== "POST") {
    return analyticsJsonResponse(
      { error: "METHOD_NOT_ALLOWED", message: "该接口仅接受 POST 请求。" },
      405,
      corsOrigin,
    );
  }

  if (!isAnalyticsOriginAllowed(request, env)) {
    return analyticsJsonResponse(
      { error: "ORIGIN_NOT_ALLOWED", message: "请求来源不在允许列表中。" },
      403,
      corsOrigin,
    );
  }

  if (!env.ANALYTICS_DB) {
    return analyticsJsonResponse(
      { error: "ANALYTICS_UNAVAILABLE", message: "缺少 ANALYTICS_DB 绑定。" },
      503,
      corsOrigin,
    );
  }

  try {
    const body = await readAnalyticsJsonBody(request);
    const eventType = String(body.eventType || "").trim();
    const sessionId = String(body.sessionId || "").trim();

    if (!ANALYTICS_SESSION_ID_PATTERN.test(sessionId)) {
      throw createAnalyticsError(
        "INVALID_SESSION_ID",
        "sessionId 必须是有效的随机 UUID。",
      );
    }

    if (!["visit", "read"].includes(eventType)) {
      throw createAnalyticsError(
        "INVALID_EVENT_TYPE",
        "eventType 仅支持 visit 或 read。",
      );
    }

    const { contentType, contentId } = normalizeAnalyticsContent(
      body.contentType,
      body.contentId,
      eventType === "read",
    );
    const statDate = getAnalyticsDateKey(env);
    const createdAt = Date.now();
    const insert = env.ANALYTICS_DB.prepare(
      `INSERT OR IGNORE INTO analytics_events (
        session_id,
        event_type,
        content_type,
        content_id,
        stat_date,
        created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      sessionId,
      eventType,
      eventType === "read" ? contentType : "",
      eventType === "read" ? contentId : "",
      statDate,
      createdAt,
    );
    const results = await env.ANALYTICS_DB.batch([
      insert,
      ...createAnalyticsSnapshotStatements(
        env,
        statDate,
        eventType === "read" ? contentType : "",
        eventType === "read" ? [contentId] : [],
      ),
    ]);
    const accepted = normalizeAnalyticsCount(results[0]?.meta?.changes) > 0;

    return analyticsJsonResponse(
      {
        accepted,
        ...createAnalyticsSnapshot(results.slice(1), {
          contentType: eventType === "read" ? contentType : "",
          contentIds: eventType === "read" ? [contentId] : [],
        }),
      },
      200,
      corsOrigin,
    );
  } catch (error) {
    const status = Number(error?.status) || 500;
    console.error(
      JSON.stringify({
        message: "analytics event failed",
        path: new URL(request.url).pathname,
        error: String(error?.message || error),
      }),
    );
    return analyticsJsonResponse(
      {
        error: error?.code || "ANALYTICS_EVENT_FAILED",
        message:
          status >= 500 ? "暂时无法记录访问统计。" : String(error.message),
      },
      status,
      corsOrigin,
    );
  }
}

async function cleanupAnalyticsEvents(env) {
  if (!env.ANALYTICS_DB) return;

  const cutoff = Date.now() - ANALYTICS_EVENT_RETENTION_MS;
  const result = await env.ANALYTICS_DB.prepare(
    `DELETE FROM analytics_events
     WHERE id IN (
       SELECT id
       FROM analytics_events
       WHERE created_at < ?1
       ORDER BY created_at
       LIMIT ?2
     )`,
  )
    .bind(cutoff, ANALYTICS_CLEANUP_LIMIT)
    .run();

  console.log(
    JSON.stringify({
      message: "analytics event cleanup completed",
      changes: normalizeAnalyticsCount(result.meta?.changes),
    }),
  );
}

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

async function fetchDiscussionCategoryId({ token, owner, repo, slug }) {
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

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": GITHUB_USER_AGENT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { owner, repo, slug },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub 讨论分类查询失败：${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(
      `GitHub 讨论分类查询错误：${payload.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }

  return payload.data?.repository?.discussionCategory?.id || "";
}

async function fetchDiscussionPage({ token, owner, repo, categoryId, cursor }) {
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

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": GITHUB_USER_AGENT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        owner,
        repo,
        categoryId,
        cursor,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `GitHub GraphQL 请求失败：${response.status}${
        detail ? ` | ${detail}` : ""
      }`,
    );
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).join("; ");

    throw new Error(`GitHub GraphQL 返回错误：${message}`);
  }

  return payload.data?.repository?.discussions;
}

async function fetchDiscussionCommentPage({ token, discussionId, cursor }) {
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

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": GITHUB_USER_AGENT,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { discussionId, cursor },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub 评论回复查询失败：${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(
      `GitHub 评论回复查询错误：${payload.errors
        .map((error) => error.message)
        .join("; ")}`,
    );
  }

  return payload.data?.node?.comments;
}

function sumReplyCounts(comments) {
  return (comments?.nodes || []).reduce((total, comment) => {
    const count = Number(comment?.replies?.totalCount ?? 0);
    return total + (Number.isFinite(count) ? Math.max(0, count) : 0);
  }, 0);
}

async function fetchDiscussionReplyCount({ token, discussionId, comments }) {
  let replyCount = sumReplyCounts(comments);
  let hasNextPage = Boolean(comments?.pageInfo?.hasNextPage);
  let cursor = comments?.pageInfo?.endCursor || null;

  while (hasNextPage && cursor) {
    const nextComments = await fetchDiscussionCommentPage({
      token,
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
  token,
  owner,
  repo,
  categoryId,
  maxPages,
}) {
  const counts = {};
  let cursor = null;
  let page = 0;

  while (page < maxPages) {
    page += 1;

    const discussions = await fetchDiscussionPage({
      token,
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
            token,
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

async function getCountsMap(env, sourceType, scope = "paragraph") {
  const cacheKey = `${sourceType}:${scope}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.counts;
  }

  const sourceConfig = getSourceConfig(env, sourceType, scope);
  const { owner, repo, categorySlug, maxPages } = sourceConfig;
  let { categoryId } = sourceConfig;

  if (!owner || !repo) {
    throw new Error("缺少仓库配置");
  }

  if (!env.GITHUB_TOKEN) {
    throw new Error("缺少 GITHUB_TOKEN");
  }

  if (!categoryId && categorySlug) {
    categoryId = await fetchDiscussionCategoryId({
      token: env.GITHUB_TOKEN,
      owner,
      repo,
      slug: categorySlug,
    });
  }

  if (!categoryId) {
    throw new Error("缺少讨论分类配置");
  }

  const counts = await fetchAllDiscussionCounts({
    token: env.GITHUB_TOKEN,
    owner,
    repo,
    categoryId,
    maxPages,
  });

  memoryCache.set(cacheKey, {
    counts,
    expiresAt: now + CACHE_TTL_MS,
  });

  return counts;
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

async function getContentCommentTotals(env, sourceType, contentItems) {
  const primaryScope = sourceType === "novel" ? "chapter" : "content";
  const [primaryCounts, paragraphCounts] = await Promise.all([
    getCountsMap(env, sourceType, primaryScope),
    getCountsMap(env, sourceType, "paragraph"),
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
      const primaryCount = Number(primaryCounts[discussionTerm] ?? 0);
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

async function handleParagraphCounts(request, env, corsOrigin) {
  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method Not Allowed",
        message: "该接口仅接受 POST 请求。",
      },
      405,
      corsOrigin,
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

    const identifiers = [
      ...new Set(
        (scope === "content-total"
          ? contentItems.map(({ contentId }) => contentId)
          : scope !== "paragraph"
            ? body?.discussionTerms || []
            : body?.paragraphIds || []
        ).filter((id) => typeof id === "string" && id.trim()),
      ),
    ];

    if (!identifiers.length) {
      return jsonResponse(
        {
          sourceType,
          scope,
          counts: {},
          cachedAt: Date.now(),
        },
        200,
        corsOrigin,
      );
    }

    const allCounts =
      scope === "content-total"
        ? await getContentCommentTotals(env, sourceType, contentItems)
        : await getCountsMap(env, sourceType, scope);
    const counts = {};

    identifiers.forEach((id) => {
      const value = Number(allCounts[id] ?? 0);

      counts[id] = Number.isFinite(value) ? Math.max(0, value) : 0;
    });

    return jsonResponse(
      {
        sourceType,
        scope,
        counts,
        cachedAt: Date.now(),
      },
      200,
      corsOrigin,
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "评论批量接口执行失败",
        message: String(error?.message || error),
      },
      500,
      corsOrigin,
    );
  }
}

async function handleRandomHero(request, env, corsOrigin) {
  const cacheResponse = await getHeroCache(request);

  if (cacheResponse) {
    return cacheResponse;
  }

  const allowed = await checkPixabayRateLimit(request, env);

  if (!allowed) {
    return jsonResponse(
      {
        error: "RATE_LIMITED",
        message: "请求过于频繁，请稍后再试。",
      },
      429,
      corsOrigin,
      {
        "Retry-After": "60",
      },
    );
  }

  if (request.method !== "GET") {
    return jsonResponse(
      {
        error: "Method Not Allowed",
        message: "该接口仅接受 GET 请求。",
      },
      405,
      corsOrigin,
    );
  }

  if (!env.PIXABAY_API_KEY) {
    return jsonResponse(
      {
        error: "MISSING_PIXABAY_API_KEY",
        message: "缺少 PIXABAY_API_KEY。",
      },
      500,
      corsOrigin,
    );
  }

  const url = new URL(request.url);

  /*
   * 可通过查询参数改变关键词：
   * /random-hero?q=mountain
   */
  const query = String(url.searchParams.get("q") || "landscape nature")
    .trim()
    .slice(0, 100);

  const perPage = 50;

  /*
   * Pixabay 通常最多允许访问前 500 个结果。
   * 每页 50 条，对应最多 10 页。
   */
  const randomPage = Math.floor(Math.random() * 10) + 1;

  const params = new URLSearchParams({
    key: env.PIXABAY_API_KEY,
    q: query,
    lang: "en",
    image_type: "photo",
    orientation: "horizontal",
    category: "nature",
    min_width: "1920",
    min_height: "1080",
    safesearch: "true",
    order: "popular",
    per_page: String(perPage),
    page: String(randomPage),
  });

  try {
    let response = await fetch(`${PIXABAY_API_ENDPOINT}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const detail = await response.text();

      throw new Error(
        `Pixabay API 请求失败：${response.status}${
          detail ? ` | ${detail}` : ""
        }`,
      );
    }

    let payload = await response.json();

    /*
     * 随机页超出实际搜索页数时，回退到第一页。
     */
    if (!payload.hits?.length && randomPage !== 1) {
      params.set("page", "1");

      response = await fetch(`${PIXABAY_API_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Pixabay API 回退请求失败：${response.status}`);
      }

      payload = await response.json();
    }

    if (!Array.isArray(payload.hits) || !payload.hits.length) {
      return jsonResponse(
        {
          error: "NO_IMAGES_FOUND",
          message: "没有找到符合条件的图片。",
        },
        404,
        corsOrigin,
      );
    }

    const image = payload.hits[Math.floor(Math.random() * payload.hits.length)];

    const result = jsonResponse(
      {
        id: image.id,

        url:
          image.fullHDURL || image.largeImageURL || image.webformatURL || null,

        previewUrl: image.webformatURL || image.previewURL || null,

        pageUrl: image.pageURL,

        width: image.imageWidth,

        height: image.imageHeight,

        tags: String(image.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),

        author: {
          name: image.user || null,

          profileImageUrl: image.userImageURL || null,
        },
      },

      200,

      corsOrigin,

      {
        "Cache-Control": [
          "public",
          `max-age=${HERO_CACHE_TTL_SECONDS}`,
          `s-maxage=${HERO_CACHE_TTL_SECONDS}`,
          "stale-while-revalidate=86400",
        ].join(", "),
      },
    );

    await setHeroCache(request, result);

    return result;
  } catch (error) {
    return jsonResponse(
      {
        error: "RANDOM_HERO_FAILED",
        message: String(error?.message || error),
      },
      502,
      corsOrigin,
    );
  }
}

function handleServiceInfo(corsOrigin) {
  return jsonResponse(
    {
      ok: true,
      service: "komorisam-api",
      endpoints: {
        paragraphCounts: {
          method: "POST",
          path: "/paragraph-counts",
        },
        randomHero: {
          method: "GET",
          path: "/random-hero",
        },
        analyticsStats: {
          method: "GET",
          path: "/analytics/stats",
        },
        analyticsEvents: {
          method: "POST",
          path: "/analytics/events",
        },
      },
    },
    200,
    corsOrigin,
  );
}

export default {
  async fetch(request, env) {
    const corsOrigin = resolveCorsOrigin(request, env);
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(corsOrigin),
      });
    }

    if (pathname === "/") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "Method Not Allowed" }, 405, corsOrigin);
      }

      return handleServiceInfo(corsOrigin);
    }

    if (pathname === "/paragraph-counts" || pathname === "/para-counts") {
      return handleParagraphCounts(request, env, corsOrigin);
    }

    if (pathname === "/random-hero" || pathname === "/api/random-hero") {
      return handleRandomHero(request, env, corsOrigin);
    }

    if (pathname === "/analytics/stats") {
      return handleAnalyticsStats(request, env, corsOrigin);
    }

    if (pathname === "/analytics/events") {
      return handleAnalyticsEvents(request, env, corsOrigin);
    }

    return jsonResponse(
      {
        error: "NOT_FOUND",
        message: "接口不存在。",
        path: pathname,
      },
      404,
      corsOrigin,
    );
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      cleanupAnalyticsEvents(env).catch((error) => {
        console.error(
          JSON.stringify({
            message: "analytics event cleanup failed",
            error: String(error?.message || error),
          }),
        );
      }),
    );
  },
};
