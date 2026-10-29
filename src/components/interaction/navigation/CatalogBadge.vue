<template>
  <span
    class="badge badge-sm h-auto min-h-5 max-w-full py-0.5"
    :class="overlay ? 'border-white/20 bg-black/20 text-white backdrop-blur-sm' : primary ? 'border-primary-content/20 bg-primary-content/10 text-primary-content' : 'badge-primary badge-soft'"
  >
    <span class="wrap-break-word"><slot></slot></span>
  </span>
</template>

<script setup>
defineProps({ overlay: Boolean, primary: Boolean });
</script>
