import { effectScope, shallowRef, watch } from "vue";
import { useScrollEdges } from "../composables/useScrollEdges.js";
import "../assets/scroll-edge-fade.css";

// DOM-generated content (such as paginated table continuations) uses the same
// observers, edge state, backgrounds and styles as ScrollableContainer.
export const mountScrollFade = (viewport, { className = "" } = {}) => {
  const host = document.createElement("div");
  host.className = `scrollable-container relative min-h-0 min-w-0 ${className}`;
  viewport.before(host);
  host.append(viewport);
  const overlay = document.createElement("div");
  overlay.className = "scroll-edge-fade-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.scrollFadeOverlay = "";
  const layers = {};
  for (const edge of ["top", "bottom", "left", "right"]) {
    const layer = document.createElement("span");
    layer.className = `scroll-edge-fade scroll-edge-fade-${edge}`;
    layer.style.opacity = "0";
    layers[edge] = layer;
    overlay.append(layer);
  }
  host.append(overlay);
  const scope = effectScope(true);
  scope.run(() => {
    const { edgeOpacity, overlayStyle } = useScrollEdges(shallowRef(viewport), shallowRef(host));
    watch([edgeOpacity, overlayStyle], ([opacity, style]) => {
      Object.assign(overlay.style, {
        left: style.left, top: style.top, width: style.width,
        height: style.height, borderRadius: style.borderRadius,
      });
      overlay.style.setProperty("--scroll-fade-background", style["--scroll-fade-background"] || "none");
      for (const edge of Object.keys(layers)) layers[edge].style.opacity = String(opacity[edge]);
    }, { immediate: true, flush: "post" });
  });
  return {
    host,
    dispose() {
      scope.stop();
      if (viewport.parentNode === host) host.replaceWith(viewport);
      else host.remove();
    },
  };
};
