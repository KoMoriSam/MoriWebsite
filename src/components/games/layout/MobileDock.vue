<template>
  <nav class="dock z-30 lg:hidden" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="{ 'dock-active': panel === item.id }"
      :aria-current="panel === item.id ? 'page' : undefined"
      :aria-controls="`${panelId}-${item.id}`"
      @click="emit('select-panel', item.id)"
    >
      <span class="indicator"
        ><span
          v-if="item.badge"
          class="indicator-item badge badge-error badge-sm min-w-5 px-1 font-semibold tabular-nums"
          aria-hidden="true"
          >{{ item.badge }}</span
        ><i :class="item.icon" class="text-xl" aria-hidden="true"></i
      ></span>
      <span class="dock-label">{{ t(item.label) }}</span
      ><span v-if="item.badge" class="sr-only">{{ item.badgeLabel }}</span>
    </button>
  </nav>
</template>
<script setup>
import { useLocale } from "@/i18n";
defineProps({
  items: { type: Array, required: true },
  panel: { type: String, required: true },
  panelId: { type: String, required: true },
  label: { type: String, required: true },
});
const emit = defineEmits(["select-panel"]);
const { t } = useLocale();
</script>
