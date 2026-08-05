<template>
  <TransitionGroup name="toast">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      role="alert"
      :class="[
        `alert alert-soft mx-6 lg:mx-20 h-12 transition-opacity duration-300 border shadow-sm`,
        {
          'alert-info border-info/50': toast.type === 'info',
          'alert-success border-success/50': toast.type === 'success',
          'alert-error border-error/50': toast.type === 'error',
          'alert-warning border-warning/50': toast.type === 'warning',
          'alert-soft': toast.soft !== false,
          'opacity-0': toast.fading,
        },
      ]"
    >
      <i v-if="toast.icon" :class="[toast.icon, 'text-base']"></i>
      <span class="flex-1">{{ toast.message }}</span>
      <button
        v-if="toast.closable"
        :class="[`btn btn-circle btn-ghost btn-xs`, `btn-${toast.type}`]"
        @click="handleClose(toast)"
      >
        <i class="ri-close-line"></i>
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup>
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
</script>
