<template>
  <button
    v-if="$slots.trigger"
    ref="trigger"
    type="button"
    :class="triggerClass"
    :disabled="disabled"
    :aria-label="label"
    :aria-controls="open ? id : undefined"
    :aria-expanded="open"
    :aria-haspopup="popup"
    @click="toggle"
    @pointerenter="openOnHover"
    @pointerleave="scheduleHoverClose"
    @focus="openOnKeyboardFocus"
    @blur="closeOnTriggerBlur"
  >
    <slot name="trigger" />
  </button>
  <Teleport :to="portal">
    <Transition
      appear
      enter-active-class="motion-safe:transition motion-safe:duration-150 motion-safe:ease-out"
      enter-from-class="motion-safe:scale-95 motion-safe:opacity-0"
      leave-active-class="pointer-events-none motion-safe:transition motion-safe:duration-100 motion-safe:ease-in"
      leave-to-class="motion-safe:scale-95 motion-safe:opacity-0"
    >
      <div
        v-if="open"
        :id="id"
        ref="panel"
        class="popover-panel fixed z-[100] w-max overscroll-contain overflow-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        :class="panelClass"
        :role="popup || 'group'"
        :aria-label="label"
        :data-reader-interactive="preserveSelection || undefined"
        @pointerenter="cancelHoverClose"
        @pointerleave="scheduleHoverClose"
        @pointerdown="guardPointerDown"
        @contextmenu="guardContextMenu"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, shallowRef, useId } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  triggerClass: String,
  panelClass: [String, Array],
  disabled: Boolean,
  popup: String,
  hover: Boolean,
  preserveSelection: Boolean,
  gap: { type: Number, default: 4 },
  focusPreview: Boolean,
  placement: { type: String, default: "bottom" },
  align: {
    type: String,
    default: "end",
    validator: (value) => ["start", "center", "end"].includes(value),
  },
});
const emit = defineEmits(["open", "close"]);
const id = `popover-${useId()}`;
const trigger = ref(null);
const panel = ref(null);
const open = ref(false);
const portal = shallowRef("body");
let listeners;
let resizeObserver;
let frame;

let anchor;
let source;
let hoverTimer;
let restoringFocus = false;

function toggle() {
  if (open.value) close();
  else void show();
}

function openOnKeyboardFocus(event) {
  if (!restoringFocus && (props.focusPreview || props.hover) && event.target.matches(":focus-visible"))
    void show();
}

function closeOnTriggerBlur(event) {
  if ((props.focusPreview || props.hover) && !panel.value?.contains(event.relatedTarget))
    close();
}

function openOnHover(event) {
  if (!props.hover || event.pointerType === "touch") return;
  cancelHoverClose();
  void show();
}

function cancelHoverClose() {
  clearTimeout(hoverTimer);
}

function scheduleHoverClose(event) {
  if (!props.hover || event.pointerType === "touch") return;
  cancelHoverClose();
  hoverTimer = setTimeout(() => {
    if (!panel.value?.contains(document.activeElement) &&
        !trigger.value?.matches(":focus-visible")) close();
  }, 100);
}

function guardPointerDown(event) {
  if (!props.preserveSelection) return;
  event.stopPropagation();
  if (event.pointerType === "mouse") event.preventDefault();
}

function guardContextMenu(event) {
  if (props.preserveSelection) event.preventDefault();
}

