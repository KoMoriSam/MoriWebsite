<template>
  <TransitionGroup name="toast">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      v-toast-size
      role="alert"
      :tabindex="canDismissBody(toast) ? 0 : undefined"
      @click="dismissBody($event, toast)"
      @keydown="dismissKey($event, toast)"
      :class="[
        'flex w-fit max-w-full items-center gap-1 overflow-hidden rounded-box border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content shadow-sm transition-opacity duration-300 sm:gap-2 sm:px-4 sm:py-3',
        {
          'opacity-0': toast.fading,
          'cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2':
            canDismissBody(toast),
          'pr-1.5 sm:pr-2': toast.closable,
        },
      ]"
    >
      <span
        v-if="toast.icon"
        class="grid size-4 shrink-0 place-items-center"
        aria-hidden="true"
      >
        <Transition
          enter-active-class="transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"
          enter-from-class="scale-50 -rotate-45 opacity-0"
          leave-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
          leave-to-class="scale-75 rotate-45 opacity-0"
        >
          <i
            :key="`${toast.type}:${toast.icon}`"
            :class="[
              toast.icon,
              'col-start-1 row-start-1 inline-flex size-4 items-center justify-center text-base leading-none',
              iconColors[toast.type],
            ]"
          ></i>
        </Transition>
      </span>
      <span data-toast-message class="min-w-0 flex-1 wrap-anywhere leading-6">{{ toast.message }}</span>
      <div v-if="toast.actions?.length" class="flex shrink-0 flex-wrap items-center gap-1">
        <component
          :is="action.href ? 'a' : 'button'"
          v-for="(action, index) in toast.actions"
          :key="index"
          :href="action.href || undefined"
          :title="action.description"
          :type="action.href ? undefined : 'button'"
          class="btn btn-ghost btn-xs shrink-0"
          @click="action.onClick?.()"
        >
          {{ action.label }}
        </component>
      </div>
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

// daisyUI 入场动画会缩放 toast，布局尺寸不能使用缩放后的几何边界。
const measureToast = (element) => {
  const style = getComputedStyle(element);
  return { width: parseFloat(style.width), height: parseFloat(style.height) };
};
const sizeTransitions = new WeakMap();
const vToastSize = {
  beforeUpdate(element) {
    const previous = sizeTransitions.get(element);
    const { width, height } = measureToast(element);
    previous?.animation?.cancel();
    previous?.restore?.();
    sizeTransitions.set(element, { width, height });
  },
  updated(element) {
    const previous = sizeTransitions.get(element);
    if (!previous || !element.animate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const { width, height } = measureToast(element);
    if (Math.abs(width - previous.width) < 0.5 &&
      Math.abs(height - previous.height) < 0.5) return;

    // 按最终可用宽度排版文字，外壳伸缩时只裁切，不挤压内容。
    const message = element.querySelector("[data-toast-message]");
    const messageWidth = getComputedStyle(message).width;
    const originalWidth = message.style.width;
    const originalFlex = message.style.flex;
    message.style.width = messageWidth;
    message.style.flex = "none";
    previous.restore = () => {
      message.style.width = originalWidth;
      message.style.flex = originalFlex;
    };

    previous.animation = element.animate([
      { width: `${previous.width}px`, height: `${previous.height}px` },
      { width: `${width}px`, height: `${height}px` },
    ], { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    previous.animation.onfinish = () => {
      previous.restore();
      previous.restore = null;
      previous.animation = null;
    };
  },
  beforeUnmount(element) {
    sizeTransitions.get(element)?.animation?.cancel();
    sizeTransitions.get(element)?.restore?.();
    sizeTransitions.delete(element);
  },
};

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
