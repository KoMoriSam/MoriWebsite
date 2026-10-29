<template>
  <AmbientCanvas :config="config" />
</template>

<script setup>
import AmbientCanvas from "@/components/display/AmbientCanvas.vue";
import { createForestLight } from "@/utils/novel/forest-backdrop";

const config = {
  createEffect: createForestLight,
  initialTime: 12,
  speed: 0.65,
  strength: 0.8,
  lightMultiplier: 1.25,
  desktopOffset: 0.08,
};
</script>
