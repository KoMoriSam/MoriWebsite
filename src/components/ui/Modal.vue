<template>
  <dialog
    v-if="visible"
    ref="dialogRef"
    class="modal modal-bottom sm:modal-middle"
    @cancel="handleNativeCancel"
    @keydown.esc.capture="handleEscapeKeydown"
  >
    <section
      ref="modalRef"
      class="modal-box relative scrollbar-thin"
      :class="{
        'flex max-h-[82dvh] flex-col overflow-hidden p-0': scrollContent,
      }"
    >
      <header
        :class="{
          'mb-4': !scrollContent,
          'shrink-0 border-b border-base-300 px-5 py-4': scrollContent,
        }"
      >
        <div class="flex min-w-0 items-center gap-2">
          <button
            v-if="showBack"
            type="button"
            class="btn btn-ghost btn-circle btn-sm shrink-0"
            :aria-label="backLabel"
            @click="emit('back')"
          >
            <i class="ri-arrow-left-line text-lg" aria-hidden="true"></i>
          </button>

          <div class="min-w-0 flex-1">
            <slot name="title">
              <h3 class="font-serif text-lg font-bold">{{ title }}</h3>
            </slot>
          </div>

          <button
            v-if="!isConfirm && buttonMode === 'close'"
            class="btn btn-sm btn-circle btn-ghost shrink-0"
            type="button"
            aria-label="关闭"
            @click="close"
          >
            <i class="ri-close-line text-lg" aria-hidden="true"></i>
          </button>
        </div>

        <slot name="header-details"></slot>
      </header>
      <section
        :class="{
          'scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5': scrollContent,
        }"
      >
        <slot name="description">
          {{ description }}
          <!-- fallback -->
        </slot>
      </section>
      <form
        v-if="isConfirm"
        method="dialog"
        class="modal-action"
        :class="{
          'm-0 shrink-0 border-t border-base-300 px-5 py-4': scrollContent,
        }"
      >
        <slot name="leading-action"></slot>
        <button class="btn btn-primary" type="button" @click="handleSubmit">
          {{ buttonText }}
        </button>
        <button
          v-if="showCancel"
          class="btn"
          type="button"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
      </form>
      <form
        v-else-if="buttonMode === 'footer'"
        method="dialog"
        class="modal-action"
        :class="{
          'm-0 shrink-0 border-t border-base-300 px-5 py-4': scrollContent,
        }"
      >
        <slot name="leading-action"></slot>
        <button class="btn" type="button" @click="handleSubmit">
          {{ buttonText }}
        </button>
      </form>
    </section>
  </dialog>
</template>

<script setup>
import { computed, ref, h, nextTick, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { useModalClose } from "@/composables/useModal";

const props = defineProps({
  title: {
    type: [String, Object],
    default: "Hello!",
  },
  description: {
    type: [String, Object],
    default: h("p", "这是一个默认的描述文本。"),
  },
  buttonText: {
    type: String,
    default: "关闭",
  },
  cancelText: {
    type: String,
    default: "取消",
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
  buttonMode: {
    type: String,
    default: "footer",
    validator: (value) => ["none", "close", "footer"].includes(value),
  },
  variant: {
    type: String,
    default: "default",
    validator: (value) => ["default", "confirm"].includes(value),
  },
  visible: {
    type: Boolean,
    default: false,
  },
  scrollContent: {
    type: Boolean,
    default: false,
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  backLabel: {
    type: String,
    default: "返回",
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const emit = defineEmits(["back", "close"]);

const modalRef = ref(null);
const dialogRef = ref(null);
const isConfirm = computed(() => props.variant === "confirm");
let blockedDismissAnimation = null;

const indicateBlockedDismiss = () => {
  const modal = modalRef.value;
  if (
    !modal?.animate ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  blockedDismissAnimation?.cancel();
  blockedDismissAnimation = modal.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-0.5rem)" },
      { transform: "translateX(0.4rem)" },
      { transform: "translateX(-0.25rem)" },
      { transform: "translateX(0.15rem)" },
      { transform: "translateX(0)" },
    ],
    { duration: 280, easing: "ease-out" },
  );
};

const closeImmediately = () => {
  if (dialogRef.value?.close) {
    dialogRef.value.close();
  }
  emit("close");
};
const modalClose = useModalClose({
  onClose: closeImmediately,
  shouldCloseFromFallback: () => !isConfirm.value && !props.showBack,
  onBlockedFallback: () => {
    if (isConfirm.value) indicateBlockedDismiss();
    else if (props.showBack) emit("back");
  },
});

const open = async () => {
  await nextTick();
  const dialog = dialogRef.value;
  if (!props.visible || !dialog || dialog.open) return;

  modalClose.activate();
  dialog.showModal();
};

const close = () => modalClose.requestClose();

const handleSubmit = () => {
  if (props.onSubmit() !== false) close();
};

const handleDismiss = () => {
  if (isConfirm.value) return indicateBlockedDismiss();
  if (props.showBack) return emit("back");
  close();
};

const handleCancel = () => {
  props.onCancel();
  close();
};

const handleEscapeKeydown = (event) => {
  if (!isConfirm.value && !props.showBack) return;
  event.preventDefault();
  event.stopPropagation();

  if (isConfirm.value) indicateBlockedDismiss();
  else emit("back");
};

const handleNativeCancel = (event) => {
  event.preventDefault();
  if (isConfirm.value) return indicateBlockedDismiss();
  if (props.showBack) return emit("back");
  modalClose.requestPlatformClose();
};

onClickOutside(modalRef, handleDismiss);

watch(
  () => props.visible,
  (visible) => {
    if (visible) void open();
    else if (modalClose.isActive()) modalClose.discard();
  },
  { immediate: true },
);

defineExpose({
  open,
  close,
});
</script>
