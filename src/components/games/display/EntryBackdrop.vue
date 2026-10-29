<template>
  <AmbientCanvas ref="ambient" :key="definition.id" :config="config">
    <template #default="{ lightTheme }">
      <div
        class="pointer-events-none absolute inset-x-0 top-(--navbar-height) aspect-video [mask-image:linear-gradient(to_bottom,transparent_0%,#0009_8%,#000_20%,#000_45%,#000b_65%,#0004_85%,transparent_100%)] lg:top-[calc((100dvh_+_var(--navbar-height))/2)] lg:right-auto lg:w-[min(56vw,64rem)] lg:max-w-[calc((100dvh_-_var(--navbar-height))*16/9)] lg:-translate-y-1/2 lg:[mask-image:linear-gradient(to_right,#000_0%,#000_25%,#000e_42%,#0008_65%,#0002_88%,transparent_100%),linear-gradient(to_bottom,transparent_0%,#0001_3%,#0005_10%,#000b_20%,#000_30%,#000_70%,#000b_80%,#0005_90%,#0001_97%,transparent_100%)] lg:[mask-composite:intersect]"
        :class="lightTheme ? 'opacity-35' : 'opacity-25'"
      >
        <ContentImage
          :src="definition.cover"
          alt=""
          :width="1280"
          :height="720"
          sizes="(min-width: 1829px) 1024px, (min-width: 1024px) 56vw, 100vw"
          class="size-full"
          contain
          eager
        />
      </div>
    </template>
  </AmbientCanvas>
</template>

<script setup>
import { computed, ref } from "vue";
import AmbientCanvas from "@/components/display/AmbientCanvas.vue";
import ContentImage from "@/components/display/ContentImage.vue";
import { createMoonMist, createFurnaceDust } from "@/utils/games/entry-backdrop";

const props = defineProps({ definition: { type: Object, required: true } });
const ambient = ref(null);
defineExpose({
  freezeLayout: () => ambient.value?.freezeLayout(),
  resumeLayout: () => ambient.value?.resumeLayout(),
});
const config = computed(() => ({
  createEffect: props.definition.id === "avalon" ? createMoonMist : createFurnaceDust,
  initialTime: 12,
  speed: 0.65,
  strength: 1,
  lightMultiplier: 1.65,
  mask: {
    desktop: { horizontal: [[0, 0.3], [0.25, 0.65], [0.65, 1], [1, 0.4]] },
    mobile: { horizontal: [[0, 0.45], [0.35, 0.75], [0.7, 1], [1, 0.55]] },
  },
}));
</script>
