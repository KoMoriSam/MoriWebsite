<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <span class="text-xs font-semibold text-base-content/60">{{ label }}</span>
    <slot></slot>
    <code class="text-xs text-base-content/45">当前: {{ value }}</code>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [Number, String] });
</script>
