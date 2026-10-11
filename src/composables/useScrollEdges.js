import { computed, onScopeDispose, ref, watch } from "vue";

const emptyEdges = () => ({ top: false, bottom: false, left: false, right: false });
const scrollable = (overflow) => /^(auto|scroll|overlay)$/.test(overflow);

export const useScrollEdges = (viewportRef, hostRef) => {
  const edges = ref(emptyEdges());
  // Keep the cue at full strength while content remains hidden. Only change
  // the target opacity at the boundary; the component handles the transition.
  const edgeOpacity = computed(() => Object.fromEntries(
    Object.entries(edges.value).map(([edge, visible]) => [edge, visible ? 1 : 0]),
  ));
  const overlayStyle = ref({});
  let dispose = () => {};
  let refreshViewport = () => {};

  watch([viewportRef, hostRef], ([viewport, host]) => {
    dispose();
    edges.value = emptyEdges();
    if (!viewport || !host || typeof window === "undefined") return;

    let frame = 0;
    let disposed = false;
    let appearanceDirty = true;
    let backgroundImage = "";
    const resizeTargets = new Set();
    let ancestors = [];

    const syncAncestors = () => {
      const next = [];
      for (let node = viewport; node; node = node.parentElement) next.push(node);
      if (next.length === ancestors.length && next.every((node, index) => node === ancestors[index])) return;
      ancestors = next;
      appearanceObserver.disconnect();
      for (const ancestor of ancestors.slice(1)) {
        appearanceObserver.observe(ancestor, {
          attributes: true,
          attributeFilter: ["class", "style", "hidden", "open", "dir", "lang", "data-theme"],
        });
      }
    };

    const update = () => {
      if (!viewport.isConnected || !viewport.clientWidth || !viewport.clientHeight) {
        if (Object.values(edges.value).some(Boolean)) edges.value = emptyEdges();
        return;
      }

      const style = getComputedStyle(viewport);
      const maxY = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const maxX = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      // Modern browsers use negative scrollLeft for RTL. Clamp elastic overscroll.
      const x = Math.min(maxX, Math.max(0,
        style.direction === "rtl" ? maxX + viewport.scrollLeft : viewport.scrollLeft,
      ));
      const y = Math.min(maxY, Math.max(0, viewport.scrollTop));
      const vertical = scrollable(style.overflowY) && maxY > 1;
      const horizontal = scrollable(style.overflowX) && maxX > 1;
      const next = {
        top: vertical && y > 1,
        bottom: vertical && y < maxY - 1,
        left: horizontal && x > 1,
        right: horizontal && x < maxX - 1,
      };
      if (Object.keys(next).some((edge) => next[edge] !== edges.value[edge])) {
        edges.value = next;
      }
      if (appearanceDirty) {
        // Stack translucent surface colors over their ancestors, just as the
        // browser does. Theme colors stay in CSS, including base-200/70 cards.
        const layers = [];
        for (const node of ancestors) {
          const color = getComputedStyle(node).backgroundColor;
          if (color === "transparent" || color === "rgba(0, 0, 0, 0)") continue;
          layers.push(`linear-gradient(${color}, ${color})`);
          if (!color.includes("/") && !color.startsWith("rgba(")) break;
        }
        backgroundImage = layers.join(", ") || "linear-gradient(var(--color-base-100), var(--color-base-100))";
        appearanceDirty = false;
      }
      const nextStyle = {
        left: `${viewport.offsetLeft + viewport.clientLeft}px`,
        top: `${viewport.offsetTop + viewport.clientTop}px`,
        width: `${viewport.clientWidth}px`,
        height: `${viewport.clientHeight}px`,
        borderRadius: style.borderRadius,
        "--scroll-fade-background": backgroundImage,
      };
      if (Object.keys(nextStyle).some((key) => overlayStyle.value[key] !== nextStyle[key])) {
        overlayStyle.value = nextStyle;
      }
    };

    const schedule = () => {
      if (disposed || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const refresh = () => {
      syncAncestors();
      appearanceDirty = true;
      schedule();
    };
    const resizeObserver = new ResizeObserver(refresh);
    const syncResizeTargets = () => {
      // Nested fixed-size children can overflow without resizing their parent.
      const nextTargets = new Set([host, viewport, ...viewport.querySelectorAll("*")]);
      for (const target of resizeTargets) {
        if (!nextTargets.has(target)) {
          resizeObserver.unobserve(target);
          resizeTargets.delete(target);
        }
      }
      for (const target of nextTargets) {
        if (!resizeTargets.has(target)) {
          resizeObserver.observe(target);
          resizeTargets.add(target);
        }
      }
    };
    syncResizeTargets();

    const contentObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) syncResizeTargets();
      refresh();
    });
    contentObserver.observe(viewport, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["class", "style", "hidden", "open", "dir", "lang", "src", "width", "height", "data-theme"],
    });
    const appearanceObserver = new MutationObserver(refresh);
    const finishAppearanceChange = (event) => {
      if (ancestors.includes(event.target) || viewport.contains(event.target)) refresh();
    };
    refreshViewport = refresh;

    viewport.addEventListener("scroll", schedule, { passive: true });
    viewport.addEventListener("load", refresh, true);
    document.addEventListener("transitionend", finishAppearanceChange, true);
    document.addEventListener("animationend", finishAppearanceChange, true);
    window.addEventListener("resize", refresh);
    document.fonts?.addEventListener("loadingdone", refresh);
    document.fonts?.ready.then(() => { if (!disposed) refresh(); });
    refresh();

    dispose = () => {
      disposed = true;
      refreshViewport = () => {};
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      appearanceObserver.disconnect();
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("load", refresh, true);
      document.removeEventListener("transitionend", finishAppearanceChange, true);
      document.removeEventListener("animationend", finishAppearanceChange, true);
      window.removeEventListener("resize", refresh);
      document.fonts?.removeEventListener("loadingdone", refresh);
    };
  }, { immediate: true, flush: "post" });

  onScopeDispose(() => dispose());
  return { edges, edgeOpacity, overlayStyle, refresh: () => refreshViewport() };
};
