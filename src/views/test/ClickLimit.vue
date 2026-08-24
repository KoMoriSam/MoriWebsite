<template>
  <TestPage section-id="click-limit">
    <section class="min-w-0">
      <p class="mb-2 text-xs opacity-60">
        连点 ≥{{ limitOptions.maxClicks }} 次 → 冷却
        {{ limitOptions.cooldown / 1000 }}s
      </p>
      <div class="flex items-center gap-3">
        <button
          class="btn btn-sm btn-warning"
          :disabled="clickLimit.isDisabled.value"
          @click="clickLimit.handleClick(() => clickCount++)"
        >
          点击: {{ clickCount }}
        </button>
        <button class="btn btn-xs btn-ghost" @click="reset">重置</button>
        <span
          v-if="clickLimit.isDisabled.value"
          class="animate-pulse text-xs font-bold text-error"
        >
          冷却中…
        </span>
      </div>
    </section>
  </TestPage>
</template>

<script setup>
import { ref } from "vue";
import { useClickLimit } from "@/composables/useClickLimit";
import TestPage from "./_TestPage.vue";

const limitOptions = { maxClicks: 5, cooldown: 3000 };
const clickLimit = useClickLimit(limitOptions);
const clickCount = ref(0);

function reset() {
  clickLimit.reset();
  clickCount.value = 0;
}
</script>
