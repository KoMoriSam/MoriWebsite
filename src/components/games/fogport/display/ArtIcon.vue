<template>
  <span
    class="inline-flex size-[1em] shrink-0 items-center justify-center align-middle"
    aria-hidden="true"
  >
    <template v-if="src && vector"
      ><span
        class="h-full w-full bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
        :style="{ maskImage: `url(${src})` }"
      ></span
      ><img :key="src" :src="src" alt="" class="hidden" @error="onError"
    /></template>
    <img
      v-else-if="src"
      :key="src"
      :src="src"
      alt=""
      draggable="false"
      class="pointer-events-none h-full w-full object-contain"
      @error="onError"
    />
    <i v-else :class="icon"></i>
  </span>
</template>
<script setup>
import { computed } from "vue";
import { useArtAsset } from "@/composables/games/fogport/useArtAsset";
const props = defineProps({
  asset: { type: String, default: "" },
  icon: { type: String, default: "ri-image-line" },
});
const { src, onError } = useArtAsset(() => props.asset);
const vector = computed(() => /\.svg(?:[?#]|$)/.test(src.value));
</script>
