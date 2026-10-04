<template>
  <section
    class="flex min-h-0 min-w-0 flex-col rounded-box border border-base-300 bg-base-100 p-2"
    :class="compact ? 'shadow-lg bg-base-100/95 backdrop-blur-sm' : ''"
  >
    <div class="mb-2 flex shrink-0 items-center justify-between gap-1">
      <div role="tablist" class="tabs tabs-box tabs-xs min-w-0">
        <button
          v-for="tab in ['cards', 'industry']"
          :id="`${trayId}-${tab}`"
          :key="tab"
          class="tab gap-1 text-xs"
          role="tab"
          :class="tray === tab ? 'tab-active' : ''"
          :aria-selected="tray === tab"
          :aria-controls="`${trayId}-content`"
          :disabled="dragging"
          @click="emit('update:tray', tab)"
        >
          <i
            :class="tab === 'cards' ? 'ri-stack-line' : 'ri-building-2-line'"
            aria-hidden="true"
          ></i
          >{{
            t(
              tab === "cards" ? "fogport.visual.handCards" : "fogport.industry",
            )
          }}<span v-if="tab === 'cards'">· {{ self.handCount }}</span>
        </button>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <span
          class="tooltip tooltip-bottom flex items-center gap-1 px-1 text-xs tabular-nums text-base-content/60"
          tabindex="0"
          :data-tip="t('fogport.info.deckHint', { n: game.deckCount })"
          :aria-label="t('fogport.deckCount', { n: game.deckCount })"
          ><i class="ri-stack-line" aria-hidden="true"></i
          ><b>{{ game.deckCount }}</b
          ><span class="sr-only">{{ t("fogport.info.deckLabel") }}</span></span
        >
        <div v-if="!compact" class="flex shrink-0 gap-1">
          <button
            class="btn btn-square btn-ghost btn-xs"
            :aria-label="t('fogport.visual.scrollPrevious')"
            @click="scroll(-1)"
          >
            <i class="ri-arrow-up-s-line" aria-hidden="true"></i></button
          ><button
            class="btn btn-square btn-ghost btn-xs"
            :aria-label="t('fogport.visual.scrollNext')"
            @click="scroll(1)"
          >
            <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    <div
      :id="`${trayId}-content`"
      ref="scroller"
      role="tabpanel"
      :aria-labelledby="`${trayId}-${tray}`"
      :data-scroll-axis="compact ? 'x' : 'y'"
      class="min-w-0 gap-2 pb-1"
      :class="
        compact
          ? [
              'flex touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain',
              tray === 'cards' ? 'h-24' : 'h-28',
            ]
          : [
              'grid min-h-0 flex-1 auto-rows-min touch-pan-y overflow-y-auto overscroll-contain scrollbar-thin',
              !detail && tray === 'cards'
                ? 'grid-cols-[repeat(auto-fill,minmax(min(100%,6.5rem),1fr))]'
                : 'grid-cols-2',
            ]
      "
      :title="t(compact ? 'fogport.visual.swipeHint' : 'fogport.dragHint')"
    >
      <template v-if="tray === 'cards'">
        <button
          v-for="card in self.hand"
          :key="card.id"
          type="button"
          class="relative flex min-w-0 shrink-0 select-none flex-col overflow-hidden rounded-field border-2 bg-base-100 text-left"
          :class="[
            compact
              ? 'h-full w-20 touch-pan-x'
              : detail
                ? 'h-56 w-full touch-pan-y'
                : 'aspect-2/3 w-full touch-pan-y',
            cardState(card),
            (selected?.kind === 'card' && selected.id === card.id) ||
            chosenCommand?.card === card.id
              ? 'border-primary ring-2 ring-primary'
              : activeMode && legalCards.includes(card.id)
                ? 'border-success ring-2 ring-success/60'
                : 'border-base-300',
          ]"
          @pointerdown="
            emit(
              'drag',
              $event,
              { kind: 'card', id: card.id, dense: !compact && !detail },
              cardName(card, t),
            )
          "
          @click="emit('pick', { kind: 'card', id: card.id })"
        >
          <div class="absolute inset-0">
            <HandFace
              :card="card"
              :compact="compact"
              :dense="!compact && !detail"
              :title="cardName(card, t)"
            />
          </div>
        </button>
      </template>
      <template v-else-if="activeMode === 'sell'">
        <button
          v-for="tile in saleTiles"
          :key="tile.id"
          type="button"
          class="group/industry flex min-w-0 shrink-0 select-none flex-col overflow-hidden rounded-box border border-secondary/30 bg-base-100 text-left"
          :class="[
            compact ? 'h-full w-36 touch-pan-x' : 'h-48 w-full touch-pan-y',
            saleState(tile),
          ]"
          @pointerdown="
            emit(
              'drag',
              $event,
              { kind: 'building', id: tile.id },
              placeName(tile.location, t) + ' · ' + tileName(tile.tileId, t),
            )
          "
          @click="emit('pick', { kind: 'building', id: tile.id })"
        >
          <TileFace
            embedded
            :tile="TILE_BY_ID[tile.tileId]"
            :building="tile"
            :selected="
              chosenCommand?.sales?.some((s) => s.building === tile.id)
            "
          />
        </button>
        <p v-if="!saleTiles.length" class="text-xs text-base-content/60">
          {{ t("fogport.errors.SELL") }}
        </p>
      </template>
      <template v-else>
        <button
          v-for="type in INDUSTRIES"
          :key="type"
          type="button"
          class="group/industry min-w-0 shrink-0 select-none overflow-hidden rounded-box border border-secondary/30 bg-base-100 text-left"
          :class="[
            compact
              ? 'h-full w-36 touch-pan-x'
              : detail
                ? 'w-full touch-pan-y'
                : 'h-44 w-full touch-pan-y',
            industryState(type),
            selected?.industry === type ? 'outline-2 outline-primary' : '',
          ]"
          @pointerdown="
            emit(
              'drag',
              $event,
              { kind: 'industry', industry: type, detail },
              tileName(self.inventory[type][0], t),
            )
          "
          @click="emit('pick', { kind: 'industry', industry: type })"
        >
          <TileFace
            v-if="self.inventory[type].length"
            embedded
            :tile="TILE_BY_ID[self.inventory[type][0]]"
            :quantity="self.inventory[type].length"
            :detail="detail"
          />
          <div
            v-else
            class="flex h-full min-h-28 flex-col items-center justify-center bg-base-200/50 text-xs text-base-content/50"
          >
            <i
              :class="INDUSTRY_ICONS[type]"
              class="text-2xl"
              aria-hidden="true"
            ></i
            >{{ t(`fogport.industries.${type}`) }} · 0
          </div>
        </button>
      </template>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, useId } from "vue";
