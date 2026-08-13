<template>
  <dialog
    v-if="visible"
    ref="dialogRef"
    class="modal modal-bottom sm:modal-middle"
    @cancel="handleNativeCancel"
  >
    <section ref="modalRef" class="modal-box relative scrollbar-thin">
      <form v-if="!isConfirm && buttonMode === 'close'" method="dialog">
        <button
          class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
          type="button"
          aria-label="关闭"
          @click="handleDismiss"
        >
          <i class="ri-close-line text-lg" aria-hidden="true"></i>
        </button>
      </form>
      <header
        class="mb-4"
        :class="{ 'pr-10': !isConfirm && buttonMode === 'close' }"
      >
        <slot name="title">
          <h3 class="text-lg font-bold">{{ title }}</h3>
        </slot>
      </header>
      <slot name="description">
        {{ description }}
        <!-- fallback -->
      </slot>
      <form v-if="isConfirm" method="dialog" class="modal-action">
        <slot name="leading-action"></slot>
        <button class="btn btn-primary" type="button" @click="handleSubmit">
          {{ buttonText }}
        </button>
        <button class="btn" type="button" @click="handleCancel">
          {{ cancelText }}
        </button>
      </form>
      <form
        v-else-if="buttonMode === 'footer'"
        method="dialog"
        class="modal-action"
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
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const emit = defineEmits(["close"]);

const modalRef = ref(null);
const dialogRef = ref(null);
const isConfirm = computed(() => props.variant === "confirm");

const closeImmediately = () => {
  if (dialogRef.value?.close) {
    dialogRef.value.close();
  }
  emit("close");
};
const modalClose = useModalClose({
  onClose: closeImmediately,
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
  props.onSubmit();
  close();
};

const handleDismiss = () => {
  if (!isConfirm.value) {
    close();
  }
};

const handleCancel = () => {
  props.onCancel();
  close();
};

const handleNativeCancel = (event) => {
  event.preventDefault();
  if (!isConfirm.value) modalClose.requestPlatformClose();
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
