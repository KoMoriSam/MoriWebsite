<template>
  <div class="divider"></div>
  <section class="card">
    <div class="card-body gap-4 p-0 text-sm leading-6">
      <h2 class="card-title font-serif">
        <i class="ri-book-open-line font-normal" aria-hidden="true"></i>
        {{ t("avalon.rulebook.title") }}
      </h2>
      <p class="text-base-content/70">{{ t("avalon.rulebook.intro") }}</p>
      <ol class="divide-y divide-base-300 border-y border-base-300">
        <li v-for="(step, index) in steps" :key="step" class="flex gap-3 py-3">
          <span class="font-mono text-base-content/50">{{ String(index + 1).padStart(2, "0") }}</span>
          <div class="min-w-0">
            <h3 class="font-semibold">{{ t(`avalon.rulebook.steps.${step}.title`) }}</h3>
            <p class="text-base-content/70">{{ t(`avalon.rulebook.steps.${step}.detail`) }}</p>
          </div>
        </li>
      </ol>
      <div class="space-y-2">
        <h3 class="font-serif font-semibold">{{ t("avalon.rulebook.teamSizes") }}</h3>
        <p class="text-xs text-base-content/60">{{ t("avalon.rulebook.sequenceHint") }}</p>
        <div class="divide-y divide-base-300 border-y border-base-300">
          <div v-for="row in teamSizes" :key="row.players" class="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
            <strong class="min-w-11">{{ t("avalon.rulebook.playerCount", { n: row.players }) }}</strong>
            <span class="text-base-content/60">{{ t("avalon.rulebook.campCounts", { good: row.good, evil: row.evil }) }}</span>
            <span class="font-mono tabular-nums sm:ml-auto">{{ row.quests.join(" → ") }}</span>
          </div>
        </div>
        <p class="text-xs text-base-content/60">{{ t("avalon.rulebook.twoFails") }}</p>
      </div>
    </div>
  </section>
</template>
<script setup>
import { useLocale } from "@/i18n";
import { GOOD_COUNTS, QUEST_TEAMS } from "../../../../../shared/games/avalon/index.js";
const { t } = useLocale();
const steps = ["night", "discussion", "team", "vote", "quest", "evilDiscussion", "victory"];
const teamSizes = Object.entries(QUEST_TEAMS).map(([count, quests]) => ({
  players: Number(count),
  good: GOOD_COUNTS[count],
  evil: Number(count) - GOOD_COUNTS[count],
  quests,
}));
</script>
