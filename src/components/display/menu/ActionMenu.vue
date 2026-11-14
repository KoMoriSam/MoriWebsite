<template>
  <Popover
    v-if="menuGroups.length"
    ref="popover"
    popup="menu"
    :panel-class="['flex flex-col select-none overflow-hidden!', horizontal ? 'p-1' : '', panelClass]"
    :label="label"
    :disabled="disabled"
    :trigger-class="triggerClass"
    :placement="placement"
    :align="align"
    :gap="gap"
    :preserve-selection="preserveSelection"
    @open="focusMenu"
    @close="$emit('close')"
  >
    <template v-if="$slots.trigger" #trigger>
      <slot name="trigger" />
    </template>
    <ScrollableContainer class="max-h-[inherit] flex-1">
      <ul
        ref="list"
        class="menu menu-sm w-full min-h-0 min-w-0 overscroll-contain p-0"
        :class="horizontal ? 'menu-horizontal flex-nowrap overflow-x-auto' : 'overflow-y-auto'"
        role="none"
        @keydown="navigate"
        @focusout="closeOnFocusOut"
      >
        <li v-if="title" class="menu-title break-words" role="presentation">
          {{ title }}
        </li>
        <template v-for="(group, index) in menuGroups" :key="group.items[0].id">
          <li
            v-if="index > 0"
            class="border-base-content/25"
            :class="horizontal ? 'mx-1 my-0 h-auto shrink-0 self-stretch border-s bg-transparent opacity-100' : 'mx-0 my-1 border-t'"
            role="separator"
          ></li>
          <li v-if="group.label" class="menu-title flex items-center gap-2" :class="group.tone" role="presentation">
            <i v-if="group.icon" :class="group.icon" aria-hidden="true"></i>
            {{ group.label }}
          </li>
          <li v-for="item in group.items" :key="item.id" :class="{ 'shrink-0': horizontal }" role="none">
            <component
              :is="item.href ? 'a' : 'button'"
              :type="item.href ? undefined : 'button'"
              :href="item.href"
              :target="item.href ? '_blank' : undefined"
              :rel="item.href ? 'noopener noreferrer' : undefined"
              class="rounded-inner"
              :class="[item.tone, { 'text-error': item.destructive, 'menu-active': item.active, 'ps-7': item.indented }]"
              :role="item.role ?? (item.checked === undefined ? 'menuitem' : 'menuitemcheckbox')"
              :aria-checked="item.checked"
              :disabled="item.href ? undefined : disabled || item.disabled"
              :aria-disabled="item.href && (disabled || item.disabled) ? true : undefined"
              tabindex="-1"
              @click="selectItem(item, $event)"
            >
              <i v-if="item.icon" :class="item.icon" aria-hidden="true"></i>
              {{ item.label }}
              <i
                v-if="item.checked && !item.active"
                class="ri-check-line ms-auto"
                aria-hidden="true"
              ></i>
            </component>
          </li>
        </template>
      </ul>
    </ScrollableContainer>
  </Popover>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import Popover from "./Popover.vue";

const props = defineProps({
  label: { type: String, required: true },
  groups: { type: Array, required: true },
  title: String,
  triggerClass: String,
  panelClass: String,
  disabled: Boolean,
  placement: String,
  align: String,
  gap: Number,
  preserveSelection: Boolean,
  horizontal: Boolean,
});
const emit = defineEmits(["select", "close"]);
const popover = ref(null);
const list = ref(null);
const menuGroups = computed(() => props.groups.filter((group) => group.items.length));

watch(() => props.disabled, (disabled) => {
  if (disabled) close();
});
watch(() => menuGroups.value.length, (length) => {
  if (!length) close();
});

function menuItems() {
  return Array.from(list.value?.querySelectorAll(
    '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])',
  ) ?? []);
}

function focusMenu() {
  if (props.preserveSelection) return;
  const items = menuItems();
  (items.find((item) => item.classList.contains("menu-active")) ?? items[0])
    ?.focus({ preventScroll: true });
}

function navigate(event) {
  const { key } = event;
  const rtl = props.horizontal && getComputedStyle(list.value).direction === "rtl";
  const next = props.horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
  const previous = props.horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
  if (![next, previous, "Home", "End"].includes(key)) return;
  const items = menuItems();
  if (!items.length) return;
  event.preventDefault();
  const current = items.indexOf(document.activeElement);
  if (key === "Home") items[0].focus();
  else if (key === "End") items.at(-1).focus();
  else if (key === next) items[(current + 1) % items.length].focus();
  else items[(current <= 0 ? items.length - 1 : current - 1)].focus();
}

function closeOnFocusOut(event) {
  if (!props.preserveSelection && event.relatedTarget && !list.value?.contains(event.relatedTarget))
    close();
}

function selectItem(item, event) {
  if (props.disabled || item.disabled) {
    event.preventDefault();
    return;
  }
  close();
  emit("select", item.id);
}

const show = (anchor, source) => popover.value?.show(anchor, source);
function close() {
  popover.value?.close();
}
const isOpen = () => popover.value?.isOpen() ?? false;
const contains = (target) => popover.value?.panel?.contains(target) ?? false;
defineExpose({ show, close, isOpen, contains });
</script>
