<template>
  <TransitionGroup name="toast">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      role="alert"
      :tabindex="canDismissBody(toast) ? 0 : undefined"
      @click="dismissBody($event, toast)"
      @keydown="dismissKey($event, toast)"
      :class="[
        'flex w-fit max-w-full items-center gap-1 rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content shadow-sm transition-opacity duration-300 sm:gap-2 sm:px-4 sm:py-3',
        {
          'opacity-0': toast.fading,
          'cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2':
            canDismissBody(toast),
          'pr-1.5 sm:pr-2': toast.closable,
        },
      ]"
    >
      <i
        v-if="toast.icon"
        :class="[toast.icon, 'shrink-0 text-base', iconColors[toast.type]]"
      ></i>
      <span class="min-w-0 flex-1 wrap-anywhere">{{ toast.message }}</span>
      <button
        v-if="toast.closable"
        type="button"
        :aria-label="localizeText('关闭')"
        class="btn btn-circle btn-ghost btn-xs shrink-0 text-current"
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

const iconColors = {
  info: "text-info",
  loading: "text-info",
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
};

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

const interactive =
  'a,button,input,select,textarea,label,summary,[role],[tabindex],[contenteditable]:not([contenteditable="false"]),[data-toast-interactive]';
const canDismissBody = (toast) => !toast.closable && toast.type !== "loading";
const dismissBody = (event, toast) => {
  if (!canDismissBody(toast) || event.defaultPrevented) return;
  const path = event.composedPath();
  for (const element of path) {
    if (element === event.currentTarget) break;
    if (element.matches?.(interactive)) return;
  }
  handleClose(toast);
};
const dismissKey = (event, toast) => {
  if (
    !canDismissBody(toast) ||
    event.defaultPrevented ||
    event.target !== event.currentTarget ||
    !["Enter", " "].includes(event.key)
  )
    return;
  event.preventDefault();
  handleClose(toast);
};
</script>
