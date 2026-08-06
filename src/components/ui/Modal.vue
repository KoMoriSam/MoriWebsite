<template>
  <dialog
    v-if="visible"
    ref="dialogRef"
    class="modal modal-bottom sm:modal-middle"
    @cancel="handleNativeCancel"
  >
    <section ref="modalRef" class="modal-box relative">
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
      <header :class="{ 'pr-10': !isConfirm && buttonMode === 'close' }">
        <slot name="title">
          <h3 class="text-lg font-bold">{{ title }}</h3>
        </slot>
      </header>
      <section class="py-4">
        <slot name="description">
          <p>{{ description }}</p>
          <!-- fallback -->
        </slot>
      </section>
      <form v-if="isConfirm" method="dialog" class="modal-action">
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
        <button class="btn" type="button" @click="handleSubmit">
          {{ buttonText }}
        </button>
      </form>
    </section>
  </dialog>
</template>

<script setup>
import { computed, ref, h } from "vue";
import { onClickOutside } from "@vueuse/core";

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

const close = () => {
  if (dialogRef.value?.close) {
    dialogRef.value.close();
  }
  emit("close");
};

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
  handleDismiss();
};

onClickOutside(modalRef, handleDismiss);

defineExpose({
  close,
});
</script>
