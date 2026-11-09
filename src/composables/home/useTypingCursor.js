import { onBeforeUnmount, onMounted, watch } from "vue";
import { layoutMotionActive } from "../layout/useLayoutMotion.js";

export function useTypingCursor(scrollRef, headingRef) {
  let dispose = () => {};

  onMounted(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let viewport;
    let heading;
    let inView = false;
    let running = false;
    let frame = 0;
    let previousTyped = -1;
    let previousWidth = 0;

    function followCursor() {
      frame = 0;
      if (!running) return;
      const typed = Number.parseInt(
        getComputedStyle(heading).getPropertyValue("--typed"), 10,
      );
      const width = viewport.clientWidth;
      if (Number.isFinite(typed) && (typed !== previousTyped || width !== previousWidth)) {
        previousTyped = typed;
        previousWidth = width;
        const cursor = heading.children.item(typed);
        if (typed === 0) viewport.scrollLeft = 0;
        else if (cursor) {
          const cursorX = cursor.getBoundingClientRect().left
            - viewport.getBoundingClientRect().left + viewport.scrollLeft;
          viewport.scrollLeft = Math.max(0, cursorX - width * 0.75);
        }
      }
      frame = requestAnimationFrame(followCursor);
    }

    function syncPlayback() {
      cancelAnimationFrame(frame);
      frame = 0;
      const visible = inView && !document.hidden && !layoutMotionActive.value;
      if (heading) heading.style.animationPlayState = visible ? "running" : "paused";
      running = Boolean(visible && !reducedMotion.matches && viewport
        && viewport.scrollWidth > viewport.clientWidth);
      previousTyped = -1;
      if (reducedMotion.matches && viewport) viewport.scrollLeft = 0;
      if (running) frame = requestAnimationFrame(followCursor);
    }

    const visibility = new IntersectionObserver((entries) => {
      const entry = entries.find((entry) => entry.target === heading);
      if (!entry) return;
      inView = entry.isIntersecting;
      syncPlayback();
    });
    const resize = new ResizeObserver(syncPlayback);
    const stopTargets = watch([() => scrollRef.value?.viewport, headingRef], ([nextViewport, nextHeading]) => {
      visibility.disconnect();
      resize.disconnect();
      heading?.style.removeProperty("animation-play-state");
      viewport = nextViewport;
      heading = nextHeading;
      inView = false;
      previousWidth = 0;
      if (heading && viewport) {
        viewport.scrollLeft = 0;
        visibility.observe(heading);
        resize.observe(heading);
        resize.observe(viewport);
      }
      syncPlayback();
    }, { immediate: true, flush: "post" });
    const stopMotion = watch(layoutMotionActive, syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);

    dispose = () => {
      running = false;
      stopTargets();
      stopMotion();
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
      heading?.style.removeProperty("animation-play-state");
    };
  });

  onBeforeUnmount(() => dispose());
}
