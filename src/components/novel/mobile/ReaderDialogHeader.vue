<template>
  <header
    class="sticky top-0 z-10 flex items-center gap-2 border-b border-base-300 bg-base-100/95 px-3 py-2 backdrop-blur"
  >
    <button
      type="button"
      class="btn btn-circle btn-ghost btn-sm"
      aria-label="返回阅读控制"
      @click="$emit('back')"
    >
      <i class="ri-arrow-left-line text-xl" aria-hidden="true"></i>
    </button>
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-base font-bold">{{ title }}</h2>
      <p
        v-if="subtitle"
        class="truncate text-[0.6875rem] leading-tight text-base-content/50"
      >
        {{ subtitle }}
      </p>
    </div>
    <slot name="action" />
  </header>
</template>
<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
defineEmits(["back"]);
</script>
