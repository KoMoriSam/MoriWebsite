<template>
  <span
    v-if="iconAvailable"
    aria-hidden="true"
    data-reader-link-icon
    :class="[
      'not-prose me-[0.25em] inline-grid size-[0.75em] shrink-0 place-items-center',
      'overflow-hidden rounded-full bg-white',
      'ring-1 ring-[color-mix(in_oklab,var(--color-primary-content)_50%,var(--color-primary))] transition-opacity',
      iconLoaded ? 'opacity-100' : 'opacity-0',
    ]"
  >
    <img
      :src="src"
      alt=""
      crossorigin="anonymous"
      decoding="async"
      loading="lazy"
      referrerpolicy="no-referrer"
      class="block size-[0.5em] object-contain"
      @load="iconLoaded = true"
      @error="iconAvailable = false"
    />
  </span>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
});

const iconAvailable = ref(true);
const iconLoaded = ref(false);

watch(
  () => props.src,
  () => {
    iconAvailable.value = true;
    iconLoaded.value = false;
  },
);
</script>
