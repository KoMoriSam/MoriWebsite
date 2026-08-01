import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

const HIGHLIGHT_SELECTOR = "mark[data-global-search-highlight]";
const SEARCH_ANCHOR_PREFIX = "search-content-";
const HIGHLIGHT_CLASS = "font-bold bg-primary/75! text-primary-content!";
const SCROLL_OFFSET_REM = 3;
const IGNORED_ANCESTORS =
  "script, style, noscript, textarea, input, select, option";

const decodeHash = (hash) => {
  const rawHash = String(hash || "").replace(/^#/, "");
  if (!rawHash) return "";

  try {
    return decodeURIComponent(rawHash);
  } catch {
    return rawHash;
  }
};

const queryText = (value) =>
  (Array.isArray(value) ? value : [value])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createSearchPattern = (query) => {
  const terms = [query, ...query.split(/\s+/u)]
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term, index, values) => values.indexOf(term) === index)
    .sort((a, b) => b.length - a.length);

  return terms.length
    ? new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu")
    : null;
};

const clearSearchHighlights = () => {
  if (typeof document === "undefined") return;

  const parents = new Set();
  document.querySelectorAll(HIGHLIGHT_SELECTOR).forEach((highlight) => {
    const parent = highlight.parentNode;
    if (parent) parents.add(parent);
    highlight.replaceWith(document.createTextNode(highlight.textContent || ""));
  });
  parents.forEach((parent) => parent.normalize());
};

const getHighlightRoots = (target) => {
  if (!target.id.startsWith(SEARCH_ANCHOR_PREFIX)) return [target];

  const roots = [];
  let sibling = target.nextElementSibling;

  while (sibling && !sibling.id.startsWith(SEARCH_ANCHOR_PREFIX)) {
    roots.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  return roots;
};

const collectTextNodes = (roots) => {
  const nodes = [];

  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!node.nodeValue?.trim() || !parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (
          parent.closest(IGNORED_ANCESTORS) ||
          parent.closest(HIGHLIGHT_SELECTOR)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }
  }

  return nodes;
};

const highlightTextNode = (node, pattern) => {
  const text = node.nodeValue || "";
  pattern.lastIndex = 0;
  const parts = text.split(pattern);
  if (parts.length === 1) return 0;

  const fragment = document.createDocumentFragment();
  let matchCount = 0;

  parts.forEach((part, index) => {
    if (!part) return;

    if (index % 2 === 1) {
      const mark = document.createElement("mark");
      mark.dataset.globalSearchHighlight = "true";
      mark.className = HIGHLIGHT_CLASS;
      mark.textContent = part;
      fragment.append(mark);
      matchCount += 1;
    } else {
      fragment.append(document.createTextNode(part));
    }
  });

  node.replaceWith(fragment);
  return matchCount;
};

const findFirstHighlight = (roots) => {
  for (const root of roots) {
    if (root.matches?.(HIGHLIGHT_SELECTOR)) return root;

    const highlight = root.querySelector?.(HIGHLIGHT_SELECTOR);
    if (highlight) return highlight;
  }

  return null;
};

const revealCollapsedAncestors = (target) => {
  let details = target.closest?.("details:not([open])");

  while (details) {
    details.open = true;
    details = details.parentElement?.closest?.("details:not([open])");
  }
};

const getScrollOffsetPx = () => {
  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  return (
    SCROLL_OFFSET_REM * (Number.isFinite(rootFontSize) ? rootFontSize : 16)
  );
};

export function useSearchResultHighlight() {
  const route = useRoute();
  let isMounted = false;
  let observer = null;
  let observerTimeout = 0;
  let highlightRunId = 0;

  const scrollToHighlight = (target, runId) => {
    if (!target) return;

    revealCollapsedAncestors(target);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (runId !== highlightRunId || !target.isConnected) return;

        const top = Math.max(
          0,
          window.scrollY +
            target.getBoundingClientRect().top -
            getScrollOffsetPx(),
        );
        window.scrollTo({ top, behavior: "smooth" });
      });
    });
  };

  const stopWaiting = () => {
    observer?.disconnect();
    observer = null;
    window.clearTimeout(observerTimeout);
    observerTimeout = 0;
  };

  const clearObserverTimeout = () => {
    window.clearTimeout(observerTimeout);
    observerTimeout = 0;
  };

  const tryHighlight = () => {
    const anchorId = decodeHash(route.hash);
    const query = queryText(route.query.q);
    if (!query) return { highlighted: true, target: null };

    const target = anchorId
      ? document.getElementById(anchorId)
      : document.querySelector("main");
    if (!target) return { highlighted: false, target: null };

    const pattern = createSearchPattern(query);
    if (!pattern) return { highlighted: true, target: null };

    let roots = getHighlightRoots(target);
    let matchCount = collectTextNodes(roots).reduce(
      (total, node) => total + highlightTextNode(node, pattern),
      0,
    );

    if (!matchCount && anchorId) {
      const fallbackRoot =
        target.closest("[data-reader-content]") ||
        document.querySelector("main");

      if (fallbackRoot && !roots.includes(fallbackRoot)) {
        roots = [fallbackRoot];
        matchCount = collectTextNodes([fallbackRoot]).reduce(
          (total, node) => total + highlightTextNode(node, pattern),
          0,
        );
      }
    }

    return {
      highlighted: matchCount > 0,
      target: matchCount > 0 ? findFirstHighlight(roots) : null,
    };
  };

  const observeHighlightLifecycle = ({ waiting = false } = {}) => {
    observer = new MutationObserver(() => {
      if (document.querySelector(HIGHLIGHT_SELECTOR)) return;

      observer.disconnect();
      const result = tryHighlight();
      observer.observe(document.body, { childList: true, subtree: true });

      if (result.highlighted) {
        clearObserverTimeout();
        scrollToHighlight(result.target, highlightRunId);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (waiting) {
      observerTimeout = window.setTimeout(stopWaiting, 15000);
    }
  };

  const scheduleHighlight = async () => {
    if (!isMounted || typeof document === "undefined") return;

    const runId = ++highlightRunId;
    stopWaiting();
    clearSearchHighlights();
    await nextTick();

    if (runId !== highlightRunId) return;

    const result = tryHighlight();
    scrollToHighlight(result.target, runId);
    observeHighlightLifecycle({ waiting: !result.highlighted });
  };

  const handleDocumentPointerDown = (event) => {
    if (event.target?.closest?.(HIGHLIGHT_SELECTOR)) return;
    highlightRunId += 1;
    stopWaiting();
    clearSearchHighlights();
  };

  watch(
    () => [route.path, route.hash, route.query.q, route.query.p],
    scheduleHighlight,
    { flush: "post" },
  );

  onMounted(() => {
    isMounted = true;
    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("global-search-result-opened", scheduleHighlight);
    scheduleHighlight();
  });

  onBeforeUnmount(() => {
    isMounted = false;
    highlightRunId += 1;
    stopWaiting();
    clearSearchHighlights();
    document.removeEventListener(
      "pointerdown",
      handleDocumentPointerDown,
      true,
    );
    document.removeEventListener(
      "global-search-result-opened",
      scheduleHighlight,
    );
  });
}
