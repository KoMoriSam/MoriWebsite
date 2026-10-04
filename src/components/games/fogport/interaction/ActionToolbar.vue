<template>
  <div class="relative min-w-0">
    <div
      class="overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="flex w-max flex-nowrap" :class="compact ? 'gap-1' : 'gap-2'">
        <button
          v-for="kind in actions"
          :key="kind"
          type="button"
          class="btn shrink-0"
          :class="[
            active === kind ? 'btn-primary' : '',
            compact ? 'btn-xs gap-1' : 'btn-sm gap-2',
            iconsOnly ? 'btn-square' : '',
            !canAct ? 'opacity-50' : '',
          ]"
          :aria-disabled="!canAct"
          :aria-pressed="active === kind"
          :title="t(`fogport.actions.${kind}`)"
          :aria-label="t(`fogport.actions.${kind}`)"
          @click="emit('action', kind)"
        >
          <i :class="ACTION_ICONS[kind]" aria-hidden="true"></i
          ><span v-if="!iconsOnly">{{ t(`fogport.actions.${kind}`) }}</span>
        </button>
      </div>
    </div>
    <!-- Full-label measurement is clipped out of flow, independent of the current icon layout. -->
    <div
      class="pointer-events-none invisible absolute inset-0 overflow-hidden"
      aria-hidden="true"
      inert
    >
      <div ref="strip" class="flex w-max flex-nowrap gap-2">
        <span
          v-for="kind in actions"
          :key="kind"
          class="btn btn-sm shrink-0 gap-2"
          ><i :class="ACTION_ICONS[kind]"></i
          ><span>{{ t(`fogport.actions.${kind}`) }}</span></span
        >
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from "vue";
import { useElementSize } from "@vueuse/core";
import { ACTION_ICONS } from "@/games/fogport/presentation";
import { useLocale } from "@/i18n";
defineProps({
  actions: { type: Array, required: true },
  canAct: Boolean,
  compact: Boolean,
  iconsOnly: Boolean,
  active: { type: String, default: "" },
});
const emit = defineEmits(["action", "measure"]);
const { t } = useLocale();
const strip = ref(null),
  { width } = useElementSize(strip);
watch(
  width,
  (value) => {
    if (value > 0) emit("measure", value);
  },
  { immediate: true },
);
</script>
