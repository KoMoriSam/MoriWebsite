<template>
  <div class="inline-flex shrink-0">
    <button
      ref="trigger"
      type="button"
      :class="triggerClass"
      :disabled="disabled"
      :aria-label="label"
      :aria-controls="id"
      :aria-expanded="open"
      :aria-haspopup="menu ? 'menu' : undefined"
      :popovertarget="id"
      @focus="openOnKeyboardFocus"
      @blur="closeOnTriggerBlur"
    >
      <slot name="trigger" />
    </button>
    <div
      :id="id"
      ref="panel"
      popover="auto"
      class="comment-surface comment-popover dropdown w-max overscroll-contain overflow-auto border border-base-300 bg-base-100 p-(--comment-inset) shadow-lg"
      :class="panelClass"
      :role="menu ? 'menu' : 'group'"
      :aria-label="label"
      @toggle="handleToggle"
      @keydown="handleMenuKey"
      @focusout="handleMenuFocusOut"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, useId } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  triggerClass: String,
  panelClass: String,
  disabled: Boolean,
  menu: Boolean,
  focusPreview: Boolean,
  placement: { type: String, default: "bottom" },
  align: { type: String, default: "end" },
});
const emit = defineEmits(["open"]);
const id = `comment-popover-${useId()}`;
const trigger = ref(null);
const panel = ref(null);
const open = ref(false);
let listeners;
let resizeObserver;
let frame;

function openOnKeyboardFocus(event) {
  if (props.focusPreview && event.target.matches(":focus-visible") &&
      !panel.value?.matches(":popover-open"))
    panel.value?.showPopover({ source: trigger.value });
}

function closeOnTriggerBlur() {
  if (props.focusPreview && panel.value?.matches(":popover-open"))
    panel.value.hidePopover();
}

function positionPanel() {
  const anchor = trigger.value;
  const content = panel.value;
  if (!anchor || !content?.matches(":popover-open")) return;

  const viewport = window.visualViewport;
  const gutter = 8;
  const gap = 4;
  const left = (viewport?.offsetLeft || 0) + gutter;
  const top = (viewport?.offsetTop || 0) + gutter;
  const right = left + (viewport?.width || document.documentElement.clientWidth) - gutter * 2;
  const bottom = top + (viewport?.height || document.documentElement.clientHeight) - gutter * 2;
  const rect = anchor.getBoundingClientRect();
  content.style.maxWidth = `${Math.max(0, right - left)}px`;

  const below = Math.max(0, bottom - Math.max(top, rect.bottom + gap));
  const above = Math.max(0, Math.min(bottom, rect.top - gap) - top);
  const naturalHeight = content.scrollHeight + content.offsetHeight - content.clientHeight;
  const preferAbove = props.placement === "top";
  const preferredSpace = preferAbove ? above : below;
  const oppositeSpace = preferAbove ? below : above;
  const placeAbove = naturalHeight <= preferredSpace || preferredSpace >= oppositeSpace
    ? preferAbove
    : !preferAbove;
  content.style.maxHeight = `${placeAbove ? above : below}px`;

  const width = content.offsetWidth;
  const height = content.offsetHeight;
  const rtl = getComputedStyle(anchor).direction === "rtl";
  const alignLeft = (props.align === "start") !== rtl;
  const x = alignLeft ? rect.left : rect.right - width;
  const y = placeAbove ? rect.top - gap - height : rect.bottom + gap;
  content.style.left = `${Math.max(left, Math.min(right - width, x))}px`;
  content.style.top = `${Math.max(top, Math.min(bottom - height, y))}px`;
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
  resizeObserver?.disconnect();
  if (frame != null) cancelAnimationFrame(frame);
  frame = undefined;
}

function menuItems() {
  return Array.from(panel.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') || []);
}

function handleMenuKey(event) {
  if (!props.menu || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = menuItems();
  if (!items.length) return;
  event.preventDefault();
  const current = items.indexOf(document.activeElement);
  if (event.key === "Home") items[0].focus();
  else if (event.key === "End") items.at(-1).focus();
  else if (event.key === "ArrowDown") items[(current + 1) % items.length].focus();
  else items[(current <= 0 ? items.length : current) - 1].focus();
}

function handleMenuFocusOut(event) {
  const content = panel.value;
  if (props.menu && content?.matches(":popover-open") && event.relatedTarget &&
      !content.contains(event.relatedTarget)) content.hidePopover();
}

function handleToggle(event) {
  if (!panel.value || !trigger.value) return;
  open.value = event.newState === "open";
  stopPositioning();
  if (!open.value) {
    panel.value.style.visibility = "";
    return;
  }

  positionPanel();
  if (props.menu) menuItems()[0]?.focus({ preventScroll: true });
  listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  window.addEventListener("resize", schedulePosition, options);
  window.addEventListener("scroll", schedulePosition, { ...options, capture: true });
  window.visualViewport?.addEventListener("resize", schedulePosition, options);
  window.visualViewport?.addEventListener("scroll", schedulePosition, options);
  resizeObserver = new ResizeObserver(schedulePosition);
  resizeObserver.observe(trigger.value);
  resizeObserver.observe(panel.value);
  emit("open");
}

function close() {
  if (!panel.value?.matches(":popover-open")) return;
  const focusWasInside = panel.value.contains(document.activeElement);
  panel.value.hidePopover();
  if (focusWasInside) trigger.value?.focus({ preventScroll: true });
}

onBeforeUnmount(stopPositioning);
defineExpose({ close });
</script>

<style scoped>
.comment-popover {
  position: fixed;
  position-area: none;
  inset: auto;
  margin: 0;
  visibility: hidden;
}

.comment-popover:not(:popover-open) {
  display: none;
}

.comment-popover::backdrop {
  background: transparent;
}
</style>
