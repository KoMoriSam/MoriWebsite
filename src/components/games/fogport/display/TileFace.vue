<template>
  <CardSurface
    v-if="tile"
    class="group/tile"
    :class="embedded ? '' : 'rounded-box border border-base-300'"
    :artwork="[
      {
        asset: `industry-${tile.type}`,
        label: t(`fogport.industries.${tile.type}`),
        icon: INDUSTRY_ICONS[tile.type],
      },
    ]"
    :natural="detail"
    :title="statsLabel"
  >
    <template #overlay>
    <span
      v-if="!building"
      class="badge badge-sm absolute left-2 top-2 z-20 border-warning/30 bg-neutral/90 text-neutral-content"
      :title="t('fogport.visual.copies', { n: quantity })"
      >×{{ quantity }}</span
    >
    <span
      class="badge badge-sm absolute right-2 top-2 z-20 gap-1 border-warning/30 bg-neutral/90 text-neutral-content"
      :title="t('fogport.industry')"
      ><i :class="INDUSTRY_ICONS[tile.type]" aria-hidden="true"></i
      >{{ roman[tile.level - 1] }}</span
    >
    <div
      v-if="!detail"
      class="pointer-events-none invisible absolute inset-x-2 top-9 z-20 space-y-1 bg-neutral/95 p-1 text-[11px] text-neutral-content opacity-0 transition-opacity group-hover/tile:visible group-hover/tile:opacity-100 group-focus-visible/industry:visible group-focus-visible/industry:opacity-100"
      aria-hidden="true"
    >
      <ValueStats /><ResourceStats />
    </div>
    </template>
    <div class="pointer-events-none">
      <h4
        class="break-words font-serif font-bold leading-snug"
        :class="detail ? 'text-sm' : 'text-xs'"
      >
        {{ t(`fogport.industries.${tile.type}`) }}
      </h4>
      <div
        v-if="building"
        class="mt-1 flex min-w-0 items-center gap-1 text-[11px]"
      >
        <span class="min-w-0 flex-1 truncate">{{
          placeName(building.location, t)
        }}</span
        ><i
          v-if="selected"
          class="ri-checkbox-circle-fill text-primary"
          aria-hidden="true"
        ></i
        ><span
          class="flex items-center gap-0.5"
          :class="building.flipped ? 'text-success' : 'text-neutral-content/75'"
          :title="t(building.flipped ? 'fogport.flipped' : 'fogport.unflipped')"
          ><i
            :class="
              building.flipped
                ? 'ri-check-double-line'
                : building.resources
                  ? 'ri-box-3-line'
                  : 'ri-time-line'
            "
            aria-hidden="true"
          ></i
          ><span v-if="building.resources">{{ building.resources }}</span
          ><span class="sr-only">{{
            t(building.flipped ? "fogport.flipped" : "fogport.unflipped")
          }}</span></span
        >
      </div>
      <div v-else class="mt-1 flex items-center gap-1 text-xs">
        <i class="ri-coins-line text-warning" aria-hidden="true"></i
        ><b class="tabular-nums">{{ tile.cost }}</b
        ><span class="sr-only">{{ t("fogport.cash") }}</span>
      </div>
      <div v-if="detail" class="mt-2 space-y-1.5 text-[11px] text-neutral-content/85">
        <ResourceStats /><ValueStats />
        <p class="leading-snug">
          {{ eraLabel
          }}<span v-if="!tile.develop"> · {{ t("fogport.noDevelop") }}</span>
        </p>
        <p v-if="outputLabel" class="leading-snug">{{ outputLabel }}</p>
      </div>
      <span v-else class="sr-only">{{ statsLabel }}</span>
    </div>
  </CardSurface>
</template>
<script setup>
import { computed, defineComponent, h } from "vue";
import ArtIcon from "./ArtIcon.vue";
import CardSurface from "./CardSurface.vue";
import { INDUSTRY_ICONS, placeName } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  tile: { type: Object, default: null },
  quantity: { type: Number, default: 1 },
  detail: Boolean,
  embedded: Boolean,
  building: { type: Object, default: null },
  selected: Boolean,
});
const { t } = useLocale(),
  roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const eraLabel = computed(() =>
  !props.tile
    ? ""
    : t(
        props.tile.canal && props.tile.rail
          ? "fogport.bothEras"
          : props.tile.canal
            ? "fogport.canal"
            : "fogport.rail",
      ),
);
const outputLabel = computed(() =>
  !props.tile
    ? ""
    : props.tile.type === "beer"
      ? t("fogport.output") +
        ": " +
        t("fogport.canal") +
        " " +
        (props.tile.canal ? 1 : "—") +
        " / " +
        t("fogport.rail") +
        " " +
        (props.tile.rail ? 2 : "—")
      : props.tile.output
        ? t("fogport.output") + ": " + props.tile.output
        : "",
);
const statsLabel = computed(() =>
  !props.tile
    ? ""
    : [
        t("fogport.tileStats", {
          cash: props.tile.cost,
          coal: props.tile.coal,
          iron: props.tile.iron,
          beer: props.tile.beer,
          vp: props.tile.vp,
          income: props.tile.income,
          link: props.tile.link,
        }),
        eraLabel.value,
        !props.tile.develop ? t("fogport.noDevelop") : "",
        outputLabel.value,
      ]
        .filter(Boolean)
        .join(" · "),
);
const ValueStats = defineComponent({
  setup: () => () =>
    h(
      "div",
      { class: "flex flex-wrap items-center gap-x-3 gap-y-1" },
      [
        ["vp", "ri-star-line", "fogport.vp"],
        ["income", "ri-arrow-up-circle-line", "fogport.incomeSpaces"],
        ["link", "ri-route-line", "fogport.linkValue"],
      ].map(([key, icon, label]) =>
        h("span", { class: "flex items-center gap-1", title: t(label) }, [
          h("i", { class: icon, "aria-hidden": true }),
          String(props.tile[key]),
          props.detail ? h("small", { class: "text-[9px]" }, t(label)) : null,
        ]),
      ),
    ),
});
const ResourceStats = defineComponent({
  setup: () => () =>
    h(
      "div",
      { class: "flex flex-wrap items-center gap-x-3 gap-y-1" },
      [
        ["coal", "ri-hexagon-line"],
        ["iron", "ri-hammer-line"],
        ["beer", "ri-goblet-line"],
      ]
        .filter(([key]) => props.tile[key])
        .map(([key, icon]) =>
          h(
            "span",
            {
              class: "flex items-center gap-1",
              title: t("fogport.resources." + key),
            },
            [
              h(ArtIcon, { asset: "resource-" + key, icon }),
              String(props.tile[key]),
            ],
          ),
        ),
    ),
});
</script>
