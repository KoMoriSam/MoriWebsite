<template>
  <div
    class="min-w-0"
    :style="{ '--step-direction': direction }"
    @keydown.left.prevent="change(-1)"
    @keydown.right.prevent="change(1)"
  >
    <div
      :id="flowId"
      class="min-w-0 space-y-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="grid min-w-0">
        <hgroup
          v-for="step in steps"
          :key="step.id"
          class="col-start-1 row-start-1 min-w-0 space-y-1 text-center"
          :class="step.id === current.id ? 'visible' : 'invisible'"
          :aria-hidden="step.id !== current.id"
        >
          <h3 class="font-serif text-base font-semibold">{{ step.title }}</h3>
          <p class="wrap-break-word text-sm leading-6 text-base-content/70">
            {{ step.detail }}
          </p>
        </hgroup>
      </div>
      <div class="flex min-w-0 items-center justify-center gap-2">
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm shrink-0"
          :aria-label="previousLabel"
          :aria-controls="flowId"
          @click="change(-1)"
        >
          <i class="ri-arrow-left-s-line text-xl" aria-hidden="true"></i>
        </button>
        <div class="h-44 min-w-0 max-w-80 flex-1 overflow-hidden">
          <Transition name="rule-step" mode="out-in"
            ><div :key="current.id" class="h-full">
              <slot :step="current.id" :complete="complete"></slot></div
          ></Transition>
        </div>
        <button
          type="button"
          class="btn btn-square btn-ghost btn-sm shrink-0"
          :aria-label="nextLabel"
          :aria-controls="flowId"
          @click="change(1)"
        >
          <i class="ri-arrow-right-s-line text-xl" aria-hidden="true"></i>
        </button>
      </div>
      <p class="text-center text-xs tabular-nums text-base-content/60">
        {{ index + 1 }} / {{ steps.length }}
      </p>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, useId } from "vue";
const props = defineProps({
  steps: { type: Array, required: true },
  previousLabel: { type: String, required: true },
  nextLabel: { type: String, required: true },
});
const flowId = `game-flow-${useId()}`;
const index = ref(0),
  direction = ref(1),
  automatic = ref(true);
const current = computed(() => props.steps[index.value]);
function change(value, manual = true) {
  if (manual) automatic.value = false;
  direction.value = value;
  index.value = (index.value + value + props.steps.length) % props.steps.length;
}
function complete(id) {
  if (automatic.value && id === current.value.id) change(1, false);
}
</script>
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .rule-step-enter-active,
  .rule-step-leave-active {
    transition:
      opacity 160ms ease,
      transform 160ms ease;
  }
  .rule-step-enter-from {
    opacity: 0;
    transform: translateX(calc(var(--step-direction) * 0.75rem));
  }
  .rule-step-leave-to {
    opacity: 0;
    transform: translateX(calc(var(--step-direction) * -0.75rem));
  }
}
</style>
