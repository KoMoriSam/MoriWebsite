import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from "vue";

export function useViewportSection({ target, observe = () => [], onResize } = {}) {
  const section = target ?? ref(null);
  let activate = () => {};
  let deactivate = () => {};
  let dispose = () => {};

  onMounted(() => {
    const element = section.value;
    let active = true;
    let frame = 0;
    let previousOffset;

    function update() {
      frame = 0;
      if (!active || !element.isConnected) return;
      const bottomMargin = Number.parseFloat(getComputedStyle(element).marginBottom) || 0;
      const offset = element.getBoundingClientRect().top + window.scrollY + bottomMargin;
      if (offset !== previousOffset) {
        previousOffset = offset;
        element.style.setProperty("--viewport-section-offset", `${offset}px`);
      }
      onResize?.({
        availableHeight: Number.parseFloat(getComputedStyle(element).minHeight) || 0,
      });
    }

    function scheduleUpdate() {
      if (active && !frame) frame = requestAnimationFrame(update);
    }

    const observer = new ResizeObserver(scheduleUpdate);
    [element, element.closest("main"), document.querySelector("header.navbar"), ...observe()]
      .filter(Boolean)
      .forEach((target) => observer.observe(target));
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleUpdate, { passive: true });
    activate = () => {
      active = true;
      scheduleUpdate();
    };
    deactivate = () => {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    update();
    dispose = () => {
      deactivate();
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  });

  onActivated(() => activate());
  onDeactivated(() => deactivate());
  onBeforeUnmount(() => dispose());
  return section;
}
