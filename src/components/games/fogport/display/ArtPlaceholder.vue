<template>
  <div
    class="relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-field border"
    :class="
      complete
        ? 'border-transparent bg-base-100'
        : 'border-dashed border-base-content/20 bg-base-200 text-base-content/45'
    "
    :style="ratio ? { aspectRatio: ratio } : undefined"
    :aria-label="alt || label"
  >
    <div class="flex h-full min-h-0 w-full flex-1">
      <ArtImage
        v-for="(name, i) in names"
        :key="name || i"
        class="min-h-0 flex-1"
        :asset="name"
        :icon="icons[i] || icon"
        :label="alt || label"
        :fit="fit"
      />
    </div>
    <span
      v-if="label && !complete"
      class="mt-1 max-w-full px-1 text-center text-[10px] leading-tight"
      >{{ label }}</span
    >
    <span
      v-if="dimensions && !complete"
      class="absolute bottom-1 right-1 rounded bg-base-100/80 px-1 font-mono text-[9px]"
      >{{ dimensions }}</span
    >
  </div>
</template>
<script setup>
import { computed } from "vue";
import ArtImage from "./ArtImage.vue";
import { artSource } from "@/composables/games/fogport/useArtAsset";
const props = defineProps({
  asset: { type: [String, Array], default: "" },
  icons: { type: Array, default: () => [] },
  icon: { type: String, default: "ri-landscape-line" },
  label: { type: String, default: "" },
  alt: { type: String, default: "" },
  dimensions: { type: String, default: "" },
  ratio: { type: String, default: "" },
  fit: { type: String, default: "contain" },
});
const names = computed(() =>
  Array.isArray(props.asset) && props.asset.length
    ? props.asset
    : [typeof props.asset === "string" ? props.asset : ""],
);
// Metadata disappears when the illustration is available; mixed cards keep each missing half's icon.
const complete = computed(() => names.value.every((name) => !!artSource(name)));
</script>
