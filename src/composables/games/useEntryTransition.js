import { nextTick, onBeforeUnmount, watch } from "vue";
import { useLayoutMotion } from "@/composables/layout/useLayoutMotion";

export function useEntryTransition(root, mode) {
  const motion = useLayoutMotion();
  const codeLayouts = new WeakMap();
  let revision = 0;

  function freezeCodeLayout(element) {
    const { offsetTop, offsetLeft, offsetWidth } = element;
    codeLayouts.set(element, {
      style: element.style.cssText,
      disabled: element.disabled,
      inert: element.inert,
    });
    Object.assign(element.style, {
      position: "absolute",
      top: `${offsetTop}px`,
      left: `${offsetLeft}px`,
      width: `${offsetWidth}px`,
    });
    element.disabled = true;
    element.inert = true;
  }

  function restoreCodeLayout(element) {
    const saved = codeLayouts.get(element);
    if (!saved) return;
    element.style.cssText = saved.style;
    element.disabled = saved.disabled;
    element.inert = saved.inert;
    codeLayouts.delete(element);
  }

  function capture() {
    return Object.fromEntries(["submit", "nickname", "surface", "follow"].flatMap((name) => {
      const element = root.value?.querySelector(`[data-entry-${name}]`);
      if (!element) return [];
      return [[name, {
        element,
        rect: element.getBoundingClientRect(),
      }]];
    }));
  }

  const cancel = motion.cancel;

  function animate(element, keyframes, options = {}, cleanup = () => {}) {
    if (!element?.animate) return;
    const animation = element.animate(keyframes, {
      duration: 300,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      ...options,
    });
    motion.track(animation, cleanup);
  }

  watch(mode, async () => {
    const current = ++revision;
    const before = capture();
    cancel();
    if (!before.submit || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motion.start();

    if (mode.value === "join") {
      const outgoing = before.submit.element.cloneNode(true);
      const bounds = before.submit.rect;
      outgoing.inert = true;
      outgoing.setAttribute("aria-hidden", "true");
      outgoing.removeAttribute("data-entry-submit");
      Object.assign(outgoing.style, {
        position: "fixed",
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: "20",
      });
      document.body.appendChild(outgoing);
      animate(outgoing, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        easing: "ease-out",
      }, () => {
        outgoing.remove();
      });
    }

    await nextTick();
    if (current !== revision) return;
    const after = capture();
    if (!after.submit) { motion.finish(); return; }

    if (before.follow && after.follow && after.surface) {
      const shift = before.follow.rect.top - after.follow.rect.top;
      if (Math.abs(shift) > 0.5) {
        animate(after.follow.element, [
          { transform: `translateY(${shift}px)` },
          { transform: "translateY(0)" },
        ]);
        animate(after.surface.element, [
          { clipPath: `inset(0 0 ${-shift}px 0)` },
          { clipPath: "inset(0 0 0px 0)" },
        ]);
      }
    }

    if (before.nickname && after.nickname) {
      const source = before.nickname.rect;
      const target = after.nickname.rect;
      animate(after.nickname.element, [
        { flexGrow: 0, flexShrink: 0, flexBasis: `${source.width}px`, transform: `translate(${source.left - target.left}px, ${source.top - target.top}px)` },
        { flexGrow: 0, flexShrink: 0, flexBasis: `${target.width}px`, transform: "translate(0, 0)" },
      ]);
    }
    if (mode.value === "join") {
      root.value?.querySelectorAll("[data-entry-code-reveal]").forEach((element) => {
        animate(element, [{ opacity: 0 }, { opacity: 1 }]);
      });
    } else {
      animate(after.submit.element, [{ opacity: 0 }, { opacity: 1 }]);
    }
  }, { flush: "pre" });

  onBeforeUnmount(() => {
    revision++;
    cancel();
  });

  return { freezeCodeLayout, restoreCodeLayout };
}
