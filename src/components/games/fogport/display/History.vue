<template>
  <div class="min-w-0 space-y-5">
    <section v-if="game.scoring.length" class="space-y-4">
      <h3 class="font-serif text-lg font-semibold">
        <i class="ri-award-line font-normal" aria-hidden="true"></i>
        {{ t("fogport.scoring") }}
      </h3>
      <div
        v-for="score in game.scoring"
        :key="score.era"
        class="space-y-3 border-b border-base-300 pb-4"
      >
        <h4 class="text-sm font-medium">{{ t(`fogport.${score.era}`) }}</h4>
        <div v-for="row in score.rows" :key="row.playerId">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm">{{
              player(row.playerId)?.nickname
            }}</span
            ><span class="badge badge-soft badge-sm"
              >{{ row.links + row.industries + row.bonus }}
              {{ t("fogport.vp") }}</span
            >
          </div>
          <dl class="mt-1 flex flex-wrap gap-x-3 text-xs text-base-content/60">
            <div class="flex gap-1">
              <dt>{{ t("fogport.linkValue") }}</dt>
              <dd>{{ row.links }}</dd>
            </div>
            <div class="flex gap-1">
              <dt>{{ t("fogport.industry") }}</dt>
              <dd>{{ row.industries }}</dd>
            </div>
            <div class="flex gap-1">
              <dt>{{ t("fogport.bonus") }}</dt>
              <dd>{{ row.bonus }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
    <section>
      <h3
        :class="inContext ? 'sr-only' : 'mb-3 font-serif text-lg font-semibold'"
      >
        <i class="ri-history-line font-normal" aria-hidden="true"></i>
        {{ t("fogport.history") }}
      </h3>
      <ol class="space-y-4">
        <RecordEntry
          v-for="entry in entries"
          :key="entry.id"
          :title="t(`fogport.events.${entry.type}`)"
          :icon="eventIcon(entry.type)"
          :sequence="entry.sequence"
          :at="entry.at"
          :tone="
            ['shortfall', 'liquidate'].includes(entry.type)
              ? 'error'
              : ['sell', 'score', 'finish'].includes(entry.type)
                ? 'success'
                : ''
          "
        >
          <template #heading
            ><span
              v-if="entry.playerId"
              class="min-w-0 truncate text-xs"
              :class="tones[player(entry.playerId)?.seat ?? 0]"
              ><ArtIcon
                :asset="companyArtName(player(entry.playerId)?.seat ?? 0)"
                :icon="PLAYER_ICONS[player(entry.playerId)?.seat ?? 0]"
              />
              {{ player(entry.playerId)?.nickname }}</span
            ></template
          >
          <p class="text-base-content/50">
            {{ t(`fogport.${entry.era}`) }} ·
            {{ t("fogport.round", { n: entry.eraRound }) }}
          </p>
          <ul
            v-if="
              entry.targets?.length ||
              entry.routes?.length ||
              entry.removed?.length
            "
            class="space-y-1"
          >
            <li
              v-for="(tile, i) in entry.targets ?? []"
              :key="'tile-' + i"
              class="flex items-start gap-2"
            >
              <i
                :class="INDUSTRY_ICONS[TILE_BY_ID[tile.tileId]?.type]"
                class="mt-0.5 shrink-0 text-base"
                aria-hidden="true"
              ></i
              ><span>{{ tileLabel(tile) }}</span>
            </li>
            <li
              v-for="id in entry.routes ?? []"
              :key="id"
              class="flex items-start gap-2"
            >
              <i
                :class="
                  game.boardVersion === BOARD_VERSION && LINK_BY_ID[id]
                    ? TRANSPORT_ICONS[linkKind(LINK_BY_ID[id], entry.era)]
                    : 'ri-route-line'
                "
                class="mt-0.5 shrink-0 text-base"
                aria-hidden="true"
              ></i
              ><span>{{
                game.boardVersion === BOARD_VERSION && LINK_BY_ID[id]
                  ? routeName(LINK_BY_ID[id], entry.era, t)
                  : t("fogport.ui.oldRoute")
              }}</span>
            </li>
            <li
              v-for="(id, i) in entry.removed ?? []"
              :key="'removed-' + i"
              class="flex items-start gap-2"
            >
              <i
                class="ri-tools-line mt-0.5 shrink-0 text-base"
                aria-hidden="true"
              ></i
              >{{ tileName(id, t) }}
            </li>
          </ul>
          <dl
            v-if="entry.delta"
            class="flex flex-wrap gap-x-4 gap-y-1 border-t border-base-300/60 pt-1.5"
          >
            <div
              v-for="stat in deltaStats(entry.delta)"
              :key="stat.label"
              class="flex items-center gap-1"
            >
              <dt class="text-base-content/60">{{ t(stat.label) }}</dt>
              <dd
                class="font-semibold tabular-nums"
                :class="
                  stat.value > 0
                    ? 'text-success'
                    : stat.value < 0
                      ? 'text-error'
                      : ''
                "
              >
                {{ signed(stat.value) }}
              </dd>
            </div>
          </dl>
          <ol v-if="entry.spending" class="space-y-1">
            <li
              v-for="(row, i) in spendingRows(entry)"
              :key="row.playerId"
              class="flex items-center gap-2"
            >
              <span class="badge badge-ghost badge-xs">{{ i + 1 }}</span
              ><span class="min-w-0 flex-1 truncate">{{
                player(row.playerId)?.nickname
              }}</span
              ><span class="tabular-nums"
                >{{ t("fogport.visual.spent") }} {{ row.spent }}</span
              >
            </li>
          </ol>
          <p
            v-if="entry.amount !== undefined"
            class="font-semibold tabular-nums"
            :class="entry.amount < 0 ? 'text-error' : 'text-success'"
          >
            <i class="ri-coins-line" aria-hidden="true"></i>
            {{ t("fogport.cash") }} {{ signed(entry.amount) }}
          </p>
          <p
            v-if="entry.loss !== undefined"
            class="font-semibold tabular-nums text-error"
          >
            <i class="ri-star-line" aria-hidden="true"></i>
            {{ t("fogport.vp") }} −{{ entry.loss }}
          </p>
          <details
            v-if="entry.cards?.length || entry.resourceUsage?.length"
            class="pt-1 text-base-content/60"
          >
            <summary class="cursor-pointer">
              {{ t("fogport.visual.recordDetails") }}
            </summary>
            <p v-if="entry.cards?.length" class="mt-1 wrap-break-word">
              <i class="ri-stack-line" aria-hidden="true"></i>
              {{ entry.cards.map((card) => cardName(card, t)).join(" / ") }}
            </p>
            <ol v-if="entry.resourceUsage?.length" class="mt-1 space-y-1">
              <li
                v-for="(resource, i) in entry.resourceUsage"
                :key="i"
                class="flex items-start gap-2"
              >
                <span class="shrink-0 tabular-nums">{{ i + 1 }}.</span
                ><span class="wrap-break-word">{{
                  resourceLabel(resource)
                }}</span>
              </li>
            </ol>
          </details>
        </RecordEntry>
      </ol>
    </section>
  </div>
</template>
<script setup>
import { computed } from "vue";
import ArtIcon from "./ArtIcon.vue";
import { companyArtName } from "@/games/fogport/art-assets";
import RecordEntry from "../../display/RecordEntry.vue";
import {
  LINK_BY_ID,
  TILE_BY_ID,
  BOARD_VERSION,
  linkKind,
} from "../../../../../shared/games/fogport/data.js";
import {
  ACTION_ICONS,
  INDUSTRY_ICONS,
  PLAYER_ICONS,
  cardName,
  placeName,
  tileName,
  routeName,
  TRANSPORT_ICONS,
} from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  game: { type: Object, required: true },
  inContext: Boolean,
});
const { t } = useLocale();
const player = (id) => props.game.players.find((p) => p.id === id);
const tones = ["text-primary", "text-secondary", "text-accent", "text-info"];
const entries = computed(() =>
  props.game.history
    .map((entry, i) => ({ ...entry, sequence: i + 1 }))
    .reverse(),
);
const eventIcon = (type) =>
  ACTION_ICONS[type] ??
  {
    start: "ri-play-circle-line",
    income: "ri-coins-line",
    order: "ri-exchange-line",
    score: "ri-award-line",
    era: "ri-train-line",
    finish: "ri-flag-line",
    liquidate: "ri-auction-line",
    shortfall: "ri-error-warning-line",
  }[type];
const signed = (n) => (n >= 0 ? "+" + n : n);
const spendingRows = (entry) =>
  entry.order
    ? entry.order
        .map((id) => entry.spending.find((row) => row.playerId === id))
        .filter(Boolean)
    : entry.spending;
const deltaStats = (d) => [
  { label: "fogport.cash", value: d.money },
  { label: "fogport.incomeSpaces", value: d.income },
  { label: "fogport.vp", value: d.vp },
];
const tileLabel = (tile) =>
  placeName(tile.location, t) + " · " + tileName(tile.tileId, t);
const resourceLabel = (r) =>
  t(`fogport.resources.${r.type}`) +
  " · " +
  (r.market
    ? t("fogport.market")
    : (r.owner ? player(r.owner)?.nickname + " · " : "") +
      placeName(r.location, t) +
      (r.merchant ? " · " + t("fogport.merchant") : ""));
</script>
