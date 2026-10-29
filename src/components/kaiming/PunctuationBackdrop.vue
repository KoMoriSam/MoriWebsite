<template>
  <AmbientCanvas :config="config" />
</template>

<script setup>
import AmbientCanvas from "@/components/display/AmbientCanvas.vue";
import { createPunctuationDrift } from "@/utils/kaiming/punctuation-backdrop";

const config = {
  createEffect: createPunctuationDrift,
  initialTime: 12,
  speed: 0.65,
  strength: 1,
  lightMultiplier: 2.1,
  mask: {
    desktop: {
      horizontal: [
        [0, 0.015],
        [0.28, 0.08],
        [0.5, 0.55],
        [0.68, 1],
        [0.94, 0.92],
        [1, 0.5],
      ],
      vertical: [
        [0, 0.6],
        [0.08, 1],
        [0.9, 1],
        [1, 0],
      ],
    },
  },
};
</script>
