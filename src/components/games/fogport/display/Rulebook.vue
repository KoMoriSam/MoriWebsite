<template>
  <div class="flex min-h-0 flex-col gap-4">
    <div
      role="tablist"
      class="tabs tabs-sm shrink-0 flex-nowrap overflow-x-auto w-fit"
      :class="inSidebar ? 'tabs-box' : 'tabs-border'"
    >
      <button
        v-for="(icon, id) in tabIcons"
        :key="id"
        type="button"
        role="tab"
        class="tab gap-1 whitespace-nowrap"
        :class="tab === id ? 'tab-active' : ''"
        :aria-selected="tab === id"
        @click="tab = id"
      >
        <span class="flex items-center gap-1">
          <i :class="icon" aria-hidden="true"></i
          >{{ t(`fogport.visual.${id}`) }}
        </span>
      </button>
    </div>
    <div class="min-h-0 overflow-y-auto overscroll-contain pr-1">
      <PlayGuide v-if="tab === 'flow'" compact />
      <section v-else-if="tab === 'tiles'" class="space-y-3">
        <p class="text-xs leading-6 text-base-content/65">
          {{ t("fogport.visual.tileLegend") }}
        </p>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="type in INDUSTRIES"
            :key="type"
            class="btn btn-sm gap-1"
            :class="industry === type ? 'btn-primary' : 'btn-ghost'"
            @click="industry = type"
          >
            <i :class="INDUSTRY_ICONS[type]" aria-hidden="true"></i
            >{{ t(`fogport.industries.${type}`) }}
          </button>
        </div>
        <div
          class="grid gap-3"
          :class="
            inSidebar
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          "
        >
          <TileFace
            v-for="tile in levels(industry)"
            :key="tile.id"
            :tile="tile"
            :quantity="
              TILES[industry].filter((x) => x.level === tile.level).length
            "
            detail
          />
        </div>
      </section>
      <section v-else-if="tab === 'details'" class="space-y-2">
        <details
          v-for="section in sections"
          :key="section"
          class="collapse collapse-arrow border border-base-300 bg-base-100"
        >
          <summary class="collapse-title text-sm font-semibold">
            {{ t(`fogport.ruleTitles.${section}`) }}
          </summary>
          <div class="collapse-content text-sm leading-7 text-base-content/75">
            <p>{{ t(`fogport.ruleText.${section}`) }}</p>
          </div>
        </details>
      </section>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
import { INDUSTRIES, TILES } from "../../../../../shared/games/fogport/data.js";
import { INDUSTRY_ICONS } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
import PlayGuide from "./PlayGuide.vue";
import TileFace from "./TileFace.vue";
const { t } = useLocale();
const tab = ref("flow"),
  industry = ref("cotton");
defineProps({ inSidebar: Boolean });
const tabIcons = {
  flow: "ri-flow-chart",
  tiles: "ri-layout-grid-line",
  details: "ri-book-open-line",
};
const sections = [
  "goal",
  "turn",
  "build",
  "network",
  "resources",
  "develop",
  "sell",
  "finance",
  "scout",
  "maintenance",
  "scoring",
  "introductory",
];
const levels = (type) =>
  TILES[type].filter(
    (tile, i, tiles) => i === 0 || tiles[i - 1].level !== tile.level,
  );
</script>
