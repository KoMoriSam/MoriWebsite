import { onBeforeUnmount, onMounted } from "vue";

export const usePaginationObservers = ({
  viewportRef,
  sectionRef,
  getArticleElement,
  shouldIgnoreMutations = () => false,
  scheduleMeasure,
  scheduleViewportMeasure,
}) => {
  let resizeObserver;
  let mutationObserver;
  const takeMutationRecords = () => mutationObserver?.takeRecords();

  onMounted(() => {
    const viewport = viewportRef.value;
    if (!viewport) return;

    resizeObserver = new ResizeObserver(scheduleViewportMeasure);
    resizeObserver.observe(viewport);
    if (sectionRef.value) resizeObserver.observe(sectionRef.value);

    mutationObserver = new MutationObserver((records) => {
      if (shouldIgnoreMutations()) return;
      const article = getArticleElement();
      if (
        article &&
        records.some(
          (record) =>
            record.target === article || article.contains(record.target),
        )
      ) {
        scheduleMeasure();
      }
    });
    mutationObserver.observe(viewport, { childList: true, subtree: true });

    viewport.addEventListener("load", scheduleMeasure, true);
    document.fonts?.ready.then(scheduleMeasure);
    scheduleMeasure();
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    viewportRef.value?.removeEventListener("load", scheduleMeasure, true);
  });

  return { takeMutationRecords };
};
