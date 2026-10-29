<template>
  <AmbientCanvas :config="config" />
</template>

<script setup>
import AmbientCanvas from "@/components/display/AmbientCanvas.vue";
import { createAuroraGinkgo } from "@/utils/home/ambient-backdrop";

const config = {
  createEffect: createAuroraGinkgo,
  initialTime: 7,
  speed: 1,
  strength: 0.72,
  lightMultiplier: 1.4,
  effectOptions: { desktopOffset: 0.15 },
};
</script>