import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const IDLE_TIMEOUT = 5000;
const EDGE_HEIGHT = 32;
const SWIPE_DISTANCE = 36;

export const gameNavbarMode = ref(false);

export function useMobileNavbar(navbar, enabled) {
  const mobile = ref(false);
  const visible = ref(false);
  const active = computed(() => mobile.value && enabled.value);
  let media;
  let timer;
  let gesture = null;

  function hide() {
    clearTimeout(timer);
    visible.value = false;
    gesture = null;
    if (!active.value || !navbar.value) return;
    for (const popover of navbar.value.querySelectorAll(":popover-open"))
      popover.hidePopover();
    if (navbar.value.contains(document.activeElement))
      document.activeElement.blur();
  }

  function recordActivity() {
    if (!active.value || !visible.value) return;
    clearTimeout(timer);
    timer = setTimeout(hide, IDLE_TIMEOUT);
  }

  function show() {
    if (!active.value) return;
    visible.value = true;
    recordActivity();
  }

  function handlePointerDown(event) {
    if (!active.value || !visible.value) return;
    if (!navbar.value?.contains(event.target)) hide();
    else recordActivity();
  }

  function handleFocusOut(event) {
    if (!active.value || !visible.value) return;
    if (
      navbar.value?.contains(event.target) &&
      !navbar.value.contains(event.relatedTarget)
    ) hide();
  }

  function startTouch(event) {
    gesture = null;
    if (!active.value || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (visible.value || touch.clientY <= EDGE_HEIGHT)
      gesture = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        hiding: visible.value,
      };
  }

  function moveTouch(event) {
    recordActivity();
    if (!gesture) return;
    if (event.touches.length !== 1) {
      gesture = null;
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== gesture.id) return;
    const horizontal = Math.abs(touch.clientX - gesture.x);
    const vertical = touch.clientY - gesture.y;
    if (horizontal > 12 && horizontal > Math.abs(vertical)) {
      gesture = null;
      return;
    }
    if (gesture.hiding) {
      if (-vertical >= SWIPE_DISTANCE && -vertical > horizontal * 1.5) hide();
      return;
    }
    if (vertical > 8 && vertical > horizontal && event.cancelable)
      event.preventDefault();
    if (vertical >= SWIPE_DISTANCE && vertical > horizontal * 1.5) {
      gesture = null;
      show();
    }
  }

  function endTouch() {
    gesture = null;
    recordActivity();
  }

  function updateViewport() {
    mobile.value = media.matches;
    hide();
  }

  watch(enabled, hide);

  onMounted(() => {
    media = window.matchMedia("(max-width: 1023px)");
    updateViewport();
    media.addEventListener("change", updateViewport);
    window.addEventListener("touchstart", startTouch, { passive: true, capture: true });
    window.addEventListener("touchmove", moveTouch, { passive: false, capture: true });
    window.addEventListener("touchend", endTouch, { passive: true, capture: true });
    window.addEventListener("touchcancel", endTouch, { passive: true, capture: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true, capture: true });
    window.addEventListener("pointermove", recordActivity, { passive: true, capture: true });
    window.addEventListener("scroll", recordActivity, { passive: true, capture: true });
    window.addEventListener("keydown", recordActivity, true);
    window.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("blur", hide);
  });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    media?.removeEventListener("change", updateViewport);
    window.removeEventListener("touchstart", startTouch, true);
    window.removeEventListener("touchmove", moveTouch, true);
    window.removeEventListener("touchend", endTouch, true);
    window.removeEventListener("touchcancel", endTouch, true);
    window.removeEventListener("pointerdown", handlePointerDown, true);
    window.removeEventListener("pointermove", recordActivity, true);
    window.removeEventListener("scroll", recordActivity, true);
    window.removeEventListener("keydown", recordActivity, true);
    window.removeEventListener("focusout", handleFocusOut, true);
    window.removeEventListener("blur", hide);
  });

  return { mobile, visible, show, hide };
}
