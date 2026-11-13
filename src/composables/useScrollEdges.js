import { computed, onScopeDispose, ref, watch } from "vue";
import { layoutMotionActive } from "./layout/useLayoutMotion";
import { useThemeStore } from "@/stores/themeStore";

const emptyEdges = () => ({ top: false, bottom: false, left: false, right: false });
const scrollable = (overflow) => /^(auto|scroll|overlay)$/.test(overflow);
const pixels = (value) => parseFloat(value) || 0;
// The client and scroll dimensions are rounded independently of the offset.
const edgeTolerance = 2;

export const useScrollEdges = (viewportRef, hostRef) => {
  const themes = useThemeStore();
  const edges = ref(emptyEdges());
  // Keep the cue at full strength while content remains hidden. Only change
  // the target opacity at the boundary; the component handles the transition.
  const edgeOpacity = computed(() => Object.fromEntries(
    Object.entries(edges.value).map(([edge, visible]) => [edge, visible && !layoutMotionActive.value ? 1 : 0]),
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
    let inView = false;
    let resizeTargetsDirty = true;
    let appearanceDirty = true;
    let geometryDirty = true;
    let backgroundImage = "";
    let viewportContent;
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
      if (!inView || layoutMotionActive.value) return;
      if (resizeTargetsDirty) {
        syncResizeTargets();
        syncAncestors();
        resizeTargetsDirty = false;
      }
      if (!viewport.isConnected || viewport.closest('details:not([open]), .collapse-close') || !viewport.clientWidth || !viewport.clientHeight) {
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
      const vertical = scrollable(style.overflowY) && maxY > edgeTolerance;
      const horizontal = scrollable(style.overflowX) && maxX > edgeTolerance;
      const next = {
        top: vertical && y > edgeTolerance,
        bottom: vertical && maxY - y > edgeTolerance,
        left: horizontal && x > edgeTolerance,
        right: horizontal && maxX - x > edgeTolerance,
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
      if (!geometryDirty) return;
      geometryDirty = false;
      const viewportRect = viewport.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const hostStyle = getComputedStyle(host);
      const borderLeft = pixels(style.borderLeftWidth);
      const borderTop = pixels(style.borderTopWidth);
      const hostBorderLeft = pixels(hostStyle.borderLeftWidth);
      const hostBorderTop = pixels(hostStyle.borderTopWidth);
      const gutterLeft = Math.max(0, viewport.clientLeft - Math.round(borderLeft));
      const gutterTop = Math.max(0, viewport.clientTop - Math.round(borderTop));
      // Keep fractional layout coordinates. clientLeft/clientTop are only
      // needed to detect a scrollbar gutter on the leading edge.
      const width = viewportContent
        ? viewportContent.width + pixels(style.paddingLeft) + pixels(style.paddingRight)
        : viewport.clientWidth;
      const height = viewportContent
        ? viewportContent.height + pixels(style.paddingTop) + pixels(style.paddingBottom)
        : viewport.clientHeight;
      const nextStyle = {
        left: `${viewportRect.left - hostRect.left - hostBorderLeft + borderLeft + gutterLeft}px`,
        top: `${viewportRect.top - hostRect.top - hostBorderTop + borderTop + gutterTop}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: style.borderRadius,
        cornerShape: style.getPropertyValue("corner-shape") || "round",
        "--scroll-fade-background": backgroundImage,
      };
      if (Object.keys(nextStyle).some((key) => overlayStyle.value[key] !== nextStyle[key])) {
        overlayStyle.value = nextStyle;
      }
    };

    const schedule = () => {
      if (disposed || !inView || frame || layoutMotionActive.value) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const refresh = () => {
      syncAncestors();
      appearanceDirty = true;
      geometryDirty = true;
      schedule();
    };
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === viewport) viewportContent = entry.contentRect;
      }
      geometryDirty = true;
      schedule();
    });
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
    const contentObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList")) {
        resizeTargetsDirty = true;
      }
      if (records.some((record) => record.type === "attributes" && record.target === viewport)) {
        appearanceDirty = true;
      }
      geometryDirty = true;
      schedule();
    });
    contentObserver.observe(viewport, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["class", "style", "hidden", "open", "dir", "lang", "src", "width", "height", "data-theme"],
    });
    const appearanceObserver = new MutationObserver(refresh);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) refresh();
      else {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibilityObserver.observe(viewport);
    const stopThemeWatch = watch(() => themes.resolvedTheme, refresh, { flush: "post" });
    const syncThemeAppearance = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      syncAncestors();
      appearanceDirty = true;
      geometryDirty = true;
      update();
    };
    const stopMotionWatch = watch(layoutMotionActive, (active) => {
      if (active) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else refresh();
    });
    const finishAppearanceChange = (event) => {
      if (ancestors.includes(event.target) || viewport.contains(event.target)) refresh();
    };
    refreshViewport = refresh;

    viewport.addEventListener("scroll", schedule, { passive: true });
    viewport.addEventListener("scrollend", schedule);
    viewport.addEventListener("load", refresh, true);
    document.addEventListener("transitionend", finishAppearanceChange, true);
    document.addEventListener("animationend", finishAppearanceChange, true);
    document.addEventListener("mori:theme-change", syncThemeAppearance);
    window.addEventListener("resize", refresh);
    document.fonts?.addEventListener("loadingdone", refresh);
    document.fonts?.ready.then(() => { if (!disposed) refresh(); });
    refresh();

    dispose = () => {
      disposed = true;
      stopMotionWatch();
      stopThemeWatch();
      refreshViewport = () => {};
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      contentObserver.disconnect();
      appearanceObserver.disconnect();
      viewport.removeEventListener("scroll", schedule);
      viewport.removeEventListener("scrollend", schedule);
      viewport.removeEventListener("load", refresh, true);
      document.removeEventListener("transitionend", finishAppearanceChange, true);
      document.removeEventListener("animationend", finishAppearanceChange, true);
      document.removeEventListener("mori:theme-change", syncThemeAppearance);
      window.removeEventListener("resize", refresh);
      document.fonts?.removeEventListener("loadingdone", refresh);
    };
  }, { immediate: true, flush: "post" });

  onScopeDispose(() => dispose());
  return { edges, edgeOpacity, overlayStyle, refresh: () => refreshViewport() };
};
