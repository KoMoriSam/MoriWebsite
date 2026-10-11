<template>
  <section
    class="flex max-h-64 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 p-3 shadow-xl"
    :aria-label="title"
  >
    <div class="mb-2 flex shrink-0 items-center justify-between gap-2">
      <h2 class="truncate text-sm font-bold">{{ title }}</h2>
      <button
        class="btn btn-square btn-xs"
        :aria-label="t('fogport.cancel')"
        @click="emit('close')"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
    </div>
    <ScrollableContainer>
      <div class="flex min-h-0 flex-wrap gap-2 overflow-y-auto overscroll-contain">
        <button
          v-for="(option, i) in options"
          :key="i"
          class="btn btn-sm h-auto min-h-9 justify-start whitespace-normal text-left"
          @click="emit('choose', option)"
        >
          <i :class="ACTION_ICONS[option.kind]" aria-hidden="true"></i
          >{{ option.label ?? t("fogport.actions." + option.kind) }}
        </button>
      </div>
    </ScrollableContainer>
  </section>
</template>
<script setup>
import ScrollableContainer from "@/components/layout/ScrollableContainer.vue";
import { ACTION_ICONS } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
defineProps({
  title: { type: String, required: true },
  options: { type: Array, required: true },
});
const emit = defineEmits(["choose", "close"]);
const { t } = useLocale();
</script>
