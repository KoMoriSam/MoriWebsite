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
        <FlowCarousel
          :steps="flowSteps"
          :previous-label="t('avalon.rulebook.previousStep')"
          :next-label="t('avalon.rulebook.nextStep')"
        >
          <template #default="{ step, complete }"
            ><RuleStepFigure :step="step" @cycle-complete="complete"
          /></template>
        </FlowCarousel>
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
import { computed, ref, watch } from "vue";
import { useLocale } from "@/i18n";
import FlowCarousel from "../../display/FlowCarousel.vue";
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
const flowSteps = computed(() =>
  steps.map((id) => ({
    id,
    title: t(`avalon.rulebook.steps.${id}.title`),
    detail: t(`avalon.rulebook.steps.${id}.detail`),
  })),
);
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
