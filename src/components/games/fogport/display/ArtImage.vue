<template>
  <div
    class="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
  >
    <img
      v-if="src"
      :key="src"
      :src="src"
      :alt="label"
      draggable="false"
      class="pointer-events-none absolute inset-0 h-full w-full"
      :class="fit === 'cover' ? 'object-cover' : 'object-contain'"
      @error="onError"
    />
    <template v-else
      ><i :class="icon" class="text-2xl sm:text-3xl" aria-hidden="true"></i
      ><slot name="fallback"></slot
    ></template>
  </div>
</template>
<script setup>
import { useArtAsset } from "@/composables/games/fogport/useArtAsset";
const props = defineProps({
  asset: { type: String, default: "" },
  icon: { type: String, default: "ri-landscape-line" },
  label: { type: String, default: "" },
  fit: { type: String, default: "contain" },
});
const { src, onError } = useArtAsset(() => props.asset);
</script>
