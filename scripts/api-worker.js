const HERO_CACHE_TTL_SECONDS = 60 * 60;

const PIXABAY_RATE_LIMIT = 20;
const PIXABAY_RATE_WINDOW = 60;

const CACHE_TTL_MS = 5 * 60 * 1000;

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_USER_AGENT = "komorisam-paragraph-counts-worker/1.0";
const PIXABAY_API_ENDPOINT = "https://pixabay.com/api/";

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
      sourceType === "novel" && body?.scope === "chapter"
        ? "chapter"
        : "paragraph";

    const identifiers = [
      ...new Set(
        (scope === "chapter"
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

    const allCounts = await getCountsMap(env, sourceType, scope);
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
        error: "段评批量接口执行失败",
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
};
