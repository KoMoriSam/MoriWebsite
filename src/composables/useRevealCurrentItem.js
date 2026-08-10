import { nextTick, onBeforeUnmount, toValue, watch } from "vue";

export const useRevealCurrentItem = ({
  containerRef,
  currentKey,
  enabled,
  refreshSources = [],
  selector = '[data-current="true"]',
  beforeReveal,
  edgeRatio = 0.2,
}) => {
  let revealFrame = 0;

  const revealCurrentItem = async () => {
    if (enabled && !toValue(enabled)) return;

    beforeReveal?.();
    await nextTick();

    if (typeof window === "undefined") return;
    if (revealFrame) window.cancelAnimationFrame(revealFrame);

    revealFrame = window.requestAnimationFrame(() => {
      revealFrame = 0;

      const container = containerRef.value;
      const target = container?.querySelector(selector);
      if (!container || !target || container.clientHeight <= 0) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const edgePadding = Math.min(container.clientHeight * edgeRatio, 96);
      const visibleTop = containerRect.top + edgePadding;
      const visibleBottom = containerRect.bottom - edgePadding;

      if (
        targetRect.top >= visibleTop &&
        targetRect.bottom <= visibleBottom
      ) {
        return;
      }

      const targetCenter =
        container.scrollTop +
        targetRect.top -
        containerRect.top +
        targetRect.height / 2;
      const maxScrollTop = Math.max(
        container.scrollHeight - container.clientHeight,
        0,
      );
      const nextScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, targetCenter - container.clientHeight / 2),
      );
      const prefersReducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      container.scrollTo({
        top: nextScrollTop,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  };

  watch(
    [containerRef, currentKey, ...(enabled ? [enabled] : []), ...refreshSources],
    revealCurrentItem,
    { immediate: true, flush: "post" },
  );

  onBeforeUnmount(() => {
    if (revealFrame && typeof window !== "undefined") {
      window.cancelAnimationFrame(revealFrame);
      revealFrame = 0;
    }
  });

  return {
    revealCurrentItem,
  };
};
