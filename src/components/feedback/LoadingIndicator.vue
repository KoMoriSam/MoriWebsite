<template>
  <main class="flex items-center justify-center" :class="size">
    <span class="loading loading-spinner loading-xl text-primary"></span>
  </main>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: "",
  },
});
</script>
