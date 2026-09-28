<template>
  <details class="collapse collapse-arrow border border-base-300 bg-base-100">
    <summary
      class="collapse-title flex items-center gap-2 font-serif text-lg font-semibold"
    >
      <i class="ri-book-open-line text-xl font-normal" aria-hidden="true"></i>
      {{ t("avalon.rulebook.title") }}
    </summary>
    <div class="collapse-content space-y-5 text-sm leading-7">
      <p class="text-base-content/70">{{ t("avalon.rulebook.intro") }}</p>
      <ol class="list-decimal space-y-2 pl-5">
        <li v-for="step in steps" :key="step">
          {{ t(`avalon.rulebook.${step}`) }}
        </li>
      </ol>
      <div>
        <h3 class="mb-2 font-serif font-semibold">
          {{ t("avalon.rulebook.teamSizes") }}
        </h3>
        <div
          class="max-w-full overflow-x-auto rounded-box border border-base-300"
        >
          <table class="table table-xs min-w-128 text-center">
            <thead>
              <tr>
                <th scope="col">{{ t("avalon.rulebook.players") }}</th>
                <th scope="col">{{ t("avalon.rulebook.good") }}</th>
                <th scope="col">{{ t("avalon.rulebook.evil") }}</th>
                <th v-for="quest in 5" :key="quest" scope="col">
                  {{ t("avalon.rulebook.questNumber", { n: quest }) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in teamSizes" :key="row.players">
                <th scope="row">{{ row.players }}</th>
                <td>{{ row.good }}</td>
                <td>{{ row.evil }}</td>
                <td v-for="(size, index) in row.quests" :key="index">
                  {{ size }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-base-content/60">
          {{ t("avalon.rulebook.twoFails") }}
        </p>
      </div>
    </div>
  </details>
</template>
<script setup>
import { useLocale } from "@/i18n";
import { GOOD_COUNTS, QUEST_TEAMS } from "../../../../shared/games/avalon.js";
const { t } = useLocale();
const steps = ["night", "discussion", "team", "vote", "quest", "victory"];
const teamSizes = Object.entries(QUEST_TEAMS).map(([count, quests]) => ({
  players: Number(count),
  good: GOOD_COUNTS[count],
  evil: Number(count) - GOOD_COUNTS[count],
  quests,
}));
</script>
