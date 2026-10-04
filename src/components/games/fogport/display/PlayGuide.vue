<template>
  <section class="card min-w-0 max-w-full">
    <div class="card-body min-w-0 gap-4 p-0">
      <h2 v-if="!compact" class="card-title font-serif">
        {{ t("fogport.howTo") }}
      </h2>
      <p class="text-sm leading-6 text-base-content/75">
        {{ t("fogport.info.goal") }}
      </p>
      <FlowCarousel
        :steps="steps"
        :previous-label="t('fogport.visual.previous')"
        :next-label="t('fogport.visual.next')"
      >
        <template #default="{ step, complete }"
          ><FlowFigure :step="step" @cycle-complete="complete"
        /></template>
      </FlowCarousel>
      <div class="grid gap-2 sm:grid-cols-2">
        <p class="rounded-box bg-base-200 p-3 text-xs leading-6">
          <i class="ri-ship-line mr-1 text-primary" aria-hidden="true"></i
          >{{ t("fogport.visual.canalTip") }}
        </p>
        <p class="rounded-box bg-base-200 p-3 text-xs leading-6">
          <i class="ri-train-line mr-1 text-secondary" aria-hidden="true"></i
          >{{ t("fogport.visual.railTip") }}
        </p>
      </div>
    </div>
  </section>
</template>
<script setup>
import { computed } from "vue";
import FlowCarousel from "../../display/FlowCarousel.vue";
import FlowFigure from "./FlowFigure.vue";
import { useLocale } from "@/i18n";
defineProps({ compact: Boolean });
const { t } = useLocale();
const steps = computed(() =>
  ["turn", "build", "network", "sell", "maintenance", "scoring"].map((id) => ({
    id,
    title: t(`fogport.ruleTitles.${id}`),
    detail: t(`fogport.visual.flowText.${id}`),
  })),
);
</script>
