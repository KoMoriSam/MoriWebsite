<template>
  <CardSurface
    :artwork="artwork"
    fit="cover"
    class="w-full"
  >
    <p
      class="break-words font-serif font-bold leading-snug"
      :class="compact || dense ? 'text-xs' : 'text-sm'"
    >
      {{ cardName(card, t) }}
    </p>
  </CardSurface>
</template>
<script setup>
import { computed } from "vue";
import CardSurface from "./CardSurface.vue";
import {
  cardArtNames,
  cardName,
  INDUSTRY_ICONS,
} from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
const props = defineProps({
  card: { type: Object, required: true },
  compact: Boolean,
  dense: Boolean,
});
const { t } = useLocale();
const artwork = computed(() =>
  cardArtNames(props.card).map((asset, index) => ({
    asset,
    label: cardName(props.card, t),
    icon: props.card.industries
      ? INDUSTRY_ICONS[props.card.industries[index]]
      : props.card.kind === "location"
        ? "ri-landscape-line"
        : "ri-compass-3-line",
  })),
);
</script>
