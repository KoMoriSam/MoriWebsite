<template>
  <TransitionGroup name="toast">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      role="alert"
      :tabindex="toast.closable ? undefined : 0"
      @click="dismissBody($event, toast)"
      @keydown="dismissKey($event, toast)"
      :class="[
        `alert transition-opacity duration-300 shadow-sm`,
        {
          'alert-info': toast.type === 'info',
          'alert-success': toast.type === 'success',
          'alert-error': toast.type === 'error',
          'alert-warning': toast.type === 'warning',
          'alert-soft': toast.soft !== false,
          'opacity-0': toast.fading,
          'cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2': !toast.closable,
        },
      ]"
    >
      <i v-if="toast.icon" :class="[toast.icon, 'text-base']"></i>
      <span class="flex-1">{{ toast.message }}</span>
      <button
        v-if="toast.closable"
        type="button"
        :aria-label="localizeText('关闭')"
        :class="[`btn btn-circle btn-ghost btn-xs`, `btn-${toast.type}`]"
        @click="handleClose(toast)"
      >
        <i class="ri-close-line"></i>
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { useLocale } from "@/i18n";
const { text: localizeText } = useLocale();
import { DEFAULT_POSITION } from "@/constants/toast";

const props = defineProps({
  toasts: {
    type: Array,
    required: true,
    default: () => [],
  },
  position: {
    type: String,
    default: DEFAULT_POSITION,
  },
});

const emit = defineEmits(["remove"]);

const handleClose = (toast) => {
  emit("remove", toast.id, toast.position || props.position);
};

const interactive = 'a,button,input,select,textarea,label,summary,[role],[tabindex],[contenteditable]:not([contenteditable="false"]),[data-toast-interactive]';
const dismissBody = (event, toast) => {
  if (toast.closable || event.defaultPrevented) return;
  const path = event.composedPath();
  for (const element of path) {
    if (element === event.currentTarget) break;
    if (element.matches?.(interactive)) return;
  }
  handleClose(toast);
};
const dismissKey = (event, toast) => {
  if (toast.closable || event.defaultPrevented || event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  handleClose(toast);
};
</script>
