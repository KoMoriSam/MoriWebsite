<template>
  <section
    class="rounded-box border border-base-300/80 bg-base-100/70 px-4 py-2"
  >
    <header class="flex items-center justify-between py-1">
      <h4 class="text-sm font-medium text-base-content/85">
        {{ title }}
      </h4>

      <button
        v-if="!style.isDefault(configKey)"
        type="button"
        class="btn btn-ghost btn-info btn-xs h-auto min-h-0 font-normal"
        @click="style.resetStyle(configKey)"
      >
        <span>恢复默认值</span>
        <i class="ri-arrow-go-back-line"></i>
      </button>

      <span v-else class="text-xs text-base-content/45">默认值</span>
    </header>

    <div class="py-2">
      <slot></slot>
    </div>
  </section>
</template>

<script setup>
import { useReaderStore } from "@/stores/readerStore";

defineProps({
  title: String,
  configKey: String,
});

const style = useReaderStore();
</script>
