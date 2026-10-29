<template>
  <component
    :is="tag"
    :datetime="tag === 'time' ? datetime : undefined"
    class="inline-flex min-w-0 max-w-full items-center gap-1.5"
  >
    <i :class="icon" class="shrink-0" aria-hidden="true"></i>
    <span class="min-w-0 wrap-break-word"><slot /></span>
  </component>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  tag: { type: String, default: "span", validator: value => ["span", "time"].includes(value) },
  datetime: { type: String, default: undefined },
});
</script>
