import { onBeforeUnmount, ref } from "vue";

export const usePagedReadingPosition = ({
  route,
  chapter,
  currentPage,
  totalPages,
  viewportRef,
  getArticleElement,
  getElementPage,
  getState,
  setState,
  legacyParagraphIdPattern,
  persistDelay = 240,
}) => {
  const restoredChapterUuid = ref("");
  let persistTimer;

  const normalizeAnchor = (anchor, chapterUuid) => {
    const token = String(anchor || "");
    if (!token) return "";
    if (/^\d+$/.test(token)) return `${chapterUuid}-${token}`;

    const legacyMatch = token.match(legacyParagraphIdPattern);
    if (legacyMatch?.[1]?.toLowerCase() === chapterUuid.toLowerCase()) {
      return `${chapterUuid}-${legacyMatch[2]}`;
    }
    return token;
  };

  const getInitialAnchor = () => {
    const chapterUuid = String(chapter.value?.uuid || "");
    const rawHash = String(route.hash || "").replace(/^#/, "");
    let decodedHash = rawHash;
    try {
      decodedHash = decodeURIComponent(rawHash);
    } catch {
      // Keep malformed legacy hashes usable as-is.
    }

    if (decodedHash) return normalizeAnchor(decodedHash, chapterUuid);

    const stored = String(getState("READ_POS", "") || "");
    const normalized = normalizeAnchor(stored, chapterUuid);
    return normalized.startsWith(`${chapterUuid}-`) ? normalized : "";
  };

  const restorePage = () => {
    const chapterUuid = String(chapter.value?.uuid || "");
    if (!chapterUuid || restoredChapterUuid.value === chapterUuid) return;

    const requestedEdge = window.history.state?.mobileReaderEdge;
    if (
      requestedEdge?.chapterUuid === chapterUuid &&
      requestedEdge?.edge === "end"
    ) {
      currentPage.value = totalPages.value;
      restoredChapterUuid.value = chapterUuid;
      const nextState = { ...window.history.state };
      delete nextState.mobileReaderEdge;
      window.history.replaceState(nextState, "");
      return;
    }

    const target = document.getElementById(getInitialAnchor());
    currentPage.value = target ? getElementPage(target) : 1;
    restoredChapterUuid.value = chapterUuid;
  };

  const findVisibleAnchor = () => {
    const viewport = viewportRef.value;
    const article = getArticleElement();
    if (!viewport || !article) return null;

    const viewportRect = viewport.getBoundingClientRect();
    const candidates = article.querySelectorAll(
      "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], p[id]",
    );
    return Array.from(candidates).find((element) =>
      Array.from(element.getClientRects()).some(
        (rect) =>
          rect.right > viewportRect.left + 4 &&
          rect.left < viewportRect.right - 4 &&
          rect.bottom > viewportRect.top + 4 &&
          rect.top < viewportRect.bottom - 4,
      ),
    );
  };

  const persistCurrentPosition = () => {
    if (currentPage.value === 1) {
      setState("READ_POS", "");
      return;
    }
    const anchor = findVisibleAnchor();
    if (anchor?.id) setState("READ_POS", anchor.id);
  };

  const persistPosition = () => {
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persistCurrentPosition, persistDelay);
  };

  const resetRestoredChapter = () => {
    restoredChapterUuid.value = "";
  };

  onBeforeUnmount(() => {
    window.clearTimeout(persistTimer);
    persistCurrentPosition();
  });

  return {
    persistCurrentPosition,
    persistPosition,
    resetRestoredChapter,
    restorePage,
    restoredChapterUuid,
  };
};
