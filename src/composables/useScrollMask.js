import { computed, onBeforeUnmount, ref, watch } from "vue";

export const useScrollMask = (elementRef) => {
  const mask = ref({
    top: false,
    bottom: false,
  });

  let observedElement = null;
  let resizeObserver = null;
  let mutationObserver = null;
  let maskFrame = 0;

  const resetMask = () => {
    mask.value = {
      top: false,
      bottom: false,
    };
  };

  const updateMask = () => {
    const element = observedElement;
    if (!element || !element.isConnected) {
      resetMask();
      return;
    }

    const maxScrollTop = Math.max(
      element.scrollHeight - element.clientHeight,
      0,
    );
    const hasOverflow = maxScrollTop > 1;
    const scrollTop = Math.max(0, element.scrollTop);
    const nextMask = {
      top: hasOverflow && scrollTop > 1,
      bottom: hasOverflow && scrollTop < maxScrollTop - 1,
    };

    if (
      mask.value.top !== nextMask.top ||
      mask.value.bottom !== nextMask.bottom
    ) {
      mask.value = nextMask;
    }
  };

  const scheduleMaskUpdate = () => {
    if (maskFrame || typeof window === "undefined") return;

    maskFrame = window.requestAnimationFrame(() => {
      maskFrame = 0;
      updateMask();
    });
  };

  const syncResizeTargets = () => {
    if (!observedElement || !resizeObserver) return;

    resizeObserver.disconnect();
    resizeObserver.observe(observedElement);
    Array.from(observedElement.children).forEach((child) => {
      resizeObserver.observe(child);
    });
  };

  const detachElement = (element = observedElement) => {
    if (element) {
      element.removeEventListener("scroll", scheduleMaskUpdate);
      element.removeEventListener("load", scheduleMaskUpdate, true);
    }

    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = null;
    mutationObserver = null;
    observedElement = null;
    resetMask();
  };

  const attachElement = (element) => {
    if (!element) return;

    observedElement = element;
    element.addEventListener("scroll", scheduleMaskUpdate, { passive: true });
    element.addEventListener("load", scheduleMaskUpdate, true);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleMaskUpdate);
      syncResizeTargets();
    }

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        syncResizeTargets();
        scheduleMaskUpdate();
      });
      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src"],
        characterData: true,
      });
    }

    scheduleMaskUpdate();
  };

  watch(
    elementRef,
    (element, oldElement) => {
      if (oldElement) detachElement(oldElement);
      if (element) attachElement(element);
    },
    { flush: "post" },
  );

  onBeforeUnmount(() => {
    detachElement();
    if (maskFrame && typeof window !== "undefined") {
      window.cancelAnimationFrame(maskFrame);
      maskFrame = 0;
    }
  });

  const maskImage = computed(() => {
    const { top, bottom } = mask.value;

    if (top && bottom) {
      return "linear-gradient(to bottom, transparent 0, black 2rem, black calc(100% - 2rem), transparent 100%)";
    }

    if (top) {
      return "linear-gradient(to bottom, transparent 0, black 2rem, black 100%)";
    }

    if (bottom) {
      return "linear-gradient(to bottom, black 0, black calc(100% - 2rem), transparent 100%)";
    }

    return "none";
  });

  return {
    maskImage,
  };
};
