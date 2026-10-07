<template>
  <div
    v-if="card"
    class="relative w-full min-w-0"
    :class="compact ? 'aspect-[4/5]' : 'aspect-[2/3]'"
  >
    <div class="hover-3d h-full w-full rounded-box">
      <article
        class="card card-border relative h-full w-full overflow-hidden border-base-300 bg-base-200"
      >
        <img
          v-bind="getImageAttrs(card.image, '192px')"
          alt=""
          class="absolute inset-0 h-full w-full object-cover object-[center_20%]"
        />
        <div
          class="absolute inset-x-0 bottom-0 flex max-h-full flex-col items-center bg-gradient-to-t from-black/95 via-black/85 to-transparent text-center text-white"
          :class="
            compact
              ? 'h-[62%] justify-end gap-1 px-2 pb-3 pt-6 sm:px-3'
              : 'gap-2 px-4 pb-5 pt-14'
          "
        >
          <span
            class="text-white/70"
            :class="compact ? 'text-xs' : 'text-sm'"
            >{{ t("avalon.lady.skills") }}</span
          >
          <h3
            class="font-serif font-bold leading-tight"
            :class="compact ? 'text-base' : 'text-3xl'"
          >
            {{ t(card.title) }}
          </h3>
          <span
            v-if="compact"
            class="mt-1 inline-flex items-center gap-1 text-[10px] text-white/75"
          >
            <i class="ri-information-line" aria-hidden="true"></i>
            {{ t("avalon.catalog.details") }}
          </span>
          <p
            v-else
            class="min-h-0 overflow-y-auto overscroll-contain text-pretty text-sm leading-6 text-white/85 scrollbar-thin"
          >
            {{ t(card.hint) }}
          </p>
        </div>
      </article>
      <div v-for="zone in 8" :key="zone" aria-hidden="true"></div>
    </div>
  </div>
</template>
<script setup>
import { getImageAttrs } from "@/utils/images/responsive-images";
import { computed } from "vue";
import { useLocale } from "@/i18n";
import { SKILL_CARDS } from "@/games/avalon/presentation";
const props = defineProps({
  skill: { type: String, required: true },
  compact: Boolean,
});
const { t } = useLocale();
const card = computed(() => SKILL_CARDS[props.skill]);
</script>
