import { computed, nextTick, onBeforeUnmount, ref, unref } from "vue";

const valueOf = (source) =>
  typeof source === "function" ? source() : unref(source);

export const usePagedChapterTransition = ({
  chapterSnapshotRef,
  getArticleElement,
  pageGap,
  pageVerticalPadding,
  pageWidth,
  pageHeight,
  pageLineHeight,
  paragraphGap,
  footnoteReserve,
  renderedPageOffset,
  pageStride,
  fontSize,
  paginationReady,
  canCapture = () => true,
  revealDuration = 150,
  slideDuration = 220,
}) => {
  const totalReadingProgress = ref(0);
  const pendingReadingProgress = ref(0);
  const chapterSnapshotVisible = ref(false);
  const chapterSnapshotLeaving = ref(false);
  const chapterTransitionDirection = ref(0);
  const chapterNavigationPending = ref(false);
  const chapterLoadingOverlayVisible = ref(false);
  let revealTimer;

  const chapterEnterOffset = computed(() => {
    if (
      !chapterSnapshotVisible.value ||
      chapterSnapshotLeaving.value ||
      chapterTransitionDirection.value === 0
    ) {
      return 0;
    }
    return chapterTransitionDirection.value * valueOf(pageStride);
  });

  const chapterSnapshotTransform = computed(() => {
    if (!chapterSnapshotLeaving.value) return "translate3d(0, 0, 0)";
    if (chapterTransitionDirection.value > 0) {
      return `translate3d(${-valueOf(pageStride)}px, 0, 0)`;
    }
    if (chapterTransitionDirection.value < 0) {
      return `translate3d(${valueOf(pageStride)}px, 0, 0)`;
    }
    return "translate3d(0, 0, 0)";
  });

  const captureChapterSnapshot = () => {
    const snapshotLayer = chapterSnapshotRef.value;
    const article = getArticleElement();

    if (chapterSnapshotVisible.value) {
      window.clearTimeout(revealTimer);
      chapterSnapshotLeaving.value = false;
      return;
    }
    if (!snapshotLayer || !article || !valueOf(canCapture)) return;

    const snapshot = article.cloneNode(true);
    snapshot.removeAttribute("id");
    snapshot.querySelectorAll("[id]").forEach((element) => {
      element.removeAttribute("id");
    });

    const properties = {
      "--reader-page-gap": `${pageGap}px`,
      "--reader-page-width": `${valueOf(pageWidth)}px`,
      "--reader-page-height": `${valueOf(pageHeight)}px`,
      "--reader-page-line-height": `${valueOf(pageLineHeight)}px`,
      "--reader-paragraph-gap": `${valueOf(paragraphGap)}px`,
      "--reader-footnote-reserve": `${valueOf(footnoteReserve)}px`,
      "--reader-page-font-size": `${valueOf(fontSize)}px`,
      "--reader-page-padding-block": `${pageVerticalPadding}px`,
      "--reader-page-offset": `${valueOf(renderedPageOffset)}px`,
      "--reader-chapter-offset": "0px",
    };
    Object.entries(properties).forEach(([name, value]) => {
      snapshotLayer.style.setProperty(name, value);
    });
    snapshotLayer.replaceChildren(snapshot);
    chapterSnapshotLeaving.value = false;
    chapterSnapshotVisible.value = true;
  };

  const revealMeasuredChapter = async () => {
    if (!valueOf(paginationReady)) return;
    chapterLoadingOverlayVisible.value = false;
    if (!chapterSnapshotVisible.value || chapterSnapshotLeaving.value) {
      chapterNavigationPending.value = false;
      chapterTransitionDirection.value = 0;
      return;
    }

    await nextTick();
    getArticleElement()?.getBoundingClientRect();
    window.requestAnimationFrame(() => {
      totalReadingProgress.value = pendingReadingProgress.value;
      chapterSnapshotLeaving.value = true;
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        chapterSnapshotVisible.value = false;
        chapterSnapshotLeaving.value = false;
        chapterTransitionDirection.value = 0;
        chapterNavigationPending.value = false;
        chapterSnapshotRef.value?.replaceChildren();
      }, chapterTransitionDirection.value === 0 ? revealDuration : slideDuration);
    });
  };

  const beginChapterNavigation = (direction = 0) => {
    chapterNavigationPending.value = true;
    chapterLoadingOverlayVisible.value = true;
    chapterTransitionDirection.value = direction;
    captureChapterSnapshot();
  };

  const cancelChapterNavigation = () => {
    chapterNavigationPending.value = false;
    chapterLoadingOverlayVisible.value = false;
    chapterTransitionDirection.value = 0;
    void revealMeasuredChapter();
  };

  const handleReadingProgressChange = (progress) => {
    const normalized = Math.min(100, Math.max(0, Number(progress) || 0));
    pendingReadingProgress.value = normalized;
    if (!chapterSnapshotVisible.value) totalReadingProgress.value = normalized;
  };

  onBeforeUnmount(() => window.clearTimeout(revealTimer));

  return {
    beginChapterNavigation,
    cancelChapterNavigation,
    captureChapterSnapshot,
    chapterEnterOffset,
    chapterLoadingOverlayVisible,
    chapterNavigationPending,
    chapterSnapshotLeaving,
    chapterSnapshotTransform,
    chapterSnapshotVisible,
    chapterTransitionDirection,
    handleReadingProgressChange,
    pendingReadingProgress,
    revealMeasuredChapter,
    totalReadingProgress,
  };
};
