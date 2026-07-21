import { useEventListener, useThrottleFn } from "@vueuse/core";
import { computed } from "vue";
import { useReadingStateStorage } from "@/utils/storage/new-reading-state";

const FULL_PARAGRAPH_ID_RE =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-\d+-/;

export function usePosTracker(router, onRestoreTitle, options = {}) {
  // 位置追踪依赖 window、document、requestAnimationFrame，只能在浏览器运行。
  if (
    import.meta.env.SSR ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return () => {};
  }

  // const READ_POS_KEY = "READ_POS";
  // const readPos = useStorage(READ_POS_KEY, "");
  const { getState, setState } = useReadingStateStorage();
  const readPosKey = options.readPosKey || "READ_POS";
  const readContextKey = options.readContextKey || "READ_CH_ID";
  const getContextId =
    typeof options.getContextId === "function"
      ? options.getContextId
      : () => getState(readContextKey, "");
  const getPage =
    typeof options.getPage === "function"
      ? options.getPage
      : () =>
          router.currentRoute.value.query.p ??
          router.currentRoute.value.query.page;
  const isTrackingActive =
    typeof options.isActive === "function" ? options.isActive : () => true;

  const readPos = computed({
    get: () => getState(readPosKey, ""),
    set: (value) => setState(readPosKey, value),
  });
  const readContext = computed({
    get: () => getState(readContextKey, ""),
    set: (value) => setState(readContextKey, value),
  });
  let skippedScrollUpdates = 0;
  const stopListeners = [];

  function suppressNextScrollUpdates(count = 6) {
    skippedScrollUpdates = Math.max(skippedScrollUpdates, count);
  }

  function shouldSkipCurrentScrollUpdate() {
    if (skippedScrollUpdates <= 0) {
      return false;
    }

    skippedScrollUpdates -= 1;
    return true;
  }

  const posSelector =
    options.posSelector ||
    "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], p[id]";

  function trackListener(stop) {
    if (typeof stop === "function") {
      stopListeners.push(stop);
    }
  }

  function normalizeAnchorToken(token) {
    if (token == null) return "";
    const raw = typeof token === "string" ? token : String(token);
    const withoutHash = raw.startsWith("#") ? raw.slice(1) : raw;
    if (!withoutHash) return "";

    // 兼容双重编码（如 #%25E9%2595...）: 最多解码 3 次，直到稳定或失败。
    let decoded = withoutHash;
    for (let i = 0; i < 3; i++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) {
          break;
        }
        decoded = next;
      } catch {
        break;
      }
    }

    try {
      return decoded;
    } catch {
      return decoded;
    }
  }

  function isNumericAnchor(token) {
    return /^\d+$/.test(token);
  }

  function getCurrentContextId() {
    const ctx = normalizeAnchorToken(getContextId?.());
    if (ctx) {
      return ctx;
    }

    return normalizeAnchorToken(readContext.value);
  }

  function getContextPrefix() {
    const contextId = getCurrentContextId();
    const page = String(getPage?.() ?? "").trim();
    if (!contextId || !page) {
      return "";
    }

    return `${contextId}-${page}-`;
  }

  function isContextParagraphId(token) {
    const normalizedToken = normalizeAnchorToken(token);
    if (!normalizedToken) {
      return false;
    }

    const prefix = getContextPrefix();
    if (!prefix || !normalizedToken.startsWith(prefix)) {
      return false;
    }

    const suffix = normalizedToken.slice(prefix.length);
    return /^\d+$/.test(suffix);
  }

  function syncReadContext() {
    if (!isTrackingActive()) {
      return;
    }

    const ctx = getCurrentContextId();
    if (ctx) {
      readContext.value = ctx;
    }
  }

  // 动态生成完整的段落 id
  function getFullId(anchorToken) {
    const token = normalizeAnchorToken(anchorToken);
    if (!token) return "";

    // 如果已经是完整ID格式（包含章节和页码），直接返回
    if (FULL_PARAGRAPH_ID_RE.test(token)) {
      return token;
    }

    // 非段落短ID（如脚注、标题等）直接按原样处理
    if (!isNumericAnchor(token)) {
      return token;
    }

    const chapter = getCurrentContextId(); // 从阅读状态或当前上下文获取章节/文章ID
    const page = getPage?.(); // 从当前上下文获取页码
    if (!chapter || !page) {
      return token;
    }

    return `${chapter}-${page}-${token}`; // 拼接完整的段落ID
  }

  // 提取简化的段落 id
  function getShortId(fullId) {
    const normalizedId = normalizeAnchorToken(fullId);
    if (!normalizedId) return "";

    // 非完整段落ID时，按原样保存（脚注/标题/任意锚点）
    if (
      !FULL_PARAGRAPH_ID_RE.test(normalizedId) &&
      !isContextParagraphId(normalizedId)
    ) {
      return normalizedId;
    }

    const contextPrefix = getContextPrefix();
    if (contextPrefix && normalizedId.startsWith(contextPrefix)) {
      const suffix = normalizedId.slice(contextPrefix.length);
      if (/^\d+$/.test(suffix)) {
        return suffix;
      }
    }

    const match = normalizedId.match(/-(\d+)$/);
    if (match?.[1]) {
      return match[1];
    }

    return normalizedId;
  }

  function getScrollCandidates(anchorToken) {
    const token = normalizeAnchorToken(anchorToken);
    if (!token) return [];

    const candidates = [token, encodeURIComponent(token)];
    const fullId = getFullId(token);
    if (fullId && fullId !== token) {
      candidates.unshift(fullId);
    }

    if (fullId) {
      candidates.push(encodeURIComponent(fullId));
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  function getPersistedPosToken(anchorToken) {
    const token = normalizeAnchorToken(anchorToken);
    if (!token) {
      return "";
    }

    return normalizeAnchorToken(getFullId(token) || token);
  }

  function resolveInitialAnchorToken() {
    if (!isTrackingActive()) {
      return "";
    }

    const routeHashToken = normalizeAnchorToken(router.currentRoute.value.hash);
    if (routeHashToken) {
      return routeHashToken;
    }

    const storedToken = normalizeAnchorToken(readPos.value);
    if (!storedToken) {
      return "";
    }

    if (FULL_PARAGRAPH_ID_RE.test(storedToken)) {
      return storedToken;
    }

    const storedContext = normalizeAnchorToken(readContext.value);
    const activeContext = normalizeAnchorToken(getContextId?.());

    if (storedContext && activeContext && storedContext !== activeContext) {
      return "";
    }

    return getFullId(storedToken) || storedToken;
  }

  function findAnchorElement(anchorToken) {
    const candidates = getScrollCandidates(anchorToken);
    for (const candidate of candidates) {
      const element = document.getElementById(candidate);
      if (element) {
        return { element, resolvedId: candidate };
      }
    }

    return { element: null, resolvedId: "" };
  }

  function syncRouteHash(anchorToken, suppressCount = 0) {
    const token = getShortId(anchorToken);

    const currentRawHash = window.location.hash || "";
    const currentToken = normalizeAnchorToken(
      router.currentRoute.value.hash || currentRawHash,
    );

    if (!token) {
      if (!currentRawHash) return;
      if (suppressCount > 0) {
        suppressNextScrollUpdates(suppressCount);
      }
      const urlWithoutHash = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, "", urlWithoutHash);
      return;
    }

    // token 一致且不是双重编码时不重复写入，避免无意义 replace。
    if (currentToken === token && !currentRawHash.includes("%25")) {
      return;
    }

    if (suppressCount > 0) {
      suppressNextScrollUpdates(suppressCount);
    }
    const nextUrl = `${window.location.pathname}${window.location.search}#${token}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function scrollToAnchorWithRetry(anchorToken) {
    const token = normalizeAnchorToken(anchorToken);
    if (!token) return;

    const firstTry = findAnchorElement(token);
    if (firstTry.element) {
      performScroll(firstTry.resolvedId, firstTry.element);
      return;
    }

    let retries = 0;
    const maxRetries = 8;
    const tryScroll = () => {
      const result = findAnchorElement(token);
      if (result.element) {
        performScroll(result.resolvedId, result.element);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(tryScroll, Math.min(300 + retries * 200, 1000));
      } else {
        console.warn("滚动到锚点失败：元素未找到", token);
      }
    };

    setTimeout(tryScroll, 200);
  }

  // 优先跳转到 URL hash，其次回退到 READ_POS
  function scrollToLastReadPos() {
    if (!isTrackingActive()) {
      return;
    }

    const anchorToken = resolveInitialAnchorToken();
    if (!anchorToken) return;

    scrollToAnchorWithRetry(anchorToken);
  }

  // 执行滚动操作
  function performScroll(anchorToken, el) {
    if (!isTrackingActive()) {
      return;
    }

    suppressNextScrollUpdates(8);
    const persistedPosToken = getPersistedPosToken(el?.id || anchorToken);
    const shortToken = getShortId(persistedPosToken || anchorToken);
    syncReadContext();
    readPos.value = persistedPosToken;
    syncRouteHash(shortToken, 2);
    el.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => onRestoreTitle?.(), 1000);
  }

  const updateCurrentPos = useThrottleFn(() => {
    if (!isTrackingActive() || shouldSkipCurrentScrollUpdate()) return;

    const poss = Array.from(document.querySelectorAll(posSelector));
    if (poss.length === 0) return;

    const scrollTop = window.scrollY;
    const offset = 0.25 * window.innerHeight; // 提前 25% 触发位置更新

    const firstPos = poss[0];
    const firstPosTop = firstPos.getBoundingClientRect().top + window.scrollY;

    if (scrollTop + offset >= firstPosTop) {
      for (let i = poss.length - 1; i >= 0; i--) {
        const el = poss[i];
        const top = el.getBoundingClientRect().top + window.scrollY;

        if (scrollTop + offset >= top) {
          const id = el.id;
          if (id) {
            const persistedPosToken = getPersistedPosToken(id);
            const shortId = getShortId(persistedPosToken || id);
            if (normalizeAnchorToken(readPos.value) !== persistedPosToken) {
              syncReadContext();
              readPos.value = persistedPosToken;
              // 滚动时同步 hash，保持位置可分享。
              syncRouteHash(shortId, 0);
            }
          }
          break;
        }
      }
    } else {
      // 顶部区域在无 hash 锚点时清空阅读位置，避免历史位置误恢复
      if (
        readPos.value &&
        !normalizeAnchorToken(
          router.currentRoute.value.hash || window.location.hash,
        )
      ) {
        readPos.value = "";
        syncRouteHash("", 0);
      }
    }
  }, 120);

  // 监听 hash 变化（支持任意 #id）
  trackListener(
    useEventListener(window, "hashchange", () => {
      if (!isTrackingActive()) {
        return;
      }

      const hashTarget = normalizeAnchorToken(window.location.hash);
      if (hashTarget) {
        const persistedPosToken = getPersistedPosToken(hashTarget);
        suppressNextScrollUpdates(4);
        syncReadContext();
        readPos.value = persistedPosToken;
        // 把 #%25... 规范成更短的可读 hash（如中文标题）。
        syncRouteHash(hashTarget, 1);
        scrollToAnchorWithRetry(hashTarget);
      }
    }),
  );

  // 监听点击事件，捕获页内锚点跳转
  trackListener(
    useEventListener(document, "click", (e) => {
      if (!isTrackingActive()) {
        return;
      }

      if (!(e.target instanceof Element)) return;

      const target = e.target.closest("a");
      const href = target?.getAttribute("href") || "";
      if (href.startsWith("#")) {
        const hashTarget = normalizeAnchorToken(href);
        if (!hashTarget) return;

        const persistedPosToken = getPersistedPosToken(hashTarget);
        suppressNextScrollUpdates(4);
        syncReadContext();
        readPos.value = persistedPosToken;
      }
    }),
  );

  trackListener(
    router.afterEach((to, from) => {
      if (!isTrackingActive()) {
        return;
      }

      const toPage = String(to.query?.p ?? to.query?.page ?? "");
      const fromPage = String(from.query?.p ?? from.query?.page ?? "");
      const pageChanged = toPage !== fromPage;
      const hashChanged = String(to.hash || "") !== String(from.hash || "");
      const pathChanged = String(to.path || "") !== String(from.path || "");

      if (!pageChanged && !hashChanged && !pathChanged) {
        return;
      }

      // 路由切换后重新尝试恢复，覆盖“继续阅读”等程序化跳转场景。
      suppressNextScrollUpdates(4);
      scrollToLastReadPos();
    }),
  );

  scrollToLastReadPos();
  trackListener(useEventListener(window, "scroll", updateCurrentPos));

  return () => {
    stopListeners.forEach((stop) => {
      try {
        stop();
      } catch {
        // no-op
      }
    });
  };
}