import {
  INDUSTRIES,
  TILE_BY_ID,
} from "../../../../../shared/games/fogport/data.js";
import {
  cardName,
  tileName,
  placeName,
  INDUSTRY_ICONS,
} from "@/games/fogport/presentation";
import HandFace from "../display/HandFace.vue";
import TileFace from "../display/TileFace.vue";
import { useLocale } from "@/i18n";
const props = defineProps({
  game: { type: Object, required: true },
  tray: { type: String, default: "cards" },
  selected: { type: Object, default: null },
  compact: Boolean,
  detail: Boolean,
  dragging: Boolean,
  activeMode: { type: String, default: "" },
  legalCards: { type: Array, default: () => [] },
  legalIndustries: { type: Array, default: () => [] },
  legalTargets: { type: Array, default: () => [] },
  selectedTargets: { type: Array, default: () => [] },
  dragPayload: { type: Object, default: null },
  chosenCommand: { type: Object, default: null },
});
const emit = defineEmits(["update:tray", "pick", "drag"]);
const { t } = useLocale(),
  scroller = ref(null),
  trayId = `fogport-tray-${useId()}`;
const self = computed(() =>
  props.game.players.find((p) => p.id === props.game.selfId),
);
const saleTiles = computed(() =>
  props.game.buildings.filter(
    (tile) =>
      tile.owner === props.game.selfId &&
      ["cotton", "goods", "pottery"].includes(TILE_BY_ID[tile.tileId].type),
  ),
);
function saleState(tile) {
  if (
    props.dragPayload?.kind === "building" &&
    props.dragPayload.id === tile.id
  )
    return "opacity-25";
  if (props.selectedTargets.includes("building:" + tile.id))
    return "ring-2 ring-primary";
  return props.legalTargets.includes("building:" + tile.id)
    ? "ring-2 ring-success"
    : "opacity-30 grayscale";
}
function cardState(card) {
  if (props.dragPayload?.kind === "card" && props.dragPayload.id === card.id)
    return "opacity-25";
  return props.activeMode && !props.legalCards.includes(card.id)
    ? "opacity-30 grayscale"
    : "";
}
function industryState(type) {
  if (
    props.dragPayload?.kind === "industry" &&
    props.dragPayload.industry === type
  )
    return "opacity-25";
  if (
    props.chosenCommand?.industry === type ||
    props.chosenCommand?.industries?.includes(type)
  )
    return "ring-2 ring-primary";
  return props.activeMode
    ? props.legalIndustries.includes(type)
      ? "ring-2 ring-success"
      : "opacity-30 grayscale"
    : "";
}
function scroll(direction) {
  const el = scroller.value;
  el?.scrollBy({ top: direction * el.clientHeight * 0.75, behavior: "smooth" });
}
</script>