function positionPanel() {
  const target = anchor ?? trigger.value;
  const content = panel.value;
  if (!target || !content || !open.value) return;

  const viewport = window.visualViewport;
  const gutter = 8;
  const { gap } = props;
  const left = (viewport?.offsetLeft || 0) + gutter;
  const top = (viewport?.offsetTop || 0) + gutter;
  const right =
    left +
    (viewport?.width || document.documentElement.clientWidth) -
    gutter * 2;
  const bottom =
    top +
    (viewport?.height || document.documentElement.clientHeight) -
    gutter * 2;
  const rect = target instanceof Element ? target.getBoundingClientRect() : target;
  content.style.maxWidth = `${Math.max(0, right - left)}px`;
  const rtl = getComputedStyle(source ?? trigger.value ?? content).direction === "rtl";

  if (props.placement === "side") {
    content.style.maxHeight = `${Math.max(0, bottom - top)}px`;
    const width = content.offsetWidth;
    const rightX = Math.max(left, rect.right + gap);
    const leftEdge = Math.min(right, rect.left - gap);
    const rightSpace = Math.max(0, right - rightX);
    const leftSpace = Math.max(0, leftEdge - left);
    const placeRight = rtl
      ? leftSpace < width && rightSpace > leftSpace
      : rightSpace >= width || rightSpace >= leftSpace;
    content.style.maxWidth = `${placeRight ? rightSpace : leftSpace}px`;
    const x = placeRight ? rightX : leftEdge - content.offsetWidth;
    const y = Math.max(top, Math.min(bottom - content.offsetHeight, rect.top));
    placePanel(content, x, y);
    return;
  }

  const below = Math.max(0, bottom - Math.max(top, rect.bottom + gap));
  const above = Math.max(0, Math.min(bottom, rect.top - gap) - top);
  content.style.maxHeight = "none";
  const naturalHeight = content.offsetHeight;
  const preferAbove = props.placement === "top";
  const preferredSpace = preferAbove ? above : below;
  const oppositeSpace = preferAbove ? below : above;
  const placeAbove =
    naturalHeight <= preferredSpace || preferredSpace >= oppositeSpace
      ? preferAbove
      : !preferAbove;
  content.style.maxHeight = `${placeAbove ? above : below}px`;

  const width = content.offsetWidth;
  const height = content.offsetHeight;
  const alignLeft = (props.align === "start") !== rtl;
  let x = alignLeft ? rect.left : rect.right - width;
  if (props.align === "center") x = (rect.left + rect.right - width) / 2;
  const y = placeAbove ? rect.top - gap - height : rect.bottom + gap;
  placePanel(
    content,
    Math.max(left, Math.min(right - width, x)),
    Math.max(top, Math.min(bottom - height, y)),
  );
}

function placePanel(content, x, y) {
  content.style.left = `${x}px`;
  content.style.top = `${y}px`;
  content.style.visibility = "visible";
}

function schedulePosition() {
  if (frame != null) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    positionPanel();
  });
}

function stopPositioning() {
  listeners?.abort();
  listeners = undefined;
  resizeObserver?.disconnect();
  if (frame != null) cancelAnimationFrame(frame);
  frame = undefined;
}

function observePosition() {
  positionPanel();
  listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  window.addEventListener("resize", schedulePosition, options);
  window.addEventListener("scroll", schedulePosition, {
    ...options,
    capture: true,
  });
  window.visualViewport?.addEventListener("resize", schedulePosition, options);
  window.visualViewport?.addEventListener("scroll", schedulePosition, options);
  resizeObserver = new ResizeObserver(schedulePosition);
  const target = anchor ?? trigger.value;
  if (target instanceof Element) resizeObserver.observe(target);
  resizeObserver.observe(panel.value);
  document.addEventListener("keydown", handleEscape, { signal: listeners.signal });
  if (!props.hover)
    document.addEventListener("pointerdown", handleOutsidePointerDown, {
      capture: true,
      signal: listeners.signal,
    });
  emit("open");
}

function handleOutsidePointerDown(event) {
  const path = event.composedPath();
  if (path.includes(panel.value) || path.includes(source ?? trigger.value)) return;
  const selection = props.preserveSelection && window.getSelection?.();
  if (selection && !selection.isCollapsed) return;
  close({ restoreFocus: false });
}

function handleEscape(event) {
  if (event.key === "Escape" && !event.defaultPrevented && isOpen()) {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
}

function isOpen() {
  return open.value;
}

async function show(target, invoker) {
  if (props.disabled) return;
  anchor = target;
  source = invoker ?? (target instanceof Element ? target : trigger.value);
  const dialog = (source ?? document.activeElement)?.closest("dialog[open]");
  portal.value =
    dialog?.querySelector(".modal-box") ?? dialog ?? document.fullscreenElement ?? "body";
  if (open.value && panel.value) {
    positionPanel();
    return;
  }
  open.value = true;
  await nextTick();
  if (open.value && panel.value && !listeners) observePosition();
}

function close({ restoreFocus = true } = {}) {
  if (!open.value) return;
  const focusWasInside = panel.value?.contains(document.activeElement);
  open.value = false;
  stopPositioning();
  if (restoreFocus && focusWasInside && source) {
    restoringFocus = true;
    source.focus({ preventScroll: true });
    restoringFocus = false;
  }
  emit("close");
}

onBeforeUnmount(() => {
  cancelHoverClose();
  stopPositioning();
});
defineExpose({ show, close, isOpen, panel });
</script>

<style scoped>
.popover-panel {
  --surface-radius: var(--radius-box);
  --surface-inset: calc(var(--spacing) * 2 + var(--border));
  --surface-min-radius: calc(var(--surface-radius) * 0.5);
  inset: auto;
  margin: 0;
  visibility: hidden;
}

</style>
