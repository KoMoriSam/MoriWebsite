import { nextTick, onBeforeUnmount, watch } from "vue";
import { useLayoutMotion } from "@/composables/layout/useLayoutMotion";

export function useMobileTocTransition(root, body, compact) {
  const motion = useLayoutMotion();
  let revision = 0;
  const capture = () => {
    const element = root.value;
    if (!element?.getClientRects().length || !body.value) return null;
    return {
      root: element.getBoundingClientRect(),
      body: body.value.getBoundingClientRect(),
      parts: ["backdrop", "surface", "label", "track"].flatMap(name => {
        const part = element.querySelector(`[data-mobile-toc-${name}]`);
        return part ? [{
          name,
          element: part,
          rect: part.getBoundingClientRect(),
          opacity: Number(getComputedStyle(part).opacity),
        }] : [];
      }),
    };
  };

  watch(compact, async () => {
    const current = ++revision;
    const before = capture();
    motion.cancel();
    if (!before || !root.value.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motion.start();
    await nextTick();
    if (current !== revision) return;
    const after = capture();
    if (!after) { motion.finish(); return; }

    // Commit the final layout once; move real elements without resizing the article each frame.
    const animations = [];
    const origins = new Map();
    const animate = (element, frames) => {
      origins.set(element, element.style.transformOrigin);
      element.style.transformOrigin = "0 0";
      const animation = new Animation(new KeyframeEffect(element, frames, {
        duration: 350, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both",
      }), document.timeline);
      animations.push(animation);
    };
    animate(root.value, [
      { transform: `translateY(${before.root.top - after.root.top}px)` },
      { transform: "translateY(0)" },
    ]);
    animate(body.value, [
      { transform: `translateY(${before.body.top - after.body.top}px)` },
      { transform: "translateY(0)" },
    ]);
    for (const target of after.parts) {
      const source = before.parts.find(part => part.element === target.element);
      if (!source || !target.rect.width || !target.rect.height) continue;
      const x = (source.rect.left - before.root.left) - (target.rect.left - after.root.left);
      const y = (source.rect.top - before.root.top) - (target.rect.top - after.root.top);
      if (["backdrop", "surface"].includes(target.name)) {
        // These empty, contained absolute layers resize without stretching borders or relaying out the article.
        animate(target.element, [
          { transform: `translate(${x}px, ${y}px)`, width: `${source.rect.width}px`, height: `${source.rect.height}px`, opacity: source.opacity },
          { transform: "translate(0, 0)", width: `${target.rect.width}px`, height: `${target.rect.height}px`, opacity: target.opacity },
        ]);
        continue;
      }
      const scaleX = target.name === "label" ? 1 : source.rect.width / target.rect.width;
      animate(target.element, [
        { transform: `translate(${x}px, ${y}px) scale(${scaleX}, 1)`, opacity: source.opacity },
        { transform: "translate(0, 0) scale(1, 1)", opacity: target.opacity },
      ]);
    }
    // Pending play operations resolve together on the next render, after all preparation.
    for (const animation of animations) animation.play();
    motion.track({
      finished: Promise.all(animations.map(animation => animation.finished)),
      cancel: () => animations.forEach(animation => animation.cancel()),
    }, () => {
      for (const [element, origin] of origins) element.style.transformOrigin = origin;
      if (root.value?.isConnected) void root.value.offsetHeight;
      animations.forEach(animation => animation.cancel());
    });
  }, { flush: "pre" });

  onBeforeUnmount(() => { revision++; });
}
