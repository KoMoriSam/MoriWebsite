import { nextTick, onBeforeUnmount, toValue, watch } from "vue";

export function useHeightTransition(surface, source, { enabled = true, duration = 300 } = {}) {
  let animation;
  let revision = 0;
  let restoreOverflow = () => {};

  function cancel() {
    revision++;
    animation?.cancel();
    animation = null;
    restoreOverflow();
    restoreOverflow = () => {};
  }

  watch(source, async () => {
    const element = surface.value;
    const height = element?.getBoundingClientRect().height;
    cancel();
    const current = revision;
    if (!toValue(enabled) || !element?.animate
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    await nextTick();
    if (current !== revision || !element.isConnected) return;
    const targetHeight = element.getBoundingClientRect().height;
    const overflow = element.style.overflow;
    element.style.overflow = "hidden";
    restoreOverflow = () => { element.style.overflow = overflow; };
    animation = element.animate([
      { height: `${height}px` },
      { height: `${targetHeight}px` },
    ], { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    animation.onfinish = () => {
      if (current !== revision) return;
      animation = null;
      restoreOverflow();
      restoreOverflow = () => {};
    };
  }, { flush: "pre" });

  watch(() => toValue(enabled), cancel);
  onBeforeUnmount(cancel);
}
