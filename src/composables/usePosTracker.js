import { useEventListener, useThrottleFn } from "@vueuse/core";
import { computed } from "vue";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";

const FULL_PARAGRAPH_ID_RE =
  /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-(\d+)$/i;
const LEGACY_PARAGRAPH_ID_RE =
  /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-\d+-(\d+)$/i;
const DEFAULT_SCROLL_OFFSET_REM = 3;
const POSITION_TRACK_THROTTLE_MS = 60;
const POSITION_SETTLE_DELAY_MS = 100;
const activePositionTrackers = new Set();

export function captureTrackedPosition() {
  for (const tracker of activePositionTrackers) {
    const snapshot = tracker.capture();
    if (snapshot) return snapshot;
  }

  return null;
}

export function restoreTrackedPosition(options = {}) {
  let restored = false;

  activePositionTrackers.forEach((tracker) => {
    restored = tracker.restore(options) || restored;
  });

  return restored;
}

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
  const readViewportKey =
    options.readViewportKey || `${readPosKey}_VIEWPORT`;
  const getContextId =
    typeof options.getContextId === "function"
      ? options.getContextId
      : () => getState(readContextKey, "");
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
  let skippedScrollResetFrame = 0;
  let skippedHashRestores = 0;
  let skippedRouteRestores = 0;
  let settledScrollTimer = 0;
  const preciseRestoreTimers = new Set();
  const stopListeners = [];

  function getScrollOffsetPx() {
    if (options.scrollOffset != null) {
      const configuredOffset = Number(options.scrollOffset);
      if (Number.isFinite(configuredOffset)) {
        return Math.max(0, configuredOffset);
      }
    }

    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    );
    return (
      DEFAULT_SCROLL_OFFSET_REM *
      (Number.isFinite(rootFontSize) ? rootFontSize : 16)
    );
  }

  function suppressNextScrollUpdates(count = 6) {
    skippedScrollUpdates = Math.max(skippedScrollUpdates, count);
    window.cancelAnimationFrame(skippedScrollResetFrame);
    skippedScrollResetFrame = window.requestAnimationFrame(() => {
      skippedScrollUpdates = 0;
    });
  }

  function getViewportBreakpoint() {
    const width = Math.max(
      Number(window.innerWidth) || 0,
      Number(document.documentElement.clientWidth) || 0,
    );

    if (width >= 1280) return "xl";
    if (width >= 1024) return "lg";
    if (width >= 768) return "md";
    return "sm";
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
    if (!contextId) return "";

    return `${contextId}-`;
  }

  function normalizeLegacyParagraphId(token) {
    const normalizedToken = normalizeAnchorToken(token);
    if (!normalizedToken) return "";

    const uuidMatch = normalizedToken.match(LEGACY_PARAGRAPH_ID_RE);
    if (uuidMatch) return `${uuidMatch[1]}-${uuidMatch[2]}`;

    return normalizedToken;
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
    const token = normalizeLegacyParagraphId(anchorToken);
    if (!token) return "";

    // 如果已经是完整 ID 格式（上下文 + 段落序号），直接返回。
    if (FULL_PARAGRAPH_ID_RE.test(token) || isContextParagraphId(token)) {
      return token;
    }

    // 非段落短ID（如脚注、标题等）直接按原样处理
    if (!isNumericAnchor(token)) {
      return token;
    }

    const chapter = getCurrentContextId();
    if (!chapter) {
      return token;
    }

    return `${chapter}-${token}`;
  }

  // 提取简化的段落 id
  function getShortId(fullId) {
    const normalizedId = normalizeLegacyParagraphId(fullId);
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

    // 不属于当前上下文的完整段落 ID 保持原样。
    if (FULL_PARAGRAPH_ID_RE.test(normalizedId)) {
      return normalizedId;
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

    const migratedToken = normalizeLegacyParagraphId(token);
    const candidates = [
      migratedToken,
      encodeURIComponent(migratedToken),
      token,
      encodeURIComponent(token),
    ];
    const fullId = getFullId(migratedToken);
    if (fullId && fullId !== token) {
      candidates.unshift(fullId);
    }

    if (fullId) {
      candidates.push(encodeURIComponent(fullId));
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  function getPersistedPosToken(anchorToken) {
    const token = normalizeLegacyParagraphId(anchorToken);
    if (!token) {
      return "";
    }

    return normalizeAnchorToken(getFullId(token) || token);
  }

  function resolveInitialAnchorToken() {
    if (!isTrackingActive()) {
      return "";
    }

    const breakpointPosition = getStoredViewportPosition();
    if (
      breakpointPosition?.anchorToken &&
      isStoredViewportContextActive(breakpointPosition)
    ) {
      return normalizeLegacyParagraphId(breakpointPosition.anchorToken);
    }

    const routeHashToken = normalizeAnchorToken(router.currentRoute.value.hash);
    if (routeHashToken) {
      return routeHashToken;
    }

    const storedToken = normalizeLegacyParagraphId(readPos.value);
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

  function getStoredViewportPosition() {
    const storedViewport = getState(readViewportKey, null);
    if (!storedViewport || typeof storedViewport !== "object") return null;

    // 兼容旧版单值结构；下一次写入时会迁移为按宽度分组的结构。
    if (storedViewport.anchorToken) return storedViewport;

    return storedViewport[getViewportBreakpoint()] ?? null;
  }

  function isStoredViewportContextActive(storedViewport) {
    const storedContext = normalizeAnchorToken(storedViewport?.contextId);
    const activeContext = getCurrentContextId();

    if (storedContext && activeContext) {
      return storedContext === activeContext;
    }

    // 旧数据没有上下文，只在锚点仍与当前阅读位置一致时使用。
    return (
      !storedContext &&
      normalizeLegacyParagraphId(storedViewport?.anchorToken) ===
        normalizeLegacyParagraphId(readPos.value)
    );
  }

  function getStoredViewportTop(anchorToken) {
    const storedViewport = getStoredViewportPosition();
    const storedAnchor = normalizeLegacyParagraphId(
      storedViewport?.anchorToken,
    );
    const resolvedAnchor = normalizeLegacyParagraphId(anchorToken);
    const viewportTop = Number(storedViewport?.viewportTop);

    if (
      !storedAnchor ||
      !isStoredViewportContextActive(storedViewport) ||
      storedAnchor !== resolvedAnchor ||
      !Number.isFinite(viewportTop)
    ) {
      return null;
    }

    return viewportTop;
  }

  function persistViewportPosition(anchorToken, element) {
    const persistedAnchor = getPersistedPosToken(anchorToken);
    if (!persistedAnchor || !element) return;

    const viewportTop = element.getBoundingClientRect().top;
    const storedViewport = getState(readViewportKey, null);
    const breakpoint = getViewportBreakpoint();
    const isLegacyViewport = Boolean(storedViewport?.anchorToken);
    const previous = isLegacyViewport
      ? storedViewport
      : storedViewport?.[breakpoint];
    if (
      normalizeLegacyParagraphId(previous?.anchorToken) === persistedAnchor &&
      Math.abs(Number(previous?.viewportTop) - viewportTop) < 0.5
    ) {
      return;
    }

    const viewportPositions =
      storedViewport && !isLegacyViewport ? { ...storedViewport } : {};
    viewportPositions[breakpoint] = {
      anchorToken: persistedAnchor,
      contextId: getCurrentContextId(),
      viewportTop,
    };
    setState(readViewportKey, viewportPositions);
  }

  function clearCurrentViewportPosition() {
    const storedViewport = getState(readViewportKey, null);
    if (!storedViewport || storedViewport.anchorToken) {
      setState(readViewportKey, null);
      return;
    }

    const viewportPositions = { ...storedViewport };
    delete viewportPositions[getViewportBreakpoint()];
    setState(
      readViewportKey,
      Object.keys(viewportPositions).length ? viewportPositions : null,
    );
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

  function cancelPreciseRestore() {
    preciseRestoreTimers.forEach((timer) => window.clearTimeout(timer));
    preciseRestoreTimers.clear();
  }

  function stabilizePreciseRestore(anchorToken, viewportTop) {
    if (!Number.isFinite(Number(viewportTop))) return;

    cancelPreciseRestore();
    [80, 240, 600].forEach((delay) => {
      const timer = window.setTimeout(() => {
        preciseRestoreTimers.delete(timer);
        const result = findAnchorElement(anchorToken);
        if (result.element) {
          performScroll(result.resolvedId, result.element, viewportTop);
        }
      }, delay);
      preciseRestoreTimers.add(timer);
    });
  }

  function capturePosition() {
    if (!isTrackingActive()) return null;

    const anchors = Array.from(document.querySelectorAll(posSelector));
    const scrollSnapshot = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
    if (anchors.length === 0) return scrollSnapshot;

    const viewportTarget = Math.min(
      Math.max(getScrollOffsetPx(), 0),
      window.innerHeight,
    );
    let anchor = anchors[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    anchors.forEach((candidate) => {
      const distance = Math.abs(
        candidate.getBoundingClientRect().top - viewportTarget,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        anchor = candidate;
      }
    });

    const anchorToken = getPersistedPosToken(anchor.id);
    if (!anchorToken) return scrollSnapshot;

    return {
      ...scrollSnapshot,
      anchorToken,
      viewportTop: anchor.getBoundingClientRect().top,
    };
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

  function scrollToAnchorWithRetry(anchorToken, viewportTop = null) {
    const token = normalizeAnchorToken(anchorToken);
    if (!token) return false;

    const firstTry = findAnchorElement(token);
    if (firstTry.element) {
      performScroll(firstTry.resolvedId, firstTry.element, viewportTop);
      stabilizePreciseRestore(token, viewportTop);
      return true;
    }

    let retries = 0;
    const maxRetries = 8;
    const tryScroll = () => {
      const result = findAnchorElement(token);
      if (result.element) {
        performScroll(result.resolvedId, result.element, viewportTop);
        stabilizePreciseRestore(token, viewportTop);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(tryScroll, Math.min(300 + retries * 200, 1000));
      } else {
        console.warn("滚动到锚点失败：元素未找到", token);
      }
    };

    setTimeout(tryScroll, 200);
    return true;
  }

  // 优先跳转到 URL hash，其次回退到 READ_POS
  function scrollToLastReadPos({
    anchorToken = "",
    viewportTop = null,
  } = {}) {
    if (!isTrackingActive()) {
      return false;
    }

    const resolvedAnchorToken =
      normalizeAnchorToken(anchorToken) || resolveInitialAnchorToken();
    if (!resolvedAnchorToken) return false;

    const resolvedViewportTop =
      viewportTop == null
        ? getStoredViewportTop(resolvedAnchorToken)
        : viewportTop;
    return scrollToAnchorWithRetry(
      resolvedAnchorToken,
      resolvedViewportTop,
    );
  }

  // 执行滚动操作
  function performScroll(anchorToken, el, viewportTop = null) {
    if (!isTrackingActive()) {
      return;
    }

    suppressNextScrollUpdates(8);
    const persistedPosToken = getPersistedPosToken(el?.id || anchorToken);
    const shortToken = getShortId(persistedPosToken || anchorToken);
    syncReadContext();
    readPos.value = persistedPosToken;
    syncRouteHash(shortToken, 2);
    const resolvedViewportTop = Number(viewportTop);
    const targetTop = Math.max(
      0,
      window.scrollY +
        el.getBoundingClientRect().top -
        (Number.isFinite(resolvedViewportTop)
          ? resolvedViewportTop
          : getScrollOffsetPx()),
    );
    const scrollingElement = document.scrollingElement;
    if (scrollingElement) scrollingElement.scrollTop = targetTop;
    else window.scrollTo(0, targetTop);
    persistViewportPosition(persistedPosToken, el);
    setTimeout(() => onRestoreTitle?.(), 1000);
  }

  const restorePosition = ({
    anchorToken = "",
    snapshot = null,
    suppressNavigationRestore = false,
  } = {}) => {
    if (suppressNavigationRestore) {
      skippedHashRestores += 1;
      skippedRouteRestores += 1;
    }

    const snapshotScrollX = Number(snapshot?.scrollX);
    const snapshotScrollY = Number(snapshot?.scrollY);
    if (
      Number.isFinite(snapshotScrollX) &&
      Number.isFinite(snapshotScrollY)
    ) {
      suppressNextScrollUpdates(8);
      const scrollingElement = document.scrollingElement;
      if (scrollingElement) {
        scrollingElement.scrollLeft = snapshotScrollX;
        scrollingElement.scrollTop = snapshotScrollY;
      } else {
        window.scrollTo(snapshotScrollX, snapshotScrollY);
      }
      return true;
    }

    return scrollToLastReadPos({
      anchorToken: snapshot?.anchorToken || anchorToken,
      viewportTop: snapshot?.viewportTop,
    });
  };

  const positionTracker = {
    capture: capturePosition,
    restore: restorePosition,
  };
  activePositionTrackers.add(positionTracker);

  const recordCurrentPos = (ignoreSuppression = false) => {
    if (
      !isTrackingActive() ||
      globalThis.__moriModalFallbackActive ||
      globalThis.__moriModalFallbackRestoring ||
      (!ignoreSuppression && shouldSkipCurrentScrollUpdate())
    ) {
      return;
    }

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
            persistViewportPosition(persistedPosToken, el);
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
        clearCurrentViewportPosition();
        syncRouteHash("", 0);
      }
    }
  };
  const updateCurrentPos = useThrottleFn(
    () => recordCurrentPos(),
    POSITION_TRACK_THROTTLE_MS,
  );
  const handleScroll = () => {
    updateCurrentPos();
    window.clearTimeout(settledScrollTimer);
    settledScrollTimer = window.setTimeout(() => {
      if (
        globalThis.__moriModalFallbackActive ||
        globalThis.__moriModalFallbackRestoring
      ) {
        return;
      }
      recordCurrentPos(true);
    }, POSITION_SETTLE_DELAY_MS);
  };
  const handleResize = () => {
    window.clearTimeout(settledScrollTimer);
    settledScrollTimer = window.setTimeout(() => {
      recordCurrentPos(true);
    }, POSITION_SETTLE_DELAY_MS);
  };

  // 监听 hash 变化（支持任意 #id）
  trackListener(
    useEventListener(window, "hashchange", () => {
      if (!isTrackingActive()) {
        return;
      }

      if (
        globalThis.__moriModalFallbackActive ||
        globalThis.__moriModalFallbackRestoring
      ) {
        return;
      }

      if (skippedHashRestores > 0) {
        skippedHashRestores -= 1;
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

      if (
        globalThis.__moriModalFallbackActive ||
        globalThis.__moriModalFallbackRestoring
      ) {
        return;
      }

      if (skippedRouteRestores > 0) {
        skippedRouteRestores -= 1;
        return;
      }

      const hashChanged = String(to.hash || "") !== String(from.hash || "");
      const pathChanged = String(to.path || "") !== String(from.path || "");

      if (!hashChanged && !pathChanged) {
        return;
      }

      // 路由切换后重新尝试恢复，覆盖“继续阅读”等程序化跳转场景。
      suppressNextScrollUpdates(4);
      scrollToLastReadPos();
    }),
  );

  scrollToLastReadPos();
  trackListener(useEventListener(window, "scroll", handleScroll));
  trackListener(useEventListener(window, "resize", handleResize));
  trackListener(
    useEventListener(window, "pagehide", () => recordCurrentPos(true)),
  );
  ["wheel", "touchstart", "pointerdown", "keydown"].forEach((eventName) => {
    trackListener(useEventListener(window, eventName, cancelPreciseRestore));
  });

  return () => {
    activePositionTrackers.delete(positionTracker);
    cancelPreciseRestore();
    window.clearTimeout(settledScrollTimer);
    window.cancelAnimationFrame(skippedScrollResetFrame);
    stopListeners.forEach((stop) => {
      try {
        stop();
      } catch {
        // no-op
      }
    });
  };
}
