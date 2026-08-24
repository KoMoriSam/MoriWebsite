<template>
  <TestPage section-id="environment">
    <TestCard title="环境信息">
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <template v-for="(value, key) in environmentInfo" :key="key">
          <span class="font-semibold">{{ key }}:</span>
          <code class="break-all text-xs">{{ value }}</code>
        </template>
      </div>
    </TestCard>
  </TestPage>
</template>

<script setup>
import { computed } from "vue";
import TestCard from "@/components/test/_TestCard.vue";
import TestPage from "./_TestPage.vue";

const environmentInfo = computed(() => ({
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  "User Agent": `${navigator.userAgent.substring(0, 60)}...`,
  Screen: `${window.screen.width}x${window.screen.height}`,
  Language: navigator.language,
}));
</script>
