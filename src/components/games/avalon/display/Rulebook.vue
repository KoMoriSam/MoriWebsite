<template>
  <div v-if="!sidebar" class="divider"></div>
  <section class="card min-w-0 max-w-full">
    <div class="card-body min-w-0 gap-4 p-0 text-sm leading-6">
      <h2 v-if="!flowOnly" class="card-title font-serif">
        {{ t("avalon.rulebook.title") }}
      </h2>
      <div
        class="grid min-w-0 gap-6"
        :class="!flowOnly && !sidebar ? 'lg:grid-cols-2 lg:items-start' : ''"
      >
        <div
          class="min-w-0"
          :style="{ '--step-direction': stepDirection }"
          @keydown.left.prevent="changeStep(-1)"
          @keydown.right.prevent="changeStep(1)"
        >
          <div :id="flowId" class="min-w-0 space-y-3" aria-live="polite" aria-atomic="true">
            <div class="grid min-w-0">
              <hgroup
                v-for="flowStep in steps"
                :key="flowStep"
                class="col-start-1 row-start-1 min-w-0 space-y-1 text-center"
                :class="flowStep === currentStep ? 'visible' : 'invisible'"
                :aria-hidden="flowStep !== currentStep"
              >
                <h3 class="font-serif text-base font-semibold">
                  {{ t(`avalon.rulebook.steps.${flowStep}.title`) }}
                </h3>
                <p class="wrap-break-word text-base-content/70">
                  {{ t(`avalon.rulebook.steps.${flowStep}.detail`) }}
                </p>
              </hgroup>
            </div>
            <div class="flex min-w-0 items-center justify-center gap-2">
              <button
                type="button"
                class="btn btn-square btn-ghost btn-sm shrink-0"
                :aria-label="t('avalon.rulebook.previousStep')"
                :aria-controls="flowId"
                @click="changeStep(-1)"
              >
                <i class="ri-arrow-left-s-line text-xl" aria-hidden="true"></i>
              </button>
              <div class="h-44 min-w-0 max-w-80 flex-1 overflow-hidden">
                <Transition name="rule-step" mode="out-in">
                  <RuleStepFigure
                    :key="currentStep"
                    :step="currentStep"
                    @cycle-complete="advanceAutomatically"
                  />
                </Transition>
              </div>
              <button
                type="button"
                class="btn btn-square btn-ghost btn-sm shrink-0"
                :aria-label="t('avalon.rulebook.nextStep')"
                :aria-controls="flowId"
                @click="changeStep(1)"
              >
                <i class="ri-arrow-right-s-line text-xl" aria-hidden="true"></i>
              </button>
            </div>
            <p class="text-center text-xs tabular-nums text-base-content/60">
              {{ currentStepIndex + 1 }} / {{ steps.length }}
            </p>
          </div>
        </div>
        <div v-if="!flowOnly" class="min-w-0 space-y-2">
          <hgroup class="min-w-0 space-y-1 text-center">
            <h3 class="font-serif text-base font-semibold">
              {{ t("avalon.rulebook.teamSizes") }}
            </h3>
            <p class="wrap-break-word text-base-content/70">
              {{ t("avalon.rulebook.sequenceHint") }}
            </p>
          </hgroup>
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-model.number="selectedPlayers"
                class="select select-sm w-auto min-w-24 max-w-full"
                :aria-label="t('avalon.rulebook.players')"
                @change="manuallySelected = true"
              >
                <option
                  v-for="row in configurations"
                  :key="row.players"
                  :value="row.players"
                >
                  {{ t("avalon.rulebook.playerCount", { n: row.players }) }}
                </option>
              </select>
              <span class="badge badge-soft badge-success badge-sm">
                {{ t("avalon.rulebook.good") }} {{ selectedRow.good }}
              </span>
              <span class="badge badge-soft badge-error badge-sm">
                {{ t("avalon.rulebook.evil") }} {{ selectedRow.evil }}
              </span>
            </div>
            <QuestList :player-count="selectedPlayers" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, useId, watch } from "vue";
import { useLocale } from "@/i18n";
import RuleStepFigure from "./RuleStepFigure.vue";
import QuestList from "./QuestList.vue";
import { GOOD_COUNTS } from "../../../../../shared/games/avalon/index.js";
const props = defineProps({
  playerCount: { type: Number, default: 5 },
  sidebar: Boolean,
  flowOnly: Boolean,
});
const { t } = useLocale();
const manuallySelected = ref(false);
const steps = [
  "night",
  "discussion",
  "team",
  "vote",
  "quest",
  "evilDiscussion",
  "victory",
];
const flowId = `avalon-rulebook-flow-${useId()}`;
const currentStepIndex = ref(0);
const stepDirection = ref(1);
const autoAdvance = ref(true);
const currentStep = computed(() => steps[currentStepIndex.value]);
function changeStep(direction, manual = true) {
  if (manual) autoAdvance.value = false;
  stepDirection.value = direction;
  currentStepIndex.value =
    (currentStepIndex.value + direction + steps.length) % steps.length;
}
function advanceAutomatically(completedStep) {
  if (autoAdvance.value && completedStep === currentStep.value) {
    changeStep(1, false);
  }
}
const configurations = Object.entries(GOOD_COUNTS).map(([count, good]) => ({
  players: Number(count),
  good,
  evil: Number(count) - good,
}));
const selectedPlayers = ref(Math.min(10, Math.max(5, props.playerCount)));
const selectedRow = computed(
  () =>
    configurations.find((row) => row.players === selectedPlayers.value) ??
    configurations[0],
);
watch(
  () => props.playerCount,
  (count) => {
    if (!manuallySelected.value)
      selectedPlayers.value = Math.min(10, Math.max(5, count));
  },
);
</script>
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .rule-step-enter-active,
  .rule-step-leave-active {
    transition: opacity 160ms ease, transform 160ms ease;
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
